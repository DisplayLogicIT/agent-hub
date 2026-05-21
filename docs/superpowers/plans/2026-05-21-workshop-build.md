# Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/agents/workshop` page that persists Agent Factory draft state (chat, plan, build log) to localStorage + Supabase so a page refresh never wipes progress, and shows all drafts/built history in a two-column layout.

**Architecture:** A new `agent_drafts` Supabase table stores draft state through its lifecycle (`plan-ready → building → built/failed`). The factory page writes to it whenever state changes and restores from it on load. The workshop page is a server component that fetches all drafts and renders active ones on the left, built/failed log on the right.

**Tech Stack:** Next.js 15 App Router, Supabase (admin client for API routes, server client for pages), React useState/useEffect for localStorage, Vitest for unit tests, Lucide icons, Tailwind CSS.

---

## File Map

**New files:**
- `supabase/migrations/003_agent_drafts.sql` — table + indexes
- `src/lib/types.ts` — add `AgentDraft` type (modify)
- `src/lib/workshop.ts` — pure `splitDrafts` utility
- `src/app/api/factory/draft/route.ts` — `POST /api/factory/draft`
- `src/app/api/factory/draft/[id]/route.ts` — `GET` + `PATCH /api/factory/draft/[id]`
- `src/app/api/factory/drafts/route.ts` — `GET /api/factory/drafts`
- `src/app/agents/workshop/page.tsx` — Workshop page (server component)
- `src/components/workshop/ActiveDraftCard.tsx` — building/plan-ready card
- `src/components/workshop/BuiltLogRow.tsx` — built/failed log row
- `src/components/Sidebar.tsx` — add Workshop nav item + localStorage dot (modify)
- `src/components/factory/FactoryChat.tsx` — add `initialMessages` + `onPlanGenerated` props (modify)
- `src/app/agents/new/page.tsx` — draft lifecycle: create, restore, update (modify)

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/003_agent_drafts.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/003_agent_drafts.sql
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

CREATE INDEX IF NOT EXISTS idx_agent_drafts_status     ON agent_drafts(status);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_updated_at ON agent_drafts(updated_at DESC);
```

- [ ] **Step 2: Run in Supabase**

In the Supabase dashboard for project `yytjmkcxgardicwwlwtx`, open the SQL editor and run the file contents. Verify the `agent_drafts` table appears in Table Editor with columns: `id`, `plan`, `messages`, `status`, `build_log`, `error_message`, `agent_id`, `created_at`, `updated_at`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_agent_drafts.sql
git commit -m "feat: add agent_drafts migration"
```

---

