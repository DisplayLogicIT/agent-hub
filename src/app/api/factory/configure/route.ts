import { setEnvVars, triggerDeploy } from '@/lib/factory/vercel-api'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { agentId, projectId, slug, envVars } = await req.json() as {
    agentId: string
    projectId: string
    slug: string
    envVars: Array<{ key: string; value: string }>
  }
  if (!agentId || !projectId || !slug) {
    return Response.json({ error: 'agentId, projectId, slug required' }, { status: 400 })
  }

  const filtered = envVars.filter(e => e.value)
  if (filtered.length) await setEnvVars(projectId, filtered)

  const deployUrl = await triggerDeploy(projectId, slug)

  await createSupabaseAdminClient()
    .from('agents')
    .update({ status: 'active' })
    .eq('id', agentId)

  return Response.json({ deployUrl })
}
