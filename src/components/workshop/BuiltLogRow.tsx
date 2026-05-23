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
