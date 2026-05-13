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
