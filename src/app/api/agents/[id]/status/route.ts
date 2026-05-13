import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const [{ data: agent }, { data: activeRun }] = await Promise.all([
    supabase
      .from('agents')
      .select('id, status, avg_manual_minutes, vercel_project_id')
      .eq('id', id)
      .single(),
    supabase
      .from('agent_runs')
      .select('id, status, items_done, items_total, started_at')
      .eq('agent_id', id)
      .eq('status', 'processing')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const { count: totalRuns } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', id)

  const { count: successRuns } = await supabase
    .from('agent_runs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', id)
    .eq('status', 'success')

  const { data: latencyData } = await supabase
    .from('agent_runs')
    .select('duration_ms')
    .eq('agent_id', id)
    .eq('status', 'success')
    .not('duration_ms', 'is', null)

  const avgLatencyMs =
    latencyData && latencyData.length > 0
      ? Math.round(
          latencyData.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / latencyData.length
        )
      : null

  return Response.json({
    agent,
    activeRun: activeRun ?? null,
    stats: {
      totalRuns: totalRuns ?? 0,
      successRuns: successRuns ?? 0,
      successRate: totalRuns
        ? Math.round(((successRuns ?? 0) / totalRuns) * 1000) / 10
        : 0,
      avgLatencyMs,
    },
  })
}
