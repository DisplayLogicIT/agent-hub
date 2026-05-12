import { UserButton } from '@clerk/nextjs'
import { Bot, Plus } from 'lucide-react'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_18px_rgba(99,102,241,0.6)] transition-shadow">
            <Bot size={15} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">
            Agent<span className="text-indigo-400">Hub</span>
          </span>
          <span className="hidden sm:block text-[10px] font-mono text-gray-600 border border-gray-800 px-1.5 py-0.5 rounded-md ml-1">
            Display Logic IT
          </span>
        </Link>

        {/* right */}
        <div className="flex items-center gap-3">
          <Link
            href="/agents/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:shadow-[0_0_18px_rgba(99,102,241,0.4)]"
          >
            <Plus size={13} strokeWidth={2.5} />
            New Agent
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7',
              }
            }}
          />
        </div>
      </div>
    </nav>
  )
}
