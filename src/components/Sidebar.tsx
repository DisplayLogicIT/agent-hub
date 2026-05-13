'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Bot, LayoutGrid, Zap, Settings, FolderOpen, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Agent } from '@/lib/types'

const NAV = [
  { label: 'My Agents', href: '/', icon: LayoutGrid },
  { label: 'Analytics',  href: '/analytics', icon: BarChart3, disabled: true },
  { label: 'Files',      href: '/files',     icon: FolderOpen, disabled: true },
  { label: 'Settings',   href: '/settings',  icon: Settings,   disabled: true },
]

interface Props {
  recentAgents?: Pick<Agent, 'id' | 'name' | 'icon' | 'category'>[]
}

export default function Sidebar({ recentAgents = [] }: Props) {
  const path = usePathname()

  return (
    <aside className="w-52 shrink-0 bg-[#080a0e] border-r border-gray-900 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_18px_rgba(99,102,241,0.6)] transition-shadow flex-shrink-0">
            <Bot size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Agent<span className="text-indigo-400">Hub</span>
          </span>
        </Link>
        <p className="text-[10px] font-mono text-gray-700 mt-1 pl-9">Display Logic IT</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon, disabled }) => {
          const active = !disabled && path === href
          return (
            <Link
              key={href}
              href={disabled ? '#' : href}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all',
                active   ? 'bg-gray-800 border border-gray-700 text-gray-100' :
                disabled ? 'text-gray-700 cursor-not-allowed' :
                           'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}

        <div className="h-px bg-gray-900 my-2 mx-1" />

        {/* Agent Factory */}
        <Link
          href="/agents/new"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all',
            path === '/agents/new'
              ? 'bg-indigo-950 border border-indigo-700 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 hover:border-indigo-700 hover:text-indigo-300'
          )}
        >
          <Zap size={14} />
          Agent Factory
        </Link>

        {/* Recent agents */}
        {recentAgents.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-mono text-gray-700 uppercase tracking-widest px-3 mb-1.5">Recent</p>
            {recentAgents.slice(0, 5).map(agent => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all',
                  path === `/agents/${agent.id}`
                    ? 'text-gray-300 bg-gray-900'
                    : 'text-gray-600 hover:text-gray-400 hover:bg-gray-900/50'
                )}
              >
                <span className="text-sm leading-none">{agent.icon ?? '🤖'}</span>
                <span className="truncate">{agent.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-900 flex items-center gap-2.5">
        <UserButton appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
        <span className="text-[11px] font-mono text-gray-600 truncate">Keith</span>
      </div>
    </aside>
  )
}
