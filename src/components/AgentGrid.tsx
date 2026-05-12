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
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents, tags, descriptions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-lg text-sm font-mono',
              'bg-gray-900/80 border border-gray-800 text-gray-300 placeholder-gray-600',
              'focus:outline-none focus:border-indigo-500/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]',
              'transition-all duration-150'
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-gray-600 mr-0.5" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all duration-150',
                category === cat
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                  : 'bg-gray-900/60 border border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* count */}
      <p className="text-xs text-gray-600 font-mono mb-4">
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
        {query && ` matching "${query}"`}
      </p>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-500 font-mono text-sm">No agents found</p>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-mono underline underline-offset-2"
            >
              clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selected.has(agent.id)}
              onSelect={() => toggleSelect(agent.id)}
              onClick={() => router.push(`/agents/${agent.id}`)}
            />
          ))}
        </div>
      )}

      {/* selection action bar */}
      {selected.size > 0 && (
        <div className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 px-4 py-3 rounded-2xl',
          'bg-gray-900/95 border border-gray-700/80 backdrop-blur-xl',
          'shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(99,102,241,0.15)]'
        )}>
          <span className="text-sm font-mono text-gray-400">
            <span className="text-indigo-400 font-semibold">{selected.size}</span> selected
          </span>
          <div className="w-px h-4 bg-gray-700" />
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono hover:bg-indigo-600/30 transition-colors"
          >
            <Share2 size={13} /> Share
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-gray-300 text-xs font-mono hover:bg-gray-700/80 transition-colors"
          >
            <Package size={13} /> Export ZIP
          </button>
          <button
            onClick={clearSelection}
            className="w-7 h-7 rounded-lg bg-gray-800/60 border border-gray-700/40 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
