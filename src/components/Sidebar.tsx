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
    <aside className="w-52 shrink-0 bg-[#070910] border-r border-[#181d2a] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#181d2a]">
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
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono',
                'transition-[background-color,border-color,color] duration-150',
                active   ? 'bg-[#111420] border border-[#1e2438] text-gray-100' :
                disabled ? 'text-gray-800 cursor-not-allowed' :
                           'text-gray-600 hover:text-gray-300 hover:bg-[#0e1120] border border-transparent',
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}

        <div className="h-px bg-[#181d2a] my-2 mx-1" />

        {/* Agent Factory */}
        <Link
          href="/agents/new"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono',
            'transition-[background-color,border-color,color,box-shadow] duration-150',
            path === '/agents/new'
              ? 'bg-indigo-950 border border-indigo-700/60 text-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.18)]'
              : 'bg-indigo-950/30 border border-indigo-900/40 text-indigo-500 hover:border-indigo-700/50 hover:text-indigo-300',
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
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono',
                  'transition-[background-color,color] duration-150',
                  path === `/agents/${agent.id}`
                    ? 'text-gray-300 bg-[#0e1120]'
                    : 'text-gray-700 hover:text-gray-400 hover:bg-[#0e1120]',
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
      <div className="px-3 py-3 border-t border-[#181d2a] flex items-center gap-2.5">
        <UserButton appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
        <span className="text-[11px] font-mono text-gray-600 truncate">Keith</span>
      </div>
    </aside>
  )
}
