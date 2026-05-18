'use client'

import { Check, ArrowUpRight, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  sourcing:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  validation: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  meeting:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  logistics:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  default:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

const ICON_BG: Record<string, string> = {
  sourcing:   'from-emerald-600 to-teal-700',
  validation: 'from-sky-600 to-cyan-700',
  meeting:    'from-violet-600 to-purple-700',
  logistics:  'from-amber-600 to-orange-700',
  default:    'from-indigo-600 to-violet-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface Props {
  agent: Agent
  selected: boolean
  onSelect: () => void
  onClick: () => void
  index?: number
}

export default function AgentCard({ agent, selected, onSelect, onClick, index = 0 }: Props) {
  const cat = agent.category?.toLowerCase() ?? 'default'
  const colorKey = CATEGORY_COLORS[cat] ? cat : 'default'
  const linkUrl = agent.vercel_url || agent.github_repo_url

  return (
    <div
      className={cn(
        'group relative rounded-xl border cursor-pointer select-none overflow-hidden',
        'bg-[#0c0f19]',
        'transition-[border-color,box-shadow,transform] duration-200',
        '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
        'hover:-translate-y-0.5 active:scale-[0.98]',
        selected
          ? 'border-indigo-500/60 shadow-[0_0_24px_rgba(99,102,241,0.12),0_0_0_1px_rgba(99,102,241,0.08)]'
          : 'border-[#181d2a] hover:border-[#262d42] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]',
      )}
      style={{ animation: `card-in 480ms cubic-bezier(0.23,1,0.32,1) ${index * 50}ms both` }}
      onClick={onClick}
    >
      {/* dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* top accent line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px transition-opacity duration-300',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.65), transparent)',
        }}
      />

      {/* checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={cn(
          'absolute top-3 left-3 z-10 w-5 h-5 rounded-md border',
          'flex items-center justify-center',
          'transition-[opacity,background-color,border-color] duration-150',
          selected
            ? 'bg-indigo-600 border-indigo-500 opacity-100'
            : 'bg-[#141828] border-[#1e2438] opacity-0 group-hover:opacity-100',
        )}
      >
        {selected && <Check size={11} strokeWidth={3} className="text-white" />}
      </button>

      {/* external link — only when there's a url */}
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={cn(
            'absolute top-3 right-3 z-10',
            'w-7 h-7 rounded-lg bg-[#0e1220]/90 border border-[#1e2438]',
            'flex items-center justify-center',
            'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0',
            'transition-[opacity,transform,border-color,background-color] duration-150',
            'hover:border-indigo-500/40 hover:bg-indigo-950/60',
          )}
        >
          <ArrowUpRight size={13} className="text-gray-500" />
        </a>
      )}

      <div className="relative p-4 pt-5">
        {/* icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 text-lg',
          'shadow-[0_2px_14px_rgba(0,0,0,0.55)]',
          ICON_BG[colorKey],
        )}>
          {agent.icon && agent.icon !== 'template' ? agent.icon : '🤖'}
        </div>

        {/* name + status dot */}
        <div className="flex items-start gap-2 mb-1.5">
          <h3 className="font-semibold text-[13px] text-gray-100 leading-snug flex-1">
            {agent.name}
          </h3>
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5',
              agent.status === 'active' ? 'bg-emerald-400' : 'bg-gray-700',
            )}
            style={agent.status === 'active' ? {
              animation: 'status-breathe 2.8s ease-in-out infinite',
            } : undefined}
          />
        </div>

        {/* description — regular weight, not mono */}
        <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {agent.description ?? 'No description'}
        </p>

        {/* tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className={cn(
                  'text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-md border',
                  CATEGORY_COLORS[colorKey],
                )}
              >
                {tag}
              </span>
            ))}
            {agent.tags.length > 3 && (
              <span className="text-[10px] text-gray-700 font-mono px-1 py-0.5">
                +{agent.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#12161f]">
          <span className="flex items-center gap-1 text-[10.5px] text-gray-700 font-mono">
            <Zap size={9} className="opacity-50" />
            {agent.avg_manual_minutes > 0 ? `${agent.avg_manual_minutes}m/run` : '—'}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] text-gray-700 font-mono">
            <Clock size={9} className="opacity-50" />
            {timeAgo(agent.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
