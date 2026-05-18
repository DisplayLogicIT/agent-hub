import AgentGrid from '@/components/AgentGrid'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Agent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('agents')
    .select('*, agent_files(count)')
    .order('created_at', { ascending: false })

  const agents: Agent[] = (data ?? []).map((a: any) => ({
    ...a,
    file_count: a.agent_files?.[0]?.count ?? 0,
  }))

  const activeCount = agents.filter(a => a.status === 'active').length
  const totalMinutes = agents.reduce((sum, a) => sum + (a.avg_manual_minutes ?? 0), 0)

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Your Agents</h1>
            <p className="text-xs text-gray-700 font-mono mt-0.5">Display Logic IT</p>
          </div>
          <div className="flex items-center gap-4 pb-0.5">
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-100 leading-none">{agents.length}</div>
              <div className="text-[10px] text-gray-700 font-mono mt-0.5">total</div>
            </div>
            <div className="w-px h-8 bg-[#181d2a]" />
            <div className="text-right">
              <div className="text-lg font-semibold text-emerald-400 leading-none">{activeCount}</div>
              <div className="text-[10px] text-gray-700 font-mono mt-0.5">active</div>
            </div>
            <div className="w-px h-8 bg-[#181d2a]" />
            <div className="text-right">
              <div className="text-lg font-semibold text-indigo-400 leading-none">{totalMinutes}m</div>
              <div className="text-[10px] text-gray-700 font-mono mt-0.5">saved/run</div>
            </div>
          </div>
        </div>
        <div className="h-px bg-[#181d2a] mt-5" />
      </div>
      <AgentGrid initialAgents={agents} />
    </main>
  )
}
