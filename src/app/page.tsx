import AgentGrid from '@/components/AgentGrid'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Agent } from '@/lib/types'

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

  return (
    <main className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Your Agents</h1>
        <p className="text-sm text-gray-600 font-mono mt-0.5">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} · Display Logic IT
        </p>
      </div>
      <AgentGrid initialAgents={agents} />
    </main>
  )
}
