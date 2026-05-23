import Link from 'next/link'
import { Wrench, Zap } from 'lucide-react'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { splitDrafts } from '@/lib/workshop'
import ActiveDraftCard from '@/components/workshop/ActiveDraftCard'
import BuiltLogRow from '@/components/workshop/BuiltLogRow'
import type { AgentDraft } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function WorkshopPage() {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('agent_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  const drafts = (data ?? []) as AgentDraft[]
  const { active, log } = splitDrafts(drafts)

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-amber-500" />
              <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Workshop</h1>
            </div>
            <p className="text-xs text-gray-700 font-mono mt-0.5">
              {active.length} active · {log.length} built
            </p>
          </div>
          <Link
            href="/agents/new"
            className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 text-xs font-mono px-3 py-2 rounded-lg hover:bg-indigo-950 transition-colors"
          >
            <Zap size={12} />
            New Agent
          </Link>
        </div>
        <div className="h-px bg-[#181d2a] mt-5" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6 items-start">

        {/* Left: Active Drafts */}
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Active Drafts</p>
          {active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center">
              <p className="text-xs font-mono text-gray-700">No active builds.</p>
              <Link href="/agents/new" className="text-xs font-mono text-indigo-600 hover:text-indigo-400 mt-1 inline-block">
                Start one in the Agent Factory →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map(d => <ActiveDraftCard key={d.id} draft={d} />)}
            </div>
          )}
        </div>

        {/* Right: Built Log */}
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Built Log</p>
          {log.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center">
              <p className="text-xs font-mono text-gray-700">Nothing built yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map(d => <BuiltLogRow key={d.id} draft={d} />)}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
