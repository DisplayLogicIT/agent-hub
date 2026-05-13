import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? '20'), 100)
  const supabase = createSupabaseServerClient()

  const { data: logs } = await supabase
    .from('agent_logs')
    .select('id, level, message, created_at')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return Response.json({ logs: logs ?? [] })
}