## Task 2: Types + Utility

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/workshop.ts`
- Test: `src/lib/workshop.test.ts`

- [ ] **Step 1: Add AgentDraft type to types.ts**

Add this block at the end of `src/lib/types.ts`:

```ts
export interface AgentDraft {
  id: string
  plan: BuildPlan
  messages: ChatMessage[]
  status: 'plan-ready' | 'building' | 'built' | 'failed'
  build_log: string[]
  error_message: string | null
  agent_id: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/workshop.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { splitDrafts } from './workshop'
import type { AgentDraft } from './types'

const base: AgentDraft = {
  id: '1', plan: {} as any, messages: [], status: 'plan-ready',
  build_log: [], error_message: null, agent_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

describe('splitDrafts', () => {
  it('puts plan-ready and building in active', () => {
    const drafts = [
      { ...base, id: '1', status: 'plan-ready' as const },
      { ...base, id: '2', status: 'building' as const },
      { ...base, id: '3', status: 'built' as const },
      { ...base, id: '4', status: 'failed' as const },
    ]
    const { active, log } = splitDrafts(drafts)
    expect(active.map(d => d.id)).toEqual(['1', '2'])
    expect(log.map(d => d.id)).toEqual(['3', '4'])
  })

  it('returns empty arrays when no drafts', () => {
    const { active, log } = splitDrafts([])
    expect(active).toEqual([])
    expect(log).toEqual([])
  })

  it('limits log to 20 entries', () => {
    const drafts = Array.from({ length: 25 }, (_, i) => ({
      ...base, id: String(i), status: 'built' as const,
    }))
    const { log } = splitDrafts(drafts)
    expect(log).toHaveLength(20)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd "C:\Users\keith morton\agent-hub" && npx vitest run src/lib/workshop.test.ts
```

Expected: FAIL — "Cannot find module './workshop'"

- [ ] **Step 4: Write splitDrafts**

Create `src/lib/workshop.ts`:

```ts
import type { AgentDraft } from './types'

export function splitDrafts(drafts: AgentDraft[]): {
  active: AgentDraft[]
  log: AgentDraft[]
} {
  const active = drafts.filter(d => d.status === 'plan-ready' || d.status === 'building')
  const log = drafts.filter(d => d.status === 'built' || d.status === 'failed').slice(0, 20)
  return { active, log }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/workshop.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/workshop.ts src/lib/workshop.test.ts
git commit -m "feat: add AgentDraft type and splitDrafts utility"
```

---

## Task 3: API Routes

**Files:**
- Create: `src/app/api/factory/draft/route.ts`
- Create: `src/app/api/factory/draft/[id]/route.ts`
- Create: `src/app/api/factory/drafts/route.ts`

- [ ] **Step 1: Create POST /api/factory/draft**

Create `src/app/api/factory/draft/route.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/supabase'
import type { BuildPlan, ChatMessage } from '@/lib/types'

export async function POST(req: Request) {
  const { plan, messages } = await req.json() as { plan: BuildPlan; messages: ChatMessage[] }
  if (!plan?.name) return Response.json({ error: 'plan required' }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('agent_drafts')
    .insert({ plan, messages, status: 'plan-ready' })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}
```

- [ ] **Step 2: Create GET + PATCH /api/factory/draft/[id]**

Create `src/app/api/factory/draft/[id]/route.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('agent_drafts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const allowed = ['status', 'build_log', 'error_message', 'agent_id', 'messages', 'plan']
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('agent_drafts')
    .update(patch)
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Create GET /api/factory/drafts**

Create `src/app/api/factory/drafts/route.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('agent_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/factory/draft/route.ts src/app/api/factory/draft/[id]/route.ts src/app/api/factory/drafts/route.ts
git commit -m "feat: add draft CRUD API routes"
```

---

## Task 4: FactoryChat — onPlanGenerated prop

**Files:**
- Modify: `src/components/factory/FactoryChat.tsx`

The chat component needs to fire a callback the first time a plan is parsed (and again if it changes), and accept `initialMessages` to restore saved sessions.

- [ ] **Step 1: Update the Props interface and component signature**

In `src/components/factory/FactoryChat.tsx`, replace the Props interface and the first few lines of the component:

```tsx
interface Props {
  onBuildApproved: (plan: BuildPlan) => void
  onPlanGenerated: (plan: BuildPlan, messages: ChatMessage[]) => void
  building: boolean
  initialMessages?: ChatMessage[]
}

export default function FactoryChat({ onBuildApproved, onPlanGenerated, building, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? [{
    role: 'assistant',
    content: `Hey Keith 👋 I'm your Agent Factory. Tell me what kind of agent you want to build and I'll take care of the rest.\n\nI'll work out the system prompt, tools, database schema, and required credentials — then create the GitHub repo, deploy to Vercel, and register it in your hub.\n\nWhat do you want to build?`,
  }])
```

- [ ] **Step 2: Track last seen plan and fire onPlanGenerated**

Add a `lastPlanRef` to track whether the plan changed, and call `onPlanGenerated` when it does. Add this ref declaration right after the `useState` calls at the top of the component:

```tsx
const lastPlanNameRef = useRef<string | null>(null)
```

Then inside the `while (true)` stream loop in the `send` function, right after `setMessages(p => { ... })`, add:

```tsx
      // fire onPlanGenerated when plan first appears or changes
      if (plan && plan.name !== lastPlanNameRef.current) {
        lastPlanNameRef.current = plan.name
        const currentMessages = [...next, { role: 'assistant' as const, content: full, plan }]
        onPlanGenerated(plan, currentMessages)
      }
```

The full `send` function's inner stream loop (replace just the setMessages block and add after it):

```tsx
      setMessages(p => {
        const updated = [...p]
        updated[updated.length - 1] = { role: 'assistant', content: full, plan }
        return updated
      })

      if (plan && plan.name !== lastPlanNameRef.current) {
        lastPlanNameRef.current = plan.name
        const snapshot = [...next, { role: 'assistant' as const, content: full, plan }]
        onPlanGenerated(plan, snapshot)
      }
```

- [ ] **Step 3: Add useRef import**

Ensure `useRef` is in the React import at the top of the file:

```tsx
import { useState, useRef, useEffect } from 'react'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/factory/FactoryChat.tsx
git commit -m "feat: add onPlanGenerated and initialMessages to FactoryChat"
```

---

## Task 5: Factory Page — Draft Lifecycle

**Files:**
- Modify: `src/app/agents/new/page.tsx`

The page manages draft creation (on plan), restoration (on load), and updates (during build).

- [ ] **Step 1: Replace the full page.tsx**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap } from 'lucide-react'
import FactoryChat from '@/components/factory/FactoryChat'
import ConfigModal from '@/components/factory/ConfigModal'
import type { BuildPlan, ChatMessage } from '@/lib/types'

type BuildState = 'idle' | 'building' | 'done' | 'error'

const LS_KEY = 'agent-hub:draft-id'

export default function AgentFactoryPage() {
  const [buildState, setBuildState] = useState<BuildState>('idle')
  const [builtAgent, setBuiltAgent] = useState<{ id: string; slug: string; plan: BuildPlan } | null>(null)
  const [buildLog, setBuildLog] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | undefined>(undefined)
  const [restored, setRestored] = useState(false)
  const logBufferRef = useRef<string[]>([])
  const flushCountRef = useRef(0)

  // Restore draft on load
  useEffect(() => {
    async function restore() {
      const idFromUrl = new URLSearchParams(window.location.search).get('draft')
      const idFromStorage = localStorage.getItem(LS_KEY)
      const id = idFromUrl ?? idFromStorage
      if (!id) { setRestored(true); return }

      try {
        const res = await fetch(`/api/factory/draft/${id}`)
        if (!res.ok) { localStorage.removeItem(LS_KEY); setRestored(true); return }
        const draft = await res.json()
        setDraftId(draft.id)
        setInitialMessages(draft.messages ?? undefined)
        if (draft.status === 'building') {
          setBuildLog([...draft.build_log, '— Build was interrupted. Check Vercel logs. —'])
          setBuildState('error')
        } else if (draft.status === 'built' || draft.status === 'failed') {
          localStorage.removeItem(LS_KEY)
        } else {
          setBuildLog([])
        }
      } catch {
        localStorage.removeItem(LS_KEY)
      }
      setRestored(true)
    }
    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePlanGenerated(plan: BuildPlan, messages: ChatMessage[]) {
    if (draftId) {
      // Plan changed — update existing draft
      await fetch(`/api/factory/draft/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, messages }),
      })
      return
    }
    // First plan — create draft
    try {
      const res = await fetch('/api/factory/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, messages }),
      })
      if (!res.ok) return
      const { id } = await res.json()
      setDraftId(id)
      localStorage.setItem(LS_KEY, id)
    } catch {}
  }

  async function flushLog(log: string[], force = false) {
    flushCountRef.current++
    if (!force && flushCountRef.current % 3 !== 0) return
    if (!draftId) return
    await fetch(`/api/factory/draft/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_log: log }),
    }).catch(() => {})
  }

  async function handleBuildApproved(plan: BuildPlan) {
    setBuildState('building')
    const startLog = ['Starting build...']
    setBuildLog(startLog)
    logBufferRef.current = startLog
    flushCountRef.current = 0

    if (draftId) {
      await fetch(`/api/factory/draft/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'building' }),
      }).catch(() => {})
    }

    try {
      const res = await fetch('/api/factory/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok || !res.body) {
        setBuildState('error')
        setBuildLog(p => [...p, 'Build failed — check the console.'])
        if (draftId) {
          await fetch(`/api/factory/draft/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', error_message: 'HTTP error from build route' }),
          }).catch(() => {})
        }
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let resolved = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'log') {
              logBufferRef.current = [...logBufferRef.current, event.message]
              setBuildLog([...logBufferRef.current])
              await flushLog(logBufferRef.current)
            }
            if (event.type === 'done') {
              resolved = true
              setBuiltAgent({ id: event.agentId, slug: event.slug, plan })
              setBuildState('done')
              setShowConfig(true)
              localStorage.removeItem(LS_KEY)
              if (draftId) {
                await fetch(`/api/factory/draft/${draftId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'built', agent_id: event.agentId, build_log: logBufferRef.current }),
                }).catch(() => {})
              }
            }
            if (event.type === 'error') {
              resolved = true
              setBuildState('error')
              setBuildLog(p => [...p, `Error: ${event.message}`])
              if (draftId) {
                await fetch(`/api/factory/draft/${draftId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'failed', error_message: event.message, build_log: logBufferRef.current }),
                }).catch(() => {})
              }
            }
          } catch {}
        }
      }

      if (!resolved) {
        setBuildState('error')
        const timeoutMsg = 'Build timed out or was interrupted. Check Vercel logs.'
        setBuildLog(p => [...p, timeoutMsg])
        if (draftId) {
          await fetch(`/api/factory/draft/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', error_message: timeoutMsg, build_log: logBufferRef.current }),
          }).catch(() => {})
        }
      }
    } catch (err) {
      setBuildState('error')
      const msg = err instanceof Error ? err.message : String(err)
      setBuildLog(p => [...p, `Build failed: ${msg}`])
      if (draftId) {
        await fetch(`/api/factory/draft/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed', error_message: msg }),
        }).catch(() => {})
      }
    }
  }

  if (!restored) return null

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-gray-100">Agent Factory</h1>
            <span className="bg-indigo-950 border border-indigo-800 text-indigo-400 text-[10px] font-mono px-2 py-0.5 rounded-full">Claude-powered</span>
          </div>
          <p className="text-xs font-mono text-gray-600 mt-0.5">Describe what you want built — Claude handles the rest</p>
        </div>
        <span className="text-[10px] font-mono text-gray-700 border border-gray-800 bg-gray-900 px-2.5 py-1 rounded-lg">Template: agent-template v1</span>
      </div>

      {buildState === 'building' && (
        <div className="mx-6 mt-4 bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex-shrink-0">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-2">Build Progress</p>
          {buildLog.map((line, i) => <p key={i} className="text-xs font-mono text-gray-400">{line}</p>)}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-indigo-500">running...</span>
          </div>
        </div>
      )}

      {buildState === 'error' && buildLog.length > 0 && (
        <div className="mx-6 mt-4 bg-gray-900/80 border border-red-900/40 rounded-xl p-4 flex-shrink-0">
          <p className="text-[10px] font-mono text-red-600 uppercase tracking-wide mb-2">Build Log</p>
          {buildLog.map((line, i) => <p key={i} className="text-xs font-mono text-gray-500">{line}</p>)}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <FactoryChat
          onBuildApproved={handleBuildApproved}
          onPlanGenerated={handlePlanGenerated}
          building={buildState === 'building'}
          initialMessages={initialMessages}
        />
      </div>

      {showConfig && builtAgent && (
        <ConfigModal
          agentId={builtAgent.id}
          slug={builtAgent.slug}
          extraEnvVars={builtAgent.plan.extraEnvVars}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\keith morton\agent-hub" && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/agents/new/page.tsx
git commit -m "feat: factory page draft lifecycle — create, restore, update"
```

---

## Task 6: Sidebar — Workshop Nav + Amber Dot

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add Wrench import and workshop state**

In `src/components/Sidebar.tsx`:

1. Add `Wrench` to the lucide imports:
```tsx
import { Bot, LayoutGrid, Zap, Settings, FolderOpen, BarChart3, Wrench } from 'lucide-react'
```

2. Add a React import at the top of the file (there isn't one yet — hooks require it even with the JSX transform):
```tsx
import { useState, useEffect } from 'react'
```

3. Inside the `Sidebar` component, add draft state after the `path` declaration:
```tsx
const [hasDraft, setHasDraft] = useState(false)

useEffect(() => {
  setHasDraft(!!localStorage.getItem('agent-hub:draft-id'))
  const onStorage = () => setHasDraft(!!localStorage.getItem('agent-hub:draft-id'))
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}, [])
```

- [ ] **Step 2: Add Workshop nav link**

Add this block in the `<nav>` section, right before the `Agent Factory` link (before `{/* Agent Factory */}`):

```tsx
        {/* Workshop */}
        <Link
          href="/agents/workshop"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono',
            'transition-[background-color,border-color,color] duration-150',
            path === '/agents/workshop'
              ? 'bg-[#111420] border border-[#1e2438] text-gray-100'
              : 'text-gray-600 hover:text-gray-300 hover:bg-[#0e1120] border border-transparent',
          )}
        >
          <Wrench size={14} />
          <span className="flex-1">Workshop</span>
          {hasDraft && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          )}
        </Link>
```

- [ ] **Step 3: Verify the sidebar renders**

Start the dev server and open `http://localhost:3000`. Confirm "Workshop" appears in the sidebar between "My Agents" nav links and "Agent Factory". The amber dot only appears after a draft is created.

```bash
cd "C:\Users\keith morton\agent-hub" && npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Workshop nav item and draft indicator to sidebar"
```

---

## Task 7: Workshop Page

**Files:**
- Create: `src/app/agents/workshop/page.tsx`
- Create: `src/components/workshop/ActiveDraftCard.tsx`
- Create: `src/components/workshop/BuiltLogRow.tsx`

- [ ] **Step 1: Create ActiveDraftCard component**

Create `src/components/workshop/ActiveDraftCard.tsx`:

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AgentDraft } from '@/lib/types'

const TOTAL_STEPS = 7

export default function ActiveDraftCard({ draft }: { draft: AgentDraft }) {
  const isBuilding = draft.status === 'building'
  const stepsComplete = Math.min(draft.build_log.length, TOTAL_STEPS)
  const pct = isBuilding ? Math.round((stepsComplete / TOTAL_STEPS) * 100) : 0
  const lastLine = draft.build_log.at(-1) ?? null
  const href = `/agents/new?draft=${draft.id}`

  const plan = draft.plan as { name?: string; displayName?: string; icon?: string }

  return (
    <div className={cn(
      'rounded-xl border p-4',
      isBuilding
        ? 'bg-amber-950/20 border-amber-700/30'
        : 'bg-gray-900/60 border-gray-800',
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isBuilding ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500',
        )} />
        <span className="text-sm text-gray-200 font-mono font-semibold truncate">
          {plan.icon ?? '🤖'} {plan.displayName ?? plan.name ?? 'Unnamed Agent'}
        </span>
      </div>

      {isBuilding ? (
        <>
          <div className="text-[10px] font-mono text-gray-500 mb-2">
            Building · step {stepsComplete}/{TOTAL_STEPS}
          </div>
          <div className="h-1 bg-gray-800 rounded-full mb-2">
            <div
              className="h-1 bg-amber-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {lastLine && (
            <p className="text-[10px] font-mono text-gray-500 truncate">{lastLine}</p>
          )}
        </>
      ) : (
        <>
          <div className="text-[10px] font-mono text-gray-500 mb-3">Plan ready · waiting to build</div>
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 bg-indigo-950 border border-indigo-800 text-indigo-400 text-[10px] font-mono px-3 py-1.5 rounded-lg hover:bg-indigo-900 transition-colors"
          >
            ▶ Resume in Factory
          </Link>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create BuiltLogRow component**

Create `src/components/workshop/BuiltLogRow.tsx`:

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AgentDraft } from '@/lib/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function BuiltLogRow({ draft }: { draft: AgentDraft }) {
  const built = draft.status === 'built'
  const plan = draft.plan as { name?: string; displayName?: string; icon?: string }
  const href = built && draft.agent_id
    ? `/agents/${draft.agent_id}`
    : `/agents/new?draft=${draft.id}`

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 bg-gray-900/60 hover:bg-gray-900 transition-colors',
        built ? 'border-emerald-500' : 'border-red-600',
      )}
    >
      <span className="text-sm leading-none flex-shrink-0">
        {plan.icon ?? '🤖'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-gray-300 truncate">
          {plan.displayName ?? plan.name ?? 'Unnamed Agent'}
        </p>
        <p className="text-[10px] font-mono text-gray-600 mt-0.5 truncate">
          {built
            ? `Built ${timeAgo(draft.updated_at)} · live`
            : `Failed ${timeAgo(draft.updated_at)}${draft.error_message ? ` · ${draft.error_message.slice(0, 40)}` : ''}`
          }
        </p>
      </div>
      <span className={cn('text-[10px] font-mono flex-shrink-0', built ? 'text-emerald-500' : 'text-red-500')}>
        {built ? '✓' : '✗'}
      </span>
    </Link>
  )
}
```

- [ ] **Step 3: Create the Workshop page**

Create `src/app/agents/workshop/page.tsx`:

```tsx
import Link from 'next/link'
import { Wrench, Zap } from 'lucide-react'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { splitDrafts } from '@/lib/workshop'
import ActiveDraftCard from '@/components/workshop/ActiveDraftCard'
import BuiltLogRow from '@/components/workshop/BuiltLogRow'
import type { AgentDraft } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function WorkshopPage() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('agent_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  const drafts = (data ?? []) as AgentDraft[]
  const { active, log } = splitDrafts(drafts)

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-amber-500" />
              <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Workshop</h1>
            </div>
            <p className="text-xs text-gray-700 font-mono mt-0.5">
              {active.length} active · {log.length} built
            </p>
          </div>
          <Link
            href="/agents/new"
            className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 text-xs font-mono px-3 py-2 rounded-lg hover:bg-indigo-950 transition-colors"
          >
            <Zap size={12} />
            New Agent
          </Link>
        </div>
        <div className="h-px bg-[#181d2a] mt-5" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6 items-start">

        {/* Left: Active Drafts */}
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Active Drafts</p>
          {active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center">
              <p className="text-xs font-mono text-gray-700">No active builds.</p>
              <Link href="/agents/new" className="text-xs font-mono text-indigo-600 hover:text-indigo-400 mt-1 inline-block">
                Start one in the Agent Factory →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map(d => <ActiveDraftCard key={d.id} draft={d} />)}
            </div>
          )}
        </div>

        {/* Right: Built Log */}
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Built Log</p>
          {log.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center">
              <p className="text-xs font-mono text-gray-700">Nothing built yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map(d => <BuiltLogRow key={d.id} draft={d} />)}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Smoke test in the browser**

