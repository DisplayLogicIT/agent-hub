import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, GitFork } from 'lucide-react'
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
              <GitFork size={13} />
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
