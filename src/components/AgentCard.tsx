'use client'

import { useState } from 'react'
import { Share2, Download, Check, Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  sourcing:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  validation: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  meeting:    'bg-violet-500/20 text-violet-400 border-violet-500/30',
  logistics:  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  default:    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
}

const ICON_BG: Record<string, string> = {
  sourcing:   'from-emerald-600 to-teal-700',
  validation: 'from-blue-600 to-cyan-700',
  meeting:    'from-violet-600 to-purple-700',
  logistics:  'from-orange-600 to-amber-700',
  default:    'from-indigo-600 to-violet-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface Props {
  agent: Agent
  selected: boolean
  onSelect: () => void
  onClick: () => void
}

export default function AgentCard({ agent, selected, onSelect, onClick }: Props) {
  const [hovered, setHovered] = useState(false)
  const cat = agent.category?.toLowerCase() ?? 'default'
  const colorKey = CATEGORY_COLORS[cat] ? cat : 'default'
  const fileCount = agent.file_count ?? 0

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200 cursor-pointer select-none overflow-hidden',
        'bg-gray-900/60 backdrop-blur-sm',
        selected
          ? 'border-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'border-gray-800/60 hover:border-gray-700/80 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
        hovered && !selected && 'translate-y-[-2px]'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* scan line on hover */}
      <div className={cn(
        'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent transition-opacity duration-300',
        hovered || selected ? 'opacity-100' : 'opacity-0'
      )} />

      {/* checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={cn(
          'absolute top-3 left-3 z-10 w-5 h-5 rounded-md border transition-all duration-150 flex items-center justify-center',
          selected
            ? 'bg-indigo-600 border-indigo-500 opacity-100'
            : 'bg-gray-800 border-gray-700 opacity-0 group-hover:opacity-100'
        )}
      >
        {selected && <Check size={12} strokeWidth={3} className="text-white" />}
      </button>

      {/* hover actions */}
      <div className={cn(
        'absolute top-3 right-3 z-10 flex gap-1.5 transition-all duration-150',
        hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      )}>
        <button
          onClick={e => e.stopPropagation()}
          className="w-7 h-7 rounded-lg bg-gray-800/90 border border-gray-700/60 flex items-center justify-center hover:bg-gray-700 hover:border-indigo-500/50 transition-colors"
        >
          <Share2 size={13} className="text-gray-400" />
        </button>
        <button
          onClick={e => e.stopPropagation()}
          className="w-7 h-7 rounded-lg bg-gray-800/90 border border-gray-700/60 flex items-center justify-center hover:bg-gray-700 hover:border-indigo-500/50 transition-colors"
        >
          <Download size={13} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4 pt-5">
        {/* icon */}
        <div className={cn(
          'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 text-lg shadow-md',
          ICON_BG[colorKey]
        )}>
          {agent.icon ?? '🤖'}
        </div>

        {/* name + status */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm text-gray-100 leading-tight truncate flex-1">
            {agent.name}
          </h3>
          <div className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            agent.status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-gray-600'
          )} />
        </div>

        {/* description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 font-mono">
          {agent.description ?? 'No description'}
        </p>

        {/* tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-md border font-mono',
                  CATEGORY_COLORS[colorKey]
                )}
              >
                {tag}
              </span>
            ))}
            {agent.tags.length > 3 && (
              <span className="text-[10px] text-gray-600 px-1 py-0.5 font-mono">
                +{agent.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
          <span className="flex items-center gap-1 text-[11px] text-gray-600 font-mono">
            <Zap size={10} className="text-gray-700" />
            {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-600 font-mono">
            <Clock size={10} className="text-gray-700" />
            {timeAgo(agent.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
