# Agent Hub — Dashboard + Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Agent Hub platform: persistent left sidebar, agent detail dashboards with live stats + time-saved metrics, and the Agent Factory (Claude-powered chat that plans, builds, and deploys new agents end-to-end).

**Architecture:** Four phases. Phase 1: Foundation (deps, schema, types, sidebar). Phase 2: Agent Detail Page (stats, progress, live log). Phase 3: Factory Chat (streaming Claude, plan display). Phase 4: Build Pipeline (GitHub + Vercel + Supabase + config modal). Each phase produces working software.

**Tech Stack:** Next.js 16.2.6, TypeScript, Tailwind v4, Clerk v7, Supabase JS v2, @anthropic-ai/sdk, Lucide icons, Vitest

**Working directory:** `C:\Users\keith morton\agent-hub`

---

## File Map

### New files
- `supabase/migrations/002_runs_logs.sql`
- `src/components/Sidebar.tsx`
- `src/components/agent/TimeSavedBar.tsx`
- `src/components/agent/StatTiles.tsx`
- `src/components/agent/BatchProgress.tsx`
- `src/components/agent/RunHistory.tsx`
- `src/components/agent/LiveLog.tsx`
- `src/components/factory/BuildPlanCard.tsx`
- `src/components/factory/FactoryChat.tsx`
- `src/components/factory/ConfigModal.tsx`
- `src/app/agents/[id]/page.tsx`
- `src/app/agents/new/page.tsx`
- `src/app/api/agents/[id]/status/route.ts`
- `src/app/api/agents/[id]/logs/route.ts`
- `src/app/api/factory/chat/route.ts`
- `src/app/api/factory/build/route.ts`
- `src/app/api/factory/configure/route.ts`
- `src/lib/factory/prompts.ts`
- `src/lib/factory/github.ts`
- `src/lib/factory/vercel-api.ts`
- `src/lib/factory/builder.ts`
- `src/lib/utils/timeSaved.ts`
- `src/test/timeSaved.test.ts`
- `src/test/prompts.test.ts`
- `vitest.config.ts`

### Modified files
- `package.json` — add @anthropic-ai/sdk, vitest
- `src/lib/types.ts` — add AgentRun, AgentLog, BuildPlan, ChatMessage; update Agent
- `src/app/layout.tsx` — add Sidebar, remove old body wrapper
- `src/app/page.tsx` — remove Navbar import/usage
- `.env.local` — add ANTHROPIC_API_KEY, GITHUB_TOKEN, VERCEL_TOKEN, VERCEL_TEAM_ID, GITHUB_ORG, VERCEL_TEMPLATE_REPO

---

## Phase 1: Foundation

### Task 1: Dependencies + Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Install dependencies**

```bash
cd "C:\Users\keith morton\agent-hub"
npm install @anthropic-ai/sdk
npm install -D vitest
```

- [ ] **Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

- [ ] **Add test script to package.json**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Verify**

```bash
npx vitest run --reporter=verbose
```
Expected: "No test files found" — 0 errors

- [ ] **Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add @anthropic-ai/sdk and vitest"
```

---

### Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/002_runs_logs.sql`

- [ ] **Write the migration**

```sql
-- New columns on agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS avg_manual_minutes NUMERIC DEFAULT 5;

UPDATE agents SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- Run history
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing', 'success', 'error')),
  items_done    INT NOT NULL DEFAULT 0,
  items_total   INT NOT NULL DEFAULT 0,
  duration_ms   INT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started  ON agent_runs(started_at DESC);

-- Log entries
CREATE TABLE IF NOT EXISTS agent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  run_id     UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  level      TEXT NOT NULL DEFAULT 'info'
               CHECK (level IN ('info', 'success', 'error', 'warn')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created  ON agent_logs(created_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
```

If the `agents` table doesn't exist yet, run this first:
```sql
CREATE TABLE IF NOT EXISTS agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  tags              TEXT[],
  icon              TEXT,
  category          TEXT,
  github_repo_url   TEXT,
  vercel_url        TEXT,
  shared_db_schema  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Run in Supabase SQL editor**

Supabase dashboard → SQL Editor → paste → Run

- [ ] **Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'agents'
  AND column_name IN ('slug', 'vercel_project_id', 'avg_manual_minutes');
-- must return 3 rows

SELECT COUNT(*) FROM agent_runs;
SELECT COUNT(*) FROM agent_logs;
-- both 0, no error
```

- [ ] **Commit**

```bash
git add supabase/migrations/002_runs_logs.sql
git commit -m "feat: agent_runs and agent_logs tables + new agent columns"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Replace the entire file**

```ts
export interface Agent {
  id: string
  owner_id: string
  name: string
  slug: string | null
  description: string | null
  tags: string[] | null
  icon: string | null
  category: string | null
  github_repo_url: string | null
  vercel_url: string | null
  vercel_project_id: string | null
  shared_db_schema: string | null
  status: 'pending' | 'active' | 'inactive' | 'error'
  avg_manual_minutes: number
  created_at: string
  updated_at: string
  file_count?: number
}

export interface AgentRun {
  id: string
  agent_id: string
  status: 'processing' | 'success' | 'error'
  items_done: number
  items_total: number
  duration_ms: number | null
  started_at: string
  completed_at: string | null
}

export interface AgentLog {
  id: string
  agent_id: string
  run_id: string | null
  level: 'info' | 'success' | 'error' | 'warn'
  message: string
  created_at: string
}

export interface AgentFile {
  id: string
  agent_id: string
  filename: string
  storage_path: string
  file_size: number | null
  created_at: string
}

export interface ShareToken {
  id: string
  token: string
  agent_ids: string[]
  created_by: string
  expires_at: string | null
  created_at: string
}

