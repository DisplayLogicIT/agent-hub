import { createSupabaseAdminClient } from '@/lib/supabase'
import type { BuildPlan, ChatMessage } from '@/lib/types'

export async function POST(req: Request) {
  const { plan, messages } = await req.json() as { plan: BuildPlan; messages: ChatMessage[] }
  if (!plan?.name) return Response.json({ error: 'plan required' }, { status: 400 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('agent_drafts')
    .insert({ plan, messages, status: 'plan-ready' })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}
