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