export interface BuildPlan {
  name: string
  displayName: string
  icon: string
  category: string
  description: string
  systemPrompt: string
  tools: Array<{ name: string; description: string }>
  schema: string
  extraEnvVars: Array<{ key: string; description: string; required: boolean }>
  avgManualMinutes: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: BuildPlan
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors (ignore errors in files not yet created — list them, ignore for now)

- [ ] **Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: types — AgentRun, AgentLog, BuildPlan, ChatMessage; update Agent"
```

---

### Task 4: Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Create the file**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bot, LayoutGrid, Zap, Settings, FolderOpen, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types'

const NAV = [
  { label: 'My Agents', href: '/', icon: LayoutGrid },
  { label: 'Analytics',  href: '/analytics', icon: BarChart3, disabled: true },
  { label: 'Files',      href: '/files',     icon: FolderOpen, disabled: true },
  { label: 'Settings',   href: '/settings',  icon: Settings,   disabled: true },
]

interface Props {
  recentAgents?: Pick<Agent, 'id' | 'name' | 'icon' | 'category'>[]
}

export default function Sidebar({ recentAgents = [] }: Props) {
  const path = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-[#080a0e] border-r border-gray-900 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_18px_rgba(99,102,241,0.6)] transition-shadow flex-shrink-0">
            <Bot size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Agent<span className="text-indigo-400">Hub</span>
          </span>
        </Link>
        <p className="text-[10px] font-mono text-gray-700 mt-1 pl-9">Display Logic IT</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon, disabled }) => {
          const active = !disabled && path === href
          return (
            <Link
              key={href}
              href={disabled ? '#' : href}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all',
                active   ? 'bg-gray-800 border border-gray-700 text-gray-100' :
                disabled ? 'text-gray-700 cursor-not-allowed' :
                           'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}

        <div className="h-px bg-gray-900 my-2 mx-1" />

        {/* Agent Factory */}
        <Link
          href="/agents/new"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all',
            path === '/agents/new'
              ? 'bg-indigo-950 border border-indigo-700 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 hover:border-indigo-700 hover:text-indigo-300'
          )}
        >
          <Zap size={14} />
          Agent Factory
        </Link>

        {/* Recent agents */}
        {recentAgents.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-mono text-gray-700 uppercase tracking-widest px-3 mb-1.5">Recent</p>
            {recentAgents.slice(0, 5).map(agent => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all',
                  path === `/agents/${agent.id}`
                    ? 'text-gray-300 bg-gray-900'
                    : 'text-gray-600 hover:text-gray-400 hover:bg-gray-900/50'
                )}
              >
                <span className="text-sm leading-none">{agent.icon ?? '🤖'}</span>
                <span className="truncate">{agent.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-900 flex items-center gap-2.5">
        <UserButton appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
        <span className="text-[11px] font-mono text-gray-600 truncate">Keith</span>
      </div>
    </aside>
  )
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: Sidebar component — replaces Navbar"
```

---

### Task 5: Wire Sidebar into layout + update home page

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Replace layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Agent Hub — Display Logic IT',
  description: 'Your AI agent command center',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: recentAgents } = await supabase
    .from('agents')
    .select('id, name, icon, category')
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="h-full flex bg-gray-950 text-white">
          <Sidebar recentAgents={recentAgents ?? []} />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Replace page.tsx — remove Navbar**

```tsx
import AgentGrid from '@/components/AgentGrid'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Agent } from '@/lib/types'

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('agents')
    .select('*, agent_files(count)')
    .order('created_at', { ascending: false })

  const agents: Agent[] = (data ?? []).map((a: any) => ({
    ...a,
    file_count: a.agent_files?.[0]?.count ?? 0,
  }))

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Your Agents</h1>
        <p className="text-sm text-gray-600 font-mono mt-0.5">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} · Display Logic IT
        </p>
      </div>
      <AgentGrid initialAgents={agents} />
    </main>
  )
}
```

- [ ] **Verify in browser**

```bash
npm run dev
```
Open http://localhost:3000 — sidebar on the left, agent grid on the right, no top navbar.

- [ ] **Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat: replace Navbar with persistent Sidebar in root layout"
```

---

## Phase 2: Agent Detail Page

### Task 6: Status + logs API routes

**Files:**
- Create: `src/app/api/agents/[id]/status/route.ts`
- Create: `src/app/api/agents/[id]/logs/route.ts`

- [ ] **Create status route**

`src/app/api/agents/[id]/status/route.ts`:
```ts
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const [{ data: agent }, { data: activeRun }] = await Promise.all([
    supabase
      .from('agents')
      .select('id, status, avg_manual_minutes, vercel_project_id')
      .eq('id', id)
      .single(),
    supabase
      .from('agent_runs')
      .select('id, status, items_done, items_total, started_at')
      .eq('agent_id', id)
      .eq('status', 'processing')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { count: totalRuns } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', id)

  const { count: successRuns } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', id)
    .eq('status', 'success')

  const { data: latencyData } = await supabase
    .from('agent_runs')
    .select('duration_ms')
    .eq('agent_id', id)
    .eq('status', 'success')
    .not('duration_ms', 'is', null)

  const avgLatencyMs =
    latencyData && latencyData.length > 0
      ? Math.round(
          latencyData.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / latencyData.length
        )
      : null

  return Response.json({
    agent,
    activeRun: activeRun ?? null,
    stats: {
      totalRuns: totalRuns ?? 0,
      successRuns: successRuns ?? 0,
      successRate: totalRuns
        ? Math.round(((successRuns ?? 0) / totalRuns) * 1000) / 10
        : 0,
      avgLatencyMs,
    },
  })
}
```

- [ ] **Create logs route**

`src/app/api/agents/[id]/logs/route.ts`:
```ts
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? '20'), 100)
  const supabase = createSupabaseServerClient()

  const { data: logs } = await supabase
    .from('agent_logs')
    .select('id, level, message, created_at')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return Response.json({ logs: logs ?? [] })
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/app/api/agents/
git commit -m "feat: status and logs API routes"
```

---

### Task 7: Time-saved utility + tests

**Files:**
- Create: `src/lib/utils/timeSaved.ts`
- Create: `src/test/timeSaved.test.ts`

- [ ] **Write the utility**

`src/lib/utils/timeSaved.ts`:
```ts
export interface TimeSavedResult {
  hours: number
  minutes: number
  label: string
  humanLabel: string
  monthlyTargetHours: number
  progressPct: number
}

const WORK_HOURS_PER_MONTH = 160

export function calcTimeSaved(
  totalRuns: number,
  avgManualMinutes: number,
  teamSize = 1
): TimeSavedResult {
  const totalMinutes = totalRuns * avgManualMinutes
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const monthlyTargetHours = Math.round(teamSize * WORK_HOURS_PER_MONTH * 0.1)
  const label = `${hours}h ${minutes}m`

  let humanLabel: string
  if (hours >= 160)     humanLabel = `≈ ${Math.round(hours / 160)} work months`
  else if (hours >= 40) humanLabel = `≈ ${Math.round(hours / 40)} full work weeks`
  else if (hours >= 8)  humanLabel = `≈ ${Math.round(hours / 8)} full work days`
  else                  humanLabel = `${hours} hours back to your team`

  const progressPct = Math.min(100, Math.round((hours / Math.max(monthlyTargetHours, 1)) * 100))

  return { hours, minutes, label, humanLabel, monthlyTargetHours, progressPct }
}
```

- [ ] **Write the failing tests first**

`src/test/timeSaved.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calcTimeSaved } from '@/lib/utils/timeSaved'

