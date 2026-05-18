'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Share2, Package, X, SlidersHorizontal } from 'lucide-react'
import AgentCard from './AgentCard'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types'

const CATEGORIES = ['All', 'Sourcing', 'Validation', 'Meeting', 'Logistics']

interface Props {
  initialAgents: Agent[]
}

export default function AgentGrid({ initialAgents }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return initialAgents.filter(a => {
      const matchesSearch = !q ||
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      const matchesCat = category === 'All' ||
        a.category?.toLowerCase() === category.toLowerCase()
      return matchesSearch && matchesCat
    })
  }, [initialAgents, query, category])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const clearSelection = () => setSelected(new Set())

  const handleShare = () => {
    const ids = Array.from(selected).join(',')
    router.push(`/api/share?agents=${ids}`)
  }

  const handleExport = () => {
    const ids = Array.from(selected).join(',')
    window.location.href = `/api/export?agents=${ids}`
  }

  return (
    <div className="relative">
      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents, tags, descriptions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-lg text-sm font-mono',
              'bg-[#0c0f19] border border-[#181d2a] text-gray-300 placeholder-gray-700',
              'focus:outline-none focus:border-indigo-500/50',
              'focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]',
              'transition-[border-color,box-shadow] duration-150',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-gray-700 mr-0.5 flex-shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-mono font-medium',
                'transition-[background-color,border-color,color] duration-150',
                category === cat
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-[#0c0f19] border border-[#181d2a] text-gray-600 hover:border-[#262d42] hover:text-gray-400',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* count */}
      <p className="text-[11px] text-gray-700 font-mono mb-4 tracking-tight">
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
        {query && ` matching "${query}"`}
      </p>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-3 opacity-40">🤖</div>
          <p className="text-gray-600 font-mono text-sm">No agents found</p>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mt-2 text-xs text-indigo-500 hover:text-indigo-400 font-mono underline underline-offset-2 transition-colors duration-150"
            >
              clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              selected={selected.has(agent.id)}
              onSelect={() => toggleSelect(agent.id)}
              onClick={() => router.push(`/agents/${agent.id}`)}
            />
          ))}
        </div>
      )}

      {/* selection bar */}
      {selected.size > 0 && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 px-4 py-3 rounded-2xl',
          'bg-[#0c0f19]/95 border border-[#1e2438] backdrop-blur-xl',
          'shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(99,102,241,0.12)]',
        )}>
          <span className="text-sm font-mono text-gray-500">
            <span className="text-indigo-400 font-semibold">{selected.size}</span> selected
          </span>
          <div className="w-px h-4 bg-[#1e2438]" />
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono hover:bg-indigo-600/30 transition-[background-color] duration-150"
          >
            <Share2 size={13} /> Share
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1220] border border-[#1e2438] text-gray-400 text-xs font-mono hover:text-gray-300 hover:border-[#2a3148] transition-[border-color,color] duration-150"
          >
            <Package size={13} /> Export ZIP
          </button>
          <button
            onClick={clearSelection}
            className="w-7 h-7 rounded-lg bg-[#0e1220] border border-[#1e2438] flex items-center justify-center text-gray-600 hover:text-gray-400 hover:border-[#2a3148] transition-[border-color,color] duration-150"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