With the dev server running, navigate to `http://localhost:3000/agents/workshop`. Verify:
- Page loads with two columns
- "No active builds" and "Nothing built yet" empty states show if no drafts exist
- Workshop link in sidebar highlights when on this page
- Amber dot does NOT show (no draft in localStorage yet)

- [ ] **Step 6: Commit**

```bash
git add src/app/agents/workshop/page.tsx src/components/workshop/ActiveDraftCard.tsx src/components/workshop/BuiltLogRow.tsx
git commit -m "feat: add Workshop page with active drafts and built log"
```

---

## Task 8: Run All Tests + Push

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass + 3 new `splitDrafts` tests pass

- [ ] **Step 2: TypeScript final check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Push to Vercel**

```bash
git push origin master
```

Vercel will redeploy automatically. Once deployed, navigate to the live URL's `/agents/workshop` to confirm it loads.

- [ ] **Step 4: Verify end-to-end**

1. Open Agent Factory (`/agents/new`)
2. Chat with Claude and get a build plan
3. Confirm amber dot appears in sidebar (localStorage key set)
4. Refresh the page — confirm chat + plan card restore
5. Navigate to `/agents/workshop` — confirm plan-ready card shows
6. Click "Resume in Factory" — confirm draft reloads
7. Click "Build it" — confirm build starts and Workshop card updates status to building