describe('calcTimeSaved', () => {
  it('returns zero state for 0 runs', () => {
    const r = calcTimeSaved(0, 5)
    expect(r.hours).toBe(0)
    expect(r.minutes).toBe(0)
    expect(r.label).toBe('0h 0m')
    expect(r.progressPct).toBe(0)
  })

  it('calculates hours and minutes correctly', () => {
    // 100 runs × 5 min = 500 min = 8h 20m
    const r = calcTimeSaved(100, 5)
    expect(r.hours).toBe(8)
    expect(r.minutes).toBe(20)
    expect(r.label).toBe('8h 20m')
  })

  it('labels work weeks correctly', () => {
    // 1247 runs × 4 min = 4988 min = 83h 8m → "work weeks"
    const r = calcTimeSaved(1247, 4)
    expect(r.hours).toBe(83)
    expect(r.humanLabel).toMatch(/work weeks/)
  })

  it('caps progressPct at 100', () => {
    const r = calcTimeSaved(100000, 60)
    expect(r.progressPct).toBe(100)
  })

  it('scales monthly target by team size', () => {
    const solo = calcTimeSaved(0, 5, 1)
    const team = calcTimeSaved(0, 5, 3)
    expect(team.monthlyTargetHours).toBe(solo.monthlyTargetHours * 3)
  })
})
```

- [ ] **Run tests**

```bash
npx vitest run src/test/timeSaved.test.ts --reporter=verbose
```
Expected: 5 tests passing

- [ ] **Commit**

```bash
git add src/lib/utils/timeSaved.ts src/test/timeSaved.test.ts
git commit -m "feat: calcTimeSaved utility with tests"
```

---

### Task 8: Agent detail components

**Files:**
- Create: `src/components/agent/TimeSavedBar.tsx`
- Create: `src/components/agent/StatTiles.tsx`
- Create: `src/components/agent/BatchProgress.tsx`
- Create: `src/components/agent/RunHistory.tsx`
- Create: `src/components/agent/LiveLog.tsx`

- [ ] **TimeSavedBar.tsx**

```tsx
import { calcTimeSaved } from '@/lib/utils/timeSaved'

interface Props { totalRuns: number; avgManualMinutes: number }

