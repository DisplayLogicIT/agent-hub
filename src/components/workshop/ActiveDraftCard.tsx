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
