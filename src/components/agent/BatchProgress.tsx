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