export default function TimeSavedBar({ totalRuns, avgManualMinutes }: Props) {
  const { label, humanLabel, monthlyTargetHours, progressPct } = calcTimeSaved(totalRuns, avgManualMinutes)
  return (
    <div className="bg-gray-900/60 border border-indigo-900/40 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-100">⏱ Time Saved This Month</p>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            ~{avgManualMinutes} min avg per manual task × {totalRuns.toLocaleString()} runs
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-violet-400 leading-none">{label}</p>
          <p className="text-[11px] font-mono text-violet-600 mt-0.5">{humanLabel}</p>
        </div>
      </div>
      <div className="bg-gray-800 rounded-full h-2 overflow-hidden mb-1.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-gray-700">
        <span>0h</span>
        <span>Monthly target: {monthlyTargetHours}h</span>
        <span>{monthlyTargetHours}h</span>
      </div>
    </div>
  )
}
```

- [ ] **StatTiles.tsx**

```tsx
interface Props {
  totalRuns: number
  successRate: number
  avgLatencyMs: number | null
  createdAt: string
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export default function StatTiles({ totalRuns, successRate, avgLatencyMs, createdAt }: Props) {
  const tiles = [
    { value: totalRuns.toLocaleString(), label: 'total runs',   color: 'text-indigo-400' },
    { value: `${successRate}%`,          label: 'success rate', color: 'text-emerald-400' },
    {
      value: avgLatencyMs != null ? `${(avgLatencyMs / 1000).toFixed(1)}s` : '—',
      label: 'avg latency', color: 'text-amber-400',
    },
    { value: String(daysSince(createdAt)), label: 'days running', color: 'text-sky-400' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {tiles.map(({ value, label, color }) => (
        <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-center">
          <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          <p className="text-[10px] font-mono text-gray-600 mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **BatchProgress.tsx**

```tsx
import type { AgentRun } from '@/lib/types'

interface Props { run: AgentRun }

export default function BatchProgress({ run }: Props) {
  const pct = run.items_total > 0
    ? Math.round((run.items_done / run.items_total) * 100)
    : 0
  const elapsedMs = Date.now() - new Date(run.started_at).getTime()
  const estimatedTotalMs = pct > 0 ? (elapsedMs / pct) * 100 : null
  const remainingSec = estimatedTotalMs
    ? Math.max(0, Math.round((estimatedTotalMs - elapsedMs) / 1000))
    : null

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wide">Current Batch Progress</p>
        <p className="text-[11px] font-mono text-gray-600">
          {run.items_done} of {run.items_total} items
          {remainingSec != null && ` · ~${remainingSec}s remaining`}
        </p>
      </div>
      <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden mb-1.5">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.4)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] font-mono text-emerald-600">{pct}% complete</p>
    </div>
  )
}
```

- [ ] **RunHistory.tsx**

```tsx
import { cn } from '@/lib/utils'
import type { AgentRun } from '@/lib/types'

interface Props { runs: AgentRun[] }

function fmt(d: string) {
  const date = new Date(d)
  const isToday = date.toDateString() === new Date().toDateString()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return isToday ? `Today ${time}` : `Yesterday ${time}`
}

export default function RunHistory({ runs }: Props) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-3">Run History</p>
      {runs.length === 0 && <p className="text-xs font-mono text-gray-700">No runs yet</p>}
      <div className="flex flex-col gap-2">
        {runs.map((run, i) => (
          <div key={run.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',
                run.status === 'success' ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]' :
                run.status === 'error'   ? 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.7)]' :
                                           'bg-amber-400 animate-pulse'
              )} />
              <span className="text-xs font-mono text-gray-400">
                Batch #{String(runs.length - i).padStart(3, '0')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-600">{fmt(run.started_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **LiveLog.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AgentLog } from '@/lib/types'

interface Props { agentId: string; isActive: boolean; initialLogs: AgentLog[] }

const LEVEL_COLOR: Record<string, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warn:    'text-amber-400',
  info:    'text-gray-500',
}

function fmt(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LiveLog({ agentId, isActive, initialLogs }: Props) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs)

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(async () => {
      const res = await fetch(`/api/agents/${agentId}/logs?limit=20`)
      if (res.ok) setLogs((await res.json()).logs)
    }, 3000)
    return () => clearInterval(id)
  }, [agentId, isActive])

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide">Live Log</p>
        {isActive && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-600">streaming</span>
          </span>
        )}
      </div>
      {logs.length === 0 && <p className="text-xs font-mono text-gray-700">No log entries yet</p>}
      <div className="flex flex-col gap-1.5">
        {logs.map(log => (
          <div key={log.id} className="flex gap-2.5">
            <span className="text-[10px] font-mono text-gray-700 flex-shrink-0">{fmt(log.created_at)}</span>
            <span className={cn('text-[10px] font-mono', LEVEL_COLOR[log.level] ?? 'text-gray-500')}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/agent/
git commit -m "feat: agent detail components — TimeSavedBar, StatTiles, BatchProgress, RunHistory, LiveLog"
```

---

### Task 9: Agent detail page

**Files:**
- Create: `src/app/agents/[id]/page.tsx`

- [ ] **Create the page**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Github } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase'
import TimeSavedBar from '@/components/agent/TimeSavedBar'
import StatTiles from '@/components/agent/StatTiles'
import BatchProgress from '@/components/agent/BatchProgress'
import RunHistory from '@/components/agent/RunHistory'
import LiveLog from '@/components/agent/LiveLog'
import type { Agent, AgentRun, AgentLog } from '@/lib/types'

const CATEGORY_BADGE: Record<string, string> = {
  sourcing:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  validation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  meeting:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  logistics:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single()
  if (!agent) notFound()
  const a = agent as Agent

  const [{ data: runs }, { data: logs }] = await Promise.all([
    supabase
      .from('agent_runs').select('*').eq('agent_id', id)
      .order('started_at', { ascending: false }).limit(10),
    supabase
      .from('agent_logs').select('*').eq('agent_id', id)
      .order('created_at', { ascending: false }).limit(20),
  ])

  const allRuns = (runs ?? []) as AgentRun[]
  const activeRun = allRuns.find(r => r.status === 'processing') ?? null
  const completedRuns = allRuns.filter(r => r.status !== 'processing')
  const successRuns = completedRuns.filter(r => r.status === 'success')
  const successRate = completedRuns.length
    ? Math.round((successRuns.length / completedRuns.length) * 1000) / 10
    : 0
  const withLatency = completedRuns.filter(r => r.duration_ms != null)
  const avgLatencyMs = withLatency.length
    ? Math.round(withLatency.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / withLatency.length)
    : null
  const isActive = a.status === 'active'
  const catKey = a.category?.toLowerCase() ?? ''

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors">
        <ArrowLeft size={13} /> All Agents
      </Link>

      {/* Header */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-2xl shadow-[0_0_18px_rgba(99,102,241,0.3)] flex-shrink-0">
          {a.icon ?? '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-lg font-bold text-gray-100">{a.name}</h1>
            {a.category && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${CATEGORY_BADGE[catKey] ?? 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                {a.category}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-gray-500 leading-relaxed">{a.description ?? 'No description'}</p>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`w-3.5 h-3.5 rounded-full ${
            isActive
              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8),0_0_20px_rgba(52,211,153,0.4)]'
              : 'bg-gray-700'
          }`} />
          <span className={`text-[9px] font-mono ${isActive ? 'text-emerald-500' : 'text-gray-700'}`}>
            {isActive ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      <TimeSavedBar totalRuns={completedRuns.length} avgManualMinutes={a.avg_manual_minutes ?? 5} />

      <StatTiles
        totalRuns={completedRuns.length}
        successRate={successRate}
        avgLatencyMs={avgLatencyMs}
        createdAt={a.created_at}
      />

      {activeRun && <BatchProgress run={activeRun} />}

      <div className="grid grid-cols-2 gap-3">
        <RunHistory runs={completedRuns} />
        <LiveLog agentId={id} isActive={isActive} initialLogs={(logs ?? []) as AgentLog[]} />
      </div>

      {/* Footer */}
      <div className="flex gap-2">
        {a.github_repo_url && (
          <a href={a.github_repo_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-2.5 hover:border-gray-700 transition-colors group">
            <span className="flex items-center gap-2 text-xs font-mono text-indigo-400 group-hover:text-indigo-300">
              <Github size={13} />
              {a.github_repo_url.replace('https://github.com/', '')}
            </span>
            <ExternalLink size={11} className="text-gray-700" />
          </a>
        )}
        {a.vercel_url && (
          <a href={a.vercel_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-2.5 hover:border-gray-700 transition-colors group">
            <span className="flex items-center gap-2 text-xs font-mono text-indigo-400 group-hover:text-indigo-300">
              ▲ {a.vercel_url.replace('https://', '')}
            </span>
            <ExternalLink size={11} className="text-gray-700" />
          </a>
        )}
        {a.vercel_url && (
          <a href={a.vercel_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-lg px-5 py-2.5 text-xs font-mono font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.3)] transition-colors flex-shrink-0">
            Open Agent App <ExternalLink size={11} />
          </a>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Test in browser**

Click an agent card from the home page. The detail page should load with all sections. With no runs, stats show 0s and history/log show empty states.

- [ ] **Commit**

```bash
git add src/app/agents/[id]/page.tsx
git commit -m "feat: agent detail dashboard page"
```

---

## Phase 3: Agent Factory — Chat

### Task 10: Factory env vars

**Files:**
- Modify: `.env.local`

- [ ] **Append to .env.local**

```
# ---- Agent Factory ----
ANTHROPIC_API_KEY=
GITHUB_TOKEN=
VERCEL_TOKEN=
VERCEL_TEAM_ID=
GITHUB_ORG=DisplayLogicIT
VERCEL_TEMPLATE_REPO=DisplayLogicIT/agent-template
```

Fill in each value:
- `ANTHROPIC_API_KEY`: console.anthropic.com → API Keys
- `GITHUB_TOKEN`: github.com → Settings → Developer settings → Personal access tokens → Fine-grained → grant **repo** + **workflow** scope to `DisplayLogicIT` org
- `VERCEL_TOKEN`: vercel.com → Account Settings → Tokens → Create
- `VERCEL_TEAM_ID`: vercel.com → your team → Settings → General → scroll to "Team ID"

- [ ] **Smoke test ANTHROPIC_API_KEY**

```bash
node -e "
const Anthropic = require('@anthropic-ai/sdk');
const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
c.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] })
  .then(r => console.log('OK:', r.id))
  .catch(e => console.error('FAIL:', e.message))
"
```
Expected: `OK: msg_...`

---

### Task 11: Factory prompts + plan parser + tests

**Files:**
- Create: `src/lib/factory/prompts.ts`
- Create: `src/test/prompts.test.ts`

- [ ] **Write prompts.ts**

`src/lib/factory/prompts.ts`:
```ts
import type { BuildPlan } from '@/lib/types'

// ParsedPlan is an alias for BuildPlan — use BuildPlan everywhere else in the codebase
export type ParsedPlan = BuildPlan

export const FACTORY_SYSTEM_PROMPT = `You are the Agent Factory for Display Logic IT. Your job is to gather requirements for a new AI agent, then output a structured build plan.

## What you know

Every agent is built from the same template:
- Next.js 16 (App Router) on Vercel
- Clerk v7 for auth (pre-wired)
- Supabase for the agent's DB + shared DisplayLogicIT DB (pre-wired)
- Anthropic Claude Sonnet 4.6 via @anthropic-ai/sdk (pre-wired)
- Core logic in \`lib/agent/agent.ts\` (SYSTEM_PROMPT + TOOLS)
- Dashboard UI in \`app/dashboard/page.tsx\`

## Pre-wired env vars — do NOT ask for these
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
SHARED_DB_URL, SHARED_DB_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

## Your job

1. Ask what the user wants to build. One question at a time.
2. Determine: what the agent does, what external services it needs, what data it stores.
3. When you have enough info, output the build plan in EXACTLY this format:

<BUILD_PLAN>
NAME: slug-name-here
DISPLAY_NAME: Human Readable Name
ICON: 🤖
CATEGORY: sourcing|validation|meeting|logistics
DESCRIPTION: One sentence describing what the agent does.
AVG_MANUAL_MINUTES: 5
SYSTEM_PROMPT:
You are a [description] agent...
END_SYSTEM_PROMPT
TOOLS:
- tool_name: Description of what this tool does
- another_tool: Description
END_TOOLS
SCHEMA:
CREATE TABLE IF NOT EXISTS example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
END_SCHEMA
EXTRA_ENV_VARS:
- KEY_NAME|Description of what this key is for|required
- OPTIONAL_KEY|Description|optional
END_EXTRA_ENV_VARS
</BUILD_PLAN>

## Rules
- NAME: lowercase, hyphens only (e.g. vendor-po-monitor)
- CATEGORY: one of sourcing, validation, meeting, logistics
- AVG_MANUAL_MINUTES: minutes a human would spend on this task manually
- EXTRA_ENV_VARS: only keys the user must supply — not the pre-wired ones
- If no extra env vars are needed, put END_EXTRA_ENV_VARS immediately after EXTRA_ENV_VARS:
- Ask clarifying questions before generating the plan if description is vague`

export function parseBuildPlan(text: string): BuildPlan | null {
  const match = text.match(/<BUILD_PLAN>([\s\S]*?)<\/BUILD_PLAN>/)
  if (!match) return null
  const body = match[1]

  const scalar = (key: string) => {
    const m = body.match(new RegExp(`${key}:\\s*(.+)`))
    return m ? m[1].trim() : ''
  }

  const block = (start: string, end: string) => {
    const m = body.match(new RegExp(`${start}:\\s*\\n([\\s\\S]*?)\\n${end}`))
    return m ? m[1].trim() : ''
  }

  const tools = block('TOOLS', 'END_TOOLS')
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => {
      const rest = l.slice(2)
      const ci = rest.indexOf(':')
      return { name: rest.slice(0, ci).trim(), description: rest.slice(ci + 1).trim() }
    })

  const extraEnvVars = block('EXTRA_ENV_VARS', 'END_EXTRA_ENV_VARS')
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => {
      const parts = l.slice(2).split('|')
      return {
        key: parts[0]?.trim() ?? '',
        description: parts[1]?.trim() ?? '',
        required: (parts[2]?.trim() ?? 'required') === 'required',
      }
    })
    .filter(e => e.key)

  return {
    name: scalar('NAME'),
    displayName: scalar('DISPLAY_NAME'),
    icon: scalar('ICON'),
    category: scalar('CATEGORY'),
    description: scalar('DESCRIPTION'),
    avgManualMinutes: Number(scalar('AVG_MANUAL_MINUTES')) || 5,
    systemPrompt: block('SYSTEM_PROMPT', 'END_SYSTEM_PROMPT'),
    schema: block('SCHEMA', 'END_SCHEMA'),
    tools,
    extraEnvVars,
  }
}
```

- [ ] **Write parser tests**

`src/test/prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseBuildPlan } from '@/lib/factory/prompts'

const SAMPLE = `Got it! Here's what I'll build:

<BUILD_PLAN>
NAME: vendor-po-monitor
DISPLAY_NAME: Vendor PO Monitor
ICON: 📦
CATEGORY: sourcing
DESCRIPTION: Monitors vendor email inbox and extracts purchase orders into Supabase.
AVG_MANUAL_MINUTES: 4
SYSTEM_PROMPT:
You are a purchase order extraction agent.
END_SYSTEM_PROMPT
TOOLS:
- read_email: Reads unread emails from the vendor inbox
- extract_po: Extracts PO fields from email body
- log_po: Saves extracted PO to Supabase
END_TOOLS
SCHEMA:
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL
);
END_SCHEMA
EXTRA_ENV_VARS:
- GMAIL_CLIENT_ID|Gmail OAuth client ID|required
- GMAIL_CLIENT_SECRET|Gmail OAuth client secret|required
- VENDOR_EMAIL|Email address to monitor|optional
END_EXTRA_ENV_VARS
</BUILD_PLAN>`

describe('parseBuildPlan', () => {
  it('returns null when no BUILD_PLAN tag', () => {
    expect(parseBuildPlan('hello world')).toBeNull()
  })

  it('parses all scalar fields', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.name).toBe('vendor-po-monitor')
    expect(p.displayName).toBe('Vendor PO Monitor')
    expect(p.icon).toBe('📦')
    expect(p.category).toBe('sourcing')
    expect(p.avgManualMinutes).toBe(4)
  })

  it('parses tools correctly', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.tools).toHaveLength(3)
    expect(p.tools[0]).toEqual({ name: 'read_email', description: 'Reads unread emails from the vendor inbox' })
  })

  it('parses extraEnvVars with required flag', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.extraEnvVars).toHaveLength(3)
    expect(p.extraEnvVars[0]).toEqual({ key: 'GMAIL_CLIENT_ID', description: 'Gmail OAuth client ID', required: true })
    expect(p.extraEnvVars[2].required).toBe(false)
  })

  it('parses systemPrompt', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.systemPrompt).toContain('purchase order extraction agent')
  })
})
```

- [ ] **Run tests**

```bash
npx vitest run src/test/prompts.test.ts --reporter=verbose
```
Expected: 5 tests passing

- [ ] **Commit**

```bash
git add src/lib/factory/prompts.ts src/test/prompts.test.ts
git commit -m "feat: factory system prompt + build plan parser with tests"
```

---

### Task 12: Factory chat API (streaming)

**Files:**
- Create: `src/app/api/factory/chat/route.ts`

- [ ] **Create the route**

```ts
import Anthropic from '@anthropic-ai/sdk'
import { FACTORY_SYSTEM_PROMPT } from '@/lib/factory/prompts'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }
  if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 })

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: FACTORY_SYSTEM_PROMPT,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(enc.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
```

- [ ] **Smoke test**

With `npm run dev` and ANTHROPIC_API_KEY set:
```bash
curl -X POST http://localhost:3000/api/factory/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I want an agent that tracks inventory"}]}' \
  --no-buffer
```
Expected: streaming text reply from Claude

- [ ] **Commit**

```bash
git add src/app/api/factory/chat/route.ts
git commit -m "feat: factory streaming chat API"
```

---

### Task 13: Factory UI

**Files:**
- Create: `src/components/factory/BuildPlanCard.tsx`
- Create: `src/components/factory/FactoryChat.tsx`
- Create: `src/app/agents/new/page.tsx`

- [ ] **BuildPlanCard.tsx**

```tsx
import type { ParsedPlan } from '@/lib/factory/prompts'

interface Props {
  plan: ParsedPlan
  onApprove: () => void
  onEdit: () => void
  building: boolean
}

export default function BuildPlanCard({ plan, onApprove, onEdit, building }: Props) {
  const rows: [string, string][] = [
    ['NAME',      plan.name],
    ['DISPLAY',   plan.displayName],
    ['CATEGORY',  plan.category],
    ['DESC',      plan.description],
    ['AVG TIME',  `${plan.avgManualMinutes} min/task`],
    ['TOOLS',     plan.tools.map(t => t.name).join(', ')],
    ...(plan.extraEnvVars.length > 0
      ? [['NEEDS', plan.extraEnvVars.map(e => e.key).join(', ')] as [string, string]]
      : []),
  ]
  return (
    <div className="bg-gray-900/80 border border-indigo-900/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">Build Plan</span>
        <span className="text-lg">{plan.icon}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-xs font-mono">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <span className="text-indigo-500 w-20 flex-shrink-0">{k}</span>
            <span className="text-gray-300 break-all">{v}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        <button
          onClick={onApprove}
          disabled={building}
          className="flex-1 bg-emerald-900/60 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-semibold py-2 rounded-lg hover:bg-emerald-900/80 transition-colors disabled:opacity-50"
        >
          {building ? 'Building...' : '✓ Build it'}
        </button>
        <button
          onClick={onEdit}
          disabled={building}
          className="bg-gray-800 border border-gray-700 text-gray-400 text-xs font-mono py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Edit plan
        </button>
      </div>
    </div>
  )
}
```

- [ ] **FactoryChat.tsx**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBuildPlan } from '@/lib/factory/prompts'
import BuildPlanCard from './BuildPlanCard'
import type { ChatMessage, BuildPlan } from '@/lib/types'

interface Props {
  onBuildApproved: (plan: BuildPlan) => void
  building: boolean
}

export default function FactoryChat({ onBuildApproved, building }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: `Hey Keith 👋 I'm your Agent Factory. Tell me what kind of agent you want to build and I'll take care of the rest.\n\nI'll work out the system prompt, tools, database schema, and required credentials — then create the GitHub repo, deploy to Vercel, and register it in your hub.\n\nWhat do you want to build?`,
  }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming || building) return
    setInput('')

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setStreaming(true)

    const res = await fetch('/api/factory/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
    })

    if (!res.ok || !res.body) {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      setStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    setMessages(p => [...p, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      const plan = parseBuildPlan(full) ?? undefined
      setMessages(p => {
        const updated = [...p]
        updated[updated.length - 1] = { role: 'assistant', content: full, plan }
        return updated
      })
    }
    setStreaming(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0',
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                : 'bg-gradient-to-br from-indigo-600 to-violet-700 rounded-full'
            )}>
              {msg.role === 'assistant' ? '✦' : 'K'}
            </div>
            <div className={cn('max-w-[75%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'px-4 py-3 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap',
                msg.role === 'assistant'
                  ? 'bg-gray-900 border border-gray-800 text-gray-300 rounded-tl-sm'
                  : 'bg-indigo-950 border border-indigo-900 text-gray-200 rounded-tr-sm'
              )}>
                {msg.content.replace(/<BUILD_PLAN>[\s\S]*?<\/BUILD_PLAN>/g, '').trim()
                  || (streaming && i === messages.length - 1 ? '▍' : '')}
              </div>
              {msg.plan && (
                <BuildPlanCard
                  plan={msg.plan}
                  onApprove={() => onBuildApproved(msg.plan!)}
                  onEdit={() => setInput('Please adjust: ')}
                  building={building}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-gray-800 bg-gray-950/50">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Describe the agent you want to build..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-600/60 resize-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming || building}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl px-4 flex items-center gap-1.5 text-white text-xs font-mono font-semibold transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            <Send size={13} /> Send
          </button>
        </div>
        <p className="text-[10px] font-mono text-gray-700 mt-2">
          Template: Next.js 16 · Clerk · Supabase · Claude Sonnet 4.6 · Deploys to Vercel + DisplayLogicIT GitHub
        </p>
      </div>
    </div>
  )
}
```

- [ ] **agents/new/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import FactoryChat from '@/components/factory/FactoryChat'
import ConfigModal from '@/components/factory/ConfigModal'
import type { BuildPlan } from '@/lib/types'

type BuildState = 'idle' | 'building' | 'done' | 'error'

export default function AgentFactoryPage() {
  const [buildState, setBuildState] = useState<BuildState>('idle')
  const [builtAgent, setBuiltAgent] = useState<{ id: string; slug: string; plan: BuildPlan } | null>(null)
  const [buildLog, setBuildLog] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)

  async function handleBuildApproved(plan: BuildPlan) {
    setBuildState('building')
    setBuildLog(['Starting build...'])

    const res = await fetch('/api/factory/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })

    if (!res.ok || !res.body) {
      setBuildState('error')
      setBuildLog(p => [...p, 'Build failed — check the console.'])
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'log')   setBuildLog(p => [...p, event.message])
          if (event.type === 'done')  { setBuiltAgent({ id: event.agentId, slug: event.slug, plan }); setBuildState('done'); setShowConfig(true) }
          if (event.type === 'error') { setBuildState('error'); setBuildLog(p => [...p, `Error: ${event.message}`]) }
        } catch {}
      }
    }
  }

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

      <div className="flex-1 overflow-hidden">
        <FactoryChat onBuildApproved={handleBuildApproved} building={buildState === 'building'} />
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

- [ ] **Verify factory page renders at http://localhost:3000/agents/new**

Claude greeting should appear. Sending a message should stream a reply.

- [ ] **Commit**

```bash
git add src/components/factory/BuildPlanCard.tsx src/components/factory/FactoryChat.tsx src/app/agents/new/page.tsx
git commit -m "feat: Agent Factory UI — chat, plan card, factory page"
```

---

## Phase 4: Build Pipeline

### Task 14: GitHub + Vercel API helpers

**Files:**
- Create: `src/lib/factory/github.ts`
- Create: `src/lib/factory/vercel-api.ts`

- [ ] **github.ts**

```ts
const GH = 'https://api.github.com'
const TOKEN = () => process.env.GITHUB_TOKEN!
const ORG   = () => process.env.GITHUB_ORG!

function gh(path: string, init: RequestInit = {}) {
  return fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export async function createRepoFromTemplate(slug: string) {
  const [tOwner, tName] = (process.env.VERCEL_TEMPLATE_REPO ?? '').split('/')
  const res = await gh(`/repos/${tOwner}/${tName}/generate`, {
    method: 'POST',
    body: JSON.stringify({ owner: ORG(), name: slug, private: true }),
  })
  if (!res.ok) throw new Error(`GitHub create repo: ${await res.text()}`)
  const data = await res.json()
  return { repoUrl: data.html_url as string }
}

export async function waitForRepo(slug: string, maxRetries = 12) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await gh(`/repos/${ORG()}/${slug}/contents/lib/agent/agent.ts`)
    if (res.ok) return
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Timed out waiting for GitHub repo to initialise')
}

export async function getFile(slug: string, path: string) {
  const res = await gh(`/repos/${ORG()}/${slug}/contents/${path}`)
  if (!res.ok) throw new Error(`GitHub getFile failed: ${path}`)
  const d = await res.json()
  return { content: Buffer.from(d.content, 'base64').toString('utf-8'), sha: d.sha as string }
}

export async function updateFile(slug: string, path: string, content: string, sha: string, message: string) {
  const res = await gh(`/repos/${ORG()}/${slug}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), sha }),
  })
  if (!res.ok) throw new Error(`GitHub updateFile failed: ${path} — ${await res.text()}`)
}
```

- [ ] **vercel-api.ts**

```ts
const VERCEL = 'https://api.vercel.com'
const TOKEN   = () => process.env.VERCEL_TOKEN!
const TEAM_ID = () => process.env.VERCEL_TEAM_ID!

function vUrl(path: string) {
  const u = new URL(`${VERCEL}${path}`)
  u.searchParams.set('teamId', TEAM_ID())
  return u.toString()
}

function vFetch(path: string, init: RequestInit = {}) {
  return fetch(vUrl(path), {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

export async function createVercelProject(slug: string, org: string) {
  const res = await vFetch('/v9/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: slug,
      framework: 'nextjs',
      gitRepository: { type: 'github', repo: `${org}/${slug}` },
    }),
  })
  if (!res.ok) throw new Error(`Vercel create project: ${await res.text()}`)
  const d = await res.json()
  return { projectId: d.id as string, projectUrl: `https://${slug}.vercel.app` }
}

export async function setEnvVars(projectId: string, vars: Array<{ key: string; value: string }>) {
  const payload = vars.map(({ key, value }) => ({
    key, value, type: 'encrypted', target: ['production', 'preview'],
  }))
  const res = await vFetch(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Vercel setEnvVars: ${await res.text()}`)
}

export async function triggerDeploy(projectId: string, slug: string) {
  const res = await vFetch('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({ name: slug, project: projectId, target: 'production', gitSource: { type: 'github', ref: 'main' } }),
  })
  if (!res.ok) throw new Error(`Vercel triggerDeploy: ${await res.text()}`)
  const d = await res.json()
  return `https://${d.url}` as string
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/lib/factory/github.ts src/lib/factory/vercel-api.ts
git commit -m "feat: GitHub and Vercel API helpers"
```

---

### Task 15: Build pipeline + API routes

**Files:**
- Create: `src/lib/factory/builder.ts`
- Create: `src/app/api/factory/build/route.ts`
- Create: `src/app/api/factory/configure/route.ts`

- [ ] **builder.ts**

```ts
import { createRepoFromTemplate, waitForRepo, getFile, updateFile } from './github'
import { createVercelProject, setEnvVars, triggerDeploy } from './vercel-api'
import { createSupabaseAdminClient } from '@/lib/supabase'
import type { ParsedPlan } from './prompts'

export type BuildEvent =
  | { type: 'log';   message: string }
  | { type: 'done';  agentId: string; slug: string; vercelUrl: string }
  | { type: 'error'; message: string }

function makeAgentTs(plan: ParsedPlan): string {
  const toolsDef = plan.tools.map(t => `  {
    name: '${t.name}',
    description: '${t.description}',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  }`).join(',\n')

  const cases = plan.tools.map(t =>
    `    case '${t.name}':\n      // TODO: implement ${t.name}\n      return 'Not yet implemented'`
  ).join('\n')

  return `import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = \`${plan.systemPrompt}\`

const TOOLS: Anthropic.Tool[] = [
${toolsDef}
]

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
${cases}
    default:
      return \`Unknown tool: \${name}\`
  }
}

export interface AgentResult { output: string; turns: number }

export async function runAgent(userMessage: string, maxTurns = 5): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]
  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096,
      system: SYSTEM_PROMPT, tools: TOOLS, messages,
    })
    messages.push({ role: 'assistant', content: response.content })
    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('\\n')
      return { output: text, turns: turn + 1 }
    }
    if (response.stop_reason === 'tool_use') {
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input as Record<string, unknown>)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      messages.push({ role: 'user', content: results })
    }
  }
  return { output: 'Max turns reached.', turns: maxTurns }
}
`
}

export async function* buildAgent(plan: ParsedPlan): AsyncGenerator<BuildEvent> {
  const org = process.env.GITHUB_ORG!
  const slug = plan.name

  try {
    yield { type: 'log', message: `Creating GitHub repo ${org}/${slug}...` }
    await createRepoFromTemplate(slug)
    yield { type: 'log', message: 'Repo created.' }

    yield { type: 'log', message: 'Waiting for repo to initialise...' }
    await waitForRepo(slug)
    yield { type: 'log', message: 'Repo ready.' }

    yield { type: 'log', message: 'Writing agent logic...' }
    const { sha: agentSha } = await getFile(slug, 'lib/agent/agent.ts')
    await updateFile(slug, 'lib/agent/agent.ts', makeAgentTs(plan), agentSha, 'Factory: write agent logic')

    if (plan.schema) {
      yield { type: 'log', message: 'Writing database schema...' }
      const { sha: schemaSha } = await getFile(slug, 'supabase/migrations/001_initial.sql')
      await updateFile(slug, 'supabase/migrations/001_initial.sql', plan.schema, schemaSha, 'Factory: write schema')
    }

    yield { type: 'log', message: 'Updating metadata...' }
    const { content: layoutSrc, sha: layoutSha } = await getFile(slug, 'app/layout.tsx')
    const newLayout = layoutSrc.replace(/title: ['"].*?['"]/, `title: '${plan.displayName} — Display Logic IT'`)
    await updateFile(slug, 'app/layout.tsx', newLayout, layoutSha, 'Factory: update title')

    yield { type: 'log', message: 'Creating Vercel project...' }
    const { projectId, projectUrl } = await createVercelProject(slug, org)
    yield { type: 'log', message: `Vercel project: ${projectUrl}` }

    yield { type: 'log', message: 'Injecting standard env vars...' }
    await setEnvVars(projectId, [
      { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',            value: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY! },
      { key: 'CLERK_SECRET_KEY',                             value: process.env.CLERK_SECRET_KEY! },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',                value: '/sign-in' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',                value: '/sign-up' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL', value: '/dashboard' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL', value: '/dashboard' },
      { key: 'ANTHROPIC_API_KEY',                            value: process.env.ANTHROPIC_API_KEY! },
      { key: 'SHARED_DB_URL',                                value: process.env.SHARED_DB_URL! },
      { key: 'SHARED_DB_SERVICE_ROLE_KEY',                   value: process.env.SHARED_DB_SERVICE_ROLE_KEY! },
    ])
    yield { type: 'log', message: 'Env vars set.' }

    yield { type: 'log', message: 'Triggering deploy...' }
    await triggerDeploy(projectId, slug)
    yield { type: 'log', message: 'Deploy triggered.' }

    yield { type: 'log', message: 'Registering in hub...' }
    const supabase = createSupabaseAdminClient()
    const { data: row, error } = await supabase
      .from('agents')
      .insert({
        owner_id: 'factory',
        name: plan.displayName,
        slug,
        description: plan.description,
        icon: plan.icon,
        category: plan.category,
        tags: plan.tools.map(t => t.name),
        github_repo_url: `https://github.com/${org}/${slug}`,
        vercel_url: projectUrl,
        vercel_project_id: projectId,
        avg_manual_minutes: plan.avgManualMinutes,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Hub registration: ${error.message}`)
    yield { type: 'log', message: 'Registered in hub.' }
    yield { type: 'done', agentId: row.id, slug, vercelUrl: projectUrl }
  } catch (err: unknown) {
    yield { type: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}
```

- [ ] **build/route.ts**

`src/app/api/factory/build/route.ts`:
```ts
import { buildAgent } from '@/lib/factory/builder'
import type { ParsedPlan } from '@/lib/factory/prompts'

export async function POST(req: Request) {
  const { plan } = await req.json() as { plan: ParsedPlan }
  if (!plan?.name) return Response.json({ error: 'plan required' }, { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      for await (const event of buildAgent(plan)) {
        controller.enqueue(enc.encode(JSON.stringify(event) + '\n'))
        if (event.type === 'done' || event.type === 'error') break
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
```

- [ ] **configure/route.ts**

`src/app/api/factory/configure/route.ts`:
```ts
import { setEnvVars, triggerDeploy } from '@/lib/factory/vercel-api'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { agentId, projectId, slug, envVars } = await req.json() as {
    agentId: string
    projectId: string
    slug: string
    envVars: Array<{ key: string; value: string }>
  }
  if (!agentId || !projectId || !slug) {
    return Response.json({ error: 'agentId, projectId, slug required' }, { status: 400 })
  }

  const filtered = envVars.filter(e => e.value)
  if (filtered.length) await setEnvVars(projectId, filtered)

  const deployUrl = await triggerDeploy(projectId, slug)

  await createSupabaseAdminClient()
    .from('agents')
    .update({ status: 'active' })
    .eq('id', agentId)

  return Response.json({ deployUrl })
}
```

- [ ] **Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/lib/factory/builder.ts src/app/api/factory/
git commit -m "feat: build pipeline, build API, configure API"
```

---

### Task 16: Config modal + final checks

**Files:**
- Create: `src/components/factory/ConfigModal.tsx`

- [ ] **ConfigModal.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface EnvVar { key: string; description: string; required: boolean }

interface Props {
  agentId: string
  slug: string
  extraEnvVars: EnvVar[]
  onClose: () => void
}

export default function ConfigModal({ agentId, slug, extraEnvVars, onClose }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const statusRes = await fetch(`/api/agents/${agentId}/status`)
    const { agent } = await statusRes.json()
    const envVars = extraEnvVars
      .filter(e => values[e.key])
      .map(e => ({ key: e.key, value: values[e.key] }))
    await fetch('/api/factory/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, projectId: agent.vercel_project_id, slug, envVars }),
    })
    setSaving(false)
    onClose()
    router.push(`/agents/${agentId}`)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-100">🎉 {slug} deployed!</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-xs font-mono text-gray-600 mt-0.5">Configure your agent's credentials</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {extraEnvVars.length === 0 ? (
            <p className="text-sm font-mono text-gray-500">No extra credentials needed — your agent is ready!</p>
          ) : (
            <>
              <p className="text-xs font-mono text-gray-600 leading-relaxed">
                These go directly to Vercel and never touch the hub. Add them to activate your agent immediately.
              </p>
              {extraEnvVars.map(v => (
                <div key={v.key}>
                  <label className="block text-[10px] font-mono text-gray-500 mb-1.5">
                    {v.key}
                    <span className={`ml-1.5 ${v.required ? 'text-red-400' : 'text-gray-600'}`}>
                      {v.required ? '*required' : 'optional'}
                    </span>
                    <span className="block text-gray-700 mt-0.5">{v.description}</span>
                  </label>
                  <input
                    type="password"
                    placeholder={`Enter ${v.key}...`}
                    value={values[v.key] ?? ''}
                    onChange={e => setValues(p => ({ ...p, [v.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-600/60"
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold py-2.5 rounded-xl transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            {saving ? 'Saving...' : 'Save & Activate Agent'}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-800 border border-gray-700 text-gray-500 text-xs font-mono py-2.5 px-4 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Run all tests**

```bash
npx vitest run --reporter=verbose
```
Expected: 10 tests passing (5 timeSaved + 5 prompts)

- [ ] **Full build check**

```bash
npm run build
```
Expected: clean build, no TypeScript errors

- [ ] **Commit**

```bash
git add src/components/factory/ConfigModal.tsx
git commit -m "feat: post-deploy config modal"
```

---

### Task 17: Deploy to Vercel

- [ ] **Push all commits**

```bash
git push origin master
```

- [ ] **Add new env vars in Vercel dashboard**

Vercel dashboard → agent-hub project → Settings → Environment Variables → add for Production + Preview:
```
ANTHROPIC_API_KEY
GITHUB_TOKEN
VERCEL_TOKEN
VERCEL_TEAM_ID
GITHUB_ORG          = DisplayLogicIT
VERCEL_TEMPLATE_REPO = DisplayLogicIT/agent-template
```

- [ ] **Verify Vercel deployment succeeds**

Watch build logs in Vercel dashboard. Should complete without errors.

- [ ] **Smoke test the deployed app**

1. Open the Vercel URL and sign in
2. Sidebar renders on left — "My Agents" + "Agent Factory" visible
3. Clicking a card navigates to `/agents/[id]` — detail page loads
4. Clicking "Agent Factory" → `/agents/new` → Claude greeting appears
5. Type a message → streaming reply works
6. A full build plan appears → "Build it" button visible
