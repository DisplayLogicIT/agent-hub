# Agent Hub — Full Platform Design Spec
Date: 2026-05-13

## What We're Building

A two-part platform for Display Logic IT:

1. **Agent Hub Dashboard** — visual home base showing all agents as cards, with clickable detail panels showing live stats, run history, and a time-saved metric
2. **Agent Factory** — a Claude-powered chat interface that takes a plain-English description of an agent, generates a build plan, and executes the full deployment (GitHub → Vercel → hub registration)

Agents run independently of the dashboard at all times. The hub is purely a visual control panel and factory floor.

---

## Current State

The agent-hub project exists at `C:\Users\keith morton\agent-hub` and is deployed to Vercel. It has:

- Next.js 16, Clerk v7, Supabase, Tailwind v4, Lucide icons
- `Navbar` (top bar) — to be replaced by left sidebar
- `AgentCard` — dark-themed card with category colors, status dot, hover effects
- `AgentGrid` — search, category filter, multi-select action bar
- `src/app/page.tsx` — fetches agents from Supabase `agents` table, renders grid
- All env vars configured: Clerk, hub Supabase, shared DisplayLogicIT Supabase
- `agent-template` at `C:\Users\keith morton\agent-template` — the canonical scaffold every new agent is cloned from

What does NOT exist yet:
- Left sidebar (replaces Navbar)
- `/agents/[id]` — agent detail dashboard
- `/agents/new` — Agent Factory
- API routes: `/api/share`, `/api/export`, `/api/factory/build`
- Supabase `agents` table schema (needs verification/creation)
- Real-time status polling

---

## Architecture

### Navigation — Left Sidebar

Replace the existing `Navbar` with a persistent left sidebar (`Sidebar` component). The main content area sits to the right.

**Sidebar items:**
- AgentHub logo + "Display Logic IT" label
- My Agents (home, shows count badge)
- Analytics (future)
- Files (future)
- Settings (future)
- --- divider ---
- **Agent Factory** (highlighted with indigo glow)
- Recent agents list (last 5, with icon + name)
- Bottom: Clerk `UserButton` + user name

### Home Page — Agent Grid

No changes to the existing `AgentCard` / `AgentGrid` logic. Layout wraps with the new sidebar.

The `AgentCard` already has:
- Pulsing green/red status dot
- Category color badge
- Tags, description, file count, created-at timestamp

Clicking a card navigates to `/agents/[id]`.

### Agent Detail Dashboard — `/agents/[id]`

Fetches the agent record from Supabase. All sections:

**Header bar:**
- Agent icon (gradient bg), name, category badge, description
- Pulsing green dot (active) or dim red dot (inactive) — top right corner
- Powered by `agent.status` field from Supabase, polled every 30s

**Time Saved Bar (hero metric):**
- Formula: `total_runs × avg_manual_minutes_per_task / 60 = hours_saved`
- `avg_manual_minutes_per_task` stored per-agent in Supabase (set at factory time, editable in Settings)
- Displays: total hours saved, human-friendly label ("≈ 2 full work weeks"), progress bar toward a monthly target
- Monthly target = `team_size × working_hours_per_month` (configurable)

**4 stat tiles:**
| Stat | Source |
|---|---|
| Total runs | `agent_runs` table COUNT |
| Success rate | `agent_runs` WHERE status='success' / total |
| Avg latency | AVG of `agent_runs.duration_ms` |
| Days running | `agents.created_at` → now() delta |

**Current batch progress bar:**
- Only visible when `agent.status = 'active'`
- Reads from `agent_runs` WHERE status='processing' — shows items_done / items_total
- Auto-refreshes every 5s via polling

**Run history + live log (side by side):**
- History: last 10 runs from `agent_runs`, green/red dot, timestamp
- Live log: last 20 log entries from `agent_logs`, timestamp + message, color-coded by level (success=green, error=red, info=gray)
- Live log polls every 3s when agent is active

**Footer links:**
- GitHub repo URL (from `agents.github_repo_url`)
- Vercel URL (from `agents.vercel_url`)
- "Open Agent App →" button → opens `agents.vercel_url` in new tab

### Agent Factory — `/agents/new`

**Layout:** Full-width chat panel (sidebar stays visible). Factory-specific header with template version indicator.

**Chat interface:**
- Claude (claude-sonnet-4-6) is the factory bot
- System prompt includes: full agent-template structure, DisplayLogicIT conventions, all available env vars (Clerk keys, Supabase URLs, Anthropic key — already set), and instructions to extract a structured build plan from the conversation
- User describes agent in free text
- Claude asks clarifying questions if needed (what data to store, what external APIs, etc.)
- Claude outputs a structured build plan:
  ```
  NAME: slug-name
  DISPLAY_NAME: Human Name
  ICON: emoji
  CATEGORY: sourcing | validation | meeting | logistics
  DESCRIPTION: one sentence
  SYSTEM_PROMPT: full prompt text
  TOOLS: [list of tool names + descriptions]
  SCHEMA: SQL for agent-specific tables
  EXTRA_ENV_VARS: [list of vars the user must supply post-deploy]
  AVG_MANUAL_MINUTES: estimated minutes a human would spend per task
  ```
