# Workshop — Design Spec
**Date:** 2026-05-21
**Status:** Approved

## Problem

When the Agent Factory builds an agent, all state (chat conversation, build plan, build log) lives only in React component state. A page refresh wipes it. There is also no way to see what's been built or resume an interrupted build.

## Solution

A dedicated `/agents/workshop` page backed by a Supabase `agent_drafts` table, with localStorage used for instant same-browser restore. The factory page writes draft state as it changes. The workshop page shows active drafts (left column) and a built/failed log (right column).

---

## Data Model

### New table: `agent_drafts`

```sql
CREATE TABLE IF NOT EXISTS agent_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan            JSONB NOT NULL,
  messages        JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'plan-ready'
                    CHECK (status IN ('plan-ready','building','built','failed')),
  build_log       TEXT[] NOT NULL DEFAULT '{}',
  error_message   TEXT,
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON agent_drafts (status);
CREATE INDEX ON agent_drafts (updated_at DESC);
```

No `owner_id` — this is a single-user hub. RLS not needed; service role used server-side.

### localStorage

Key: `agent-hub:draft-id`
Value: the UUID of the most recent draft.

On factory page load, if this key exists, fetch the draft from Supabase by ID and restore. This gives instant restore on the same browser and graceful fallback on a new device (Supabase fetch still works).

---

## Draft Lifecycle

```
plan generated → plan-ready
plan-ready + "Start build" clicked → building
building + done event → built  (agent_id set)
building + error event → failed (error_message set)
```

Built and failed drafts are permanent (not deleted). They appear in the Workshop's built log. The user can dismiss individual log entries in a future iteration — not in scope here.

---

## API Routes

All under `/api/factory/`:

### `POST /api/factory/draft`
Body: `{ plan: BuildPlan, messages: ChatMessage[] }`
Action: inserts row with `status: plan-ready`, returns `{ id }`.
Called: when `parseBuildPlan` first returns a non-null plan in the factory chat.

### `PATCH /api/factory/draft/[id]`
Body (partial, any combination):
```ts
{
  status?: 'building' | 'built' | 'failed'
  build_log?: string[]      // full array, replaces existing
  error_message?: string
  agent_id?: string
  messages?: ChatMessage[]  // updated if user keeps chatting
}
```
Action: updates the row, sets `updated_at = NOW()`.
Called: on build start, on log accumulation (debounced — flush every 3 new lines), on done/error.

### `GET /api/factory/draft/[id]`
No body.
Action: returns single row by ID.
Called: on factory page load when `agent-hub:draft-id` is present in localStorage.

### `GET /api/factory/drafts`
No params.
Action: returns all rows ordered by `updated_at DESC`, limit 50.
Called: on workshop page load.

---

## Factory Page Changes (`/agents/new`)

### On load
1. Read `agent-hub:draft-id` from localStorage.
2. If present, `GET /api/factory/drafts` is too broad — instead fetch `GET /api/factory/draft/[id]` (single row route, added for this).
3. Restore `messages`, `plan`, `buildLog`, `buildState` from the draft row.
4. If `status === 'building'`, show the log as-is with a note "Build was interrupted — check Vercel logs."

### When plan first appears
1. Call `POST /api/factory/draft` with `{ plan, messages }`.
2. Store returned `id` in localStorage (`agent-hub:draft-id`).
3. Also store the `id` in component state (`draftId`).

If a draft already exists for this session (draftId set), skip creation — the plan updated in an "Edit plan" flow. In that case call `PATCH` to update `plan` and `messages`.

### During build
- On build start: `PATCH { status: 'building' }`.
- Accumulate log lines in a local buffer. Every 3 new lines (or on done/error), flush: `PATCH { build_log: fullLogArray }`.
- On done: `PATCH { status: 'built', agent_id }`. Clear `agent-hub:draft-id` from localStorage (draft is complete).
- On error: `PATCH { status: 'failed', error_message }`. Clear localStorage key.

---

## Workshop Page (`/agents/workshop`)

### Route
`src/app/agents/workshop/page.tsx` — server component, fetches drafts via the admin client.

### Layout
Two-column side-by-side (matching approved mockup B):

**Left column — Active Drafts**
Shows drafts with `status IN ('plan-ready', 'building')`, newest first.

Each card shows:
- Status dot (amber pulse = building, indigo = plan-ready)
- Agent name + icon from plan
- For `building`: progress bar (step X of 7 based on log length), last log line, elapsed time
- For `plan-ready`: "▶ Start build" button → navigates to `/agents/new?draft=<id>`

If no active drafts: empty state — "No active builds. Start one in the Agent Factory."

**Right column — Built Log**
Shows drafts with `status IN ('built', 'failed')`, newest first, max 20 rows.

Each row shows:
- Left border accent: green = built, red = failed
- Agent name + icon
- Status label: "Built 3d ago · live" or "Failed 2w ago · GitHub error"
- Clicking a built row → navigates to `/agents/<agent_id>`
- Clicking a failed row → navigates to `/agents/new?draft=<id>` (so they can retry)

### Data fetch
Server component calls `createSupabaseAdminClient().from('agent_drafts').select('*').order('updated_at', { ascending: false }).limit(50)` — splits results into active/log client-side.

---

## Sidebar Change

Add workshop nav item between "Agents" and "New Agent":
- Icon: 🔨 (or a wrench lucide icon)
- Label: "Workshop"
- Active indicator: amber dot when `agent-hub:draft-id` is present in localStorage — the factory sets this key when a draft is created and clears it on done/error. A small client component in the sidebar reads it on mount. No polling needed.

---

## Out of Scope

- Multiple concurrent active drafts (factory always overwrites the single `agent-hub:draft-id` localStorage key; Supabase keeps history but the factory only tracks one at a time)
- Dismissing individual built-log entries
- RLS / per-user draft isolation (single-user hub)
- Real-time build progress via Supabase Realtime (polling the PATCH endpoint is sufficient)