- User sees plan rendered as a structured card (not raw text), with "Build it" and "Edit plan" buttons

**Build execution (on "Build it"):**

Step 1 — GitHub: clone `agent-template` repo, rename, push to `DisplayLogicIT/[slug]` (private)
Step 2 — Customize files: write `SYSTEM_PROMPT`, `TOOLS`, `executeTool` into `lib/agent/agent.ts`; write dashboard UI into `app/dashboard/page.tsx`; write schema into `supabase/migrations/001_initial.sql`; update `app/layout.tsx` title
Step 3 — Vercel: create project linked to the GitHub repo, inject all standard env vars automatically, trigger deploy
Step 4 — Supabase: run the agent's migration SQL on the shared DisplayLogicIT DB
Step 5 — Hub: INSERT into `agents` table with all metadata (name, slug, icon, category, github_repo_url, vercel_url, avg_manual_minutes, status='pending')
Step 6 — Open config modal

The build runs server-side via `/api/factory/build` (POST). The chat UI shows a progress stream as each step completes.

**Post-deploy config modal:**
- Opens automatically after successful build
- Shows only the `EXTRA_ENV_VARS` Claude identified (agent-specific secrets)
- Each field labeled required/optional
- On "Save & Activate": POSTs vars to `/api/factory/configure` → sets them in Vercel via Vercel API → triggers redeploy → updates `agents.status` to 'active'
- "Skip for now" closes modal, agent stays status='pending'

---

## Data Model

### Supabase — Hub DB (`agents` table — already exists, verify schema)

```sql
CREATE TABLE agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              TEXT NOT NULL,           -- Clerk user ID
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  icon                  TEXT,                    -- emoji
  category              TEXT,
  tags                  TEXT[],
  github_repo_url       TEXT,
  vercel_url            TEXT,
  vercel_project_id     TEXT,                    -- needed for env var API calls
  status                TEXT DEFAULT 'pending',  -- pending | active | inactive | error
  avg_manual_minutes    NUMERIC DEFAULT 5,       -- for time-saved calculation
  shared_db_schema      TEXT,                    -- schema name in shared DB
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,   -- processing | success | error
  items_done    INT DEFAULT 0,
  items_total   INT DEFAULT 0,
  duration_ms   INT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE agent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID REFERENCES agents(id) ON DELETE CASCADE,
  run_id     UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  level      TEXT NOT NULL,   -- info | success | error | warn
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/factory/build` | POST | Execute full agent build pipeline |
| `/api/factory/configure` | POST | Push extra env vars to Vercel, trigger redeploy |
| `/api/factory/chat` | POST | Streaming chat with factory Claude bot |
| `/api/agents/[id]/status` | GET | Current status + active run progress |
| `/api/agents/[id]/logs` | GET | Last N log entries |
| `/api/share` | GET | Generate share token for selected agents |
| `/api/export` | GET | Export agent configs as ZIP |

---

## Environment Variables Needed (Factory build uses these automatically)

Already set in agent-hub `.env.local` and Vercel:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SHARED_DB_URL`, `SHARED_DB_SERVICE_ROLE_KEY`

Still need to add to agent-hub env:
- `ANTHROPIC_API_KEY` — for factory chat + build
- `GITHUB_TOKEN` — for repo creation via GitHub API
- `VERCEL_TOKEN` — for project creation + env var injection via Vercel API
- `VERCEL_TEAM_ID` — the DisplayLogicIT Vercel team

---

## Implementation Order

1. **Supabase schema** — verify/create `agents`, `agent_runs`, `agent_logs` tables in hub DB
2. **Left sidebar** — replace `Navbar`, update `layout.tsx`
3. **Agent detail page** — `/agents/[id]` with all sections
4. **Factory chat API** — `/api/factory/chat` streaming endpoint
5. **Factory UI** — `/agents/new` chat interface + plan card
6. **Factory build API** — `/api/factory/build` (GitHub + Vercel + Supabase + hub registration)
7. **Config modal** — post-deploy env var configuration
8. **Status polling** — real-time updates on detail page

---

## Key Constraints

- Standard agent keys (Clerk, Supabase, Anthropic) are injected automatically — users only provide agent-specific secrets
- Server-side keys never reach the browser
- Agents write their own run/log data to the shared DisplayLogicIT Supabase DB — hub reads from there
- The `agent-template` at `C:\Users\keith morton\agent-template` is the source of truth for new agent scaffolding
- Always use lazy Supabase client factories (never module-level `createClient`)
- Use `proxy.ts` (not `middleware.ts`) for Clerk auth guard — Next.js 16 convention
