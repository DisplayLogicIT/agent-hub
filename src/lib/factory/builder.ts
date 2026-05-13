import { createRepoFromTemplate, waitForRepo, getFile, updateFile } from './github'
import { createVercelProject, setEnvVars, triggerDeploy } from './vercel-api'
import { createSupabaseAdminClient } from '@/lib/supabase'
import type { ParsedPlan } from './prompts'

export type BuildEvent =
  | { type: 'log';   message: string }
  | { type: 'done';  agentId: string; slug: string; vercelUrl: string }
  | { type: 'error'; message: string }

function makeAgentTs(plan: ParsedPlan): string {
  const toolsDef = plan.tools.map(t => `  {
    name: '${t.name}',
    description: '${t.description}',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  }`).join(',\n')

  const cases = plan.tools.map(t =>
    `    case '${t.name}':\n      // TODO: implement ${t.name}\n      return 'Not yet implemented'`
  ).join('\n')

  return `import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = \`${plan.systemPrompt}\`

const TOOLS: Anthropic.Tool[] = [
${toolsDef}
]

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
${cases}
    default:
      return \`Unknown tool: \${name}\`
  }
}

export interface AgentResult { output: string; turns: number }

export async function runAgent(userMessage: string, maxTurns = 5): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]
  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096,
      system: SYSTEM_PROMPT, tools: TOOLS, messages,
    })
    messages.push({ role: 'assistant', content: response.content })
    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text).join('\\n')
      return { output: text, turns: turn + 1 }
    }
    if (response.stop_reason === 'tool_use') {
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input as Record<string, unknown>)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      messages.push({ role: 'user', content: results })
    }
  }
  return { output: 'Max turns reached.', turns: maxTurns }
}
`
}

export async function* buildAgent(plan: ParsedPlan): AsyncGenerator<BuildEvent> {
  const org = process.env.GITHUB_ORG!
  const slug = plan.name

  try {
    yield { type: 'log', message: `Creating GitHub repo ${org}/${slug}...` }
    await createRepoFromTemplate(slug)
    yield { type: 'log', message: 'Repo created.' }

    yield { type: 'log', message: 'Waiting for repo to initialise...' }
    await waitForRepo(slug)
    yield { type: 'log', message: 'Repo ready.' }

    yield { type: 'log', message: 'Writing agent logic...' }
    const { sha: agentSha } = await getFile(slug, 'lib/agent/agent.ts')
    await updateFile(slug, 'lib/agent/agent.ts', makeAgentTs(plan), agentSha, 'Factory: write agent logic')

    if (plan.schema) {
      yield { type: 'log', message: 'Writing database schema...' }
      const { sha: schemaSha } = await getFile(slug, 'supabase/migrations/001_initial.sql')
      await updateFile(slug, 'supabase/migrations/001_initial.sql', plan.schema, schemaSha, 'Factory: write schema')
    }

    yield { type: 'log', message: 'Updating metadata...' }
    const { content: layoutSrc, sha: layoutSha } = await getFile(slug, 'app/layout.tsx')
    const newLayout = layoutSrc.replace(/title: ['"].*?['"]/, `title: '${plan.displayName} — Display Logic IT'`)
    await updateFile(slug, 'app/layout.tsx', newLayout, layoutSha, 'Factory: update title')

    yield { type: 'log', message: 'Creating Vercel project...' }
    const { projectId, projectUrl } = await createVercelProject(slug, org)
    yield { type: 'log', message: `Vercel project: ${projectUrl}` }

    yield { type: 'log', message: 'Injecting standard env vars...' }
    await setEnvVars(projectId, [
      { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',            value: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY! },
      { key: 'CLERK_SECRET_KEY',                             value: process.env.CLERK_SECRET_KEY! },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',                value: '/sign-in' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',                value: '/sign-up' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL', value: '/dashboard' },
      { key: 'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL', value: '/dashboard' },
      { key: 'ANTHROPIC_API_KEY',                            value: process.env.ANTHROPIC_API_KEY! },
      { key: 'SHARED_DB_URL',                                value: process.env.SHARED_DB_URL! },
      { key: 'SHARED_DB_SERVICE_ROLE_KEY',                   value: process.env.SHARED_DB_SERVICE_ROLE_KEY! },
    ])
    yield { type: 'log', message: 'Env vars set.' }

    yield { type: 'log', message: 'Triggering deploy...' }
    await triggerDeploy(projectId, slug)
    yield { type: 'log', message: 'Deploy triggered.' }

    yield { type: 'log', message: 'Registering in hub...' }
    const supabase = createSupabaseAdminClient()
    const { data: row, error } = await supabase
      .from('agents')
      .insert({
        owner_id: 'factory',
        name: plan.displayName,
        slug,
        description: plan.description,
        icon: plan.icon,
        category: plan.category,
        tags: plan.tools.map(t => t.name),
        github_repo_url: `https://github.com/${org}/${slug}`,
        vercel_url: projectUrl,
        vercel_project_id: projectId,
        avg_manual_minutes: plan.avgManualMinutes,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Hub registration: ${error.message}`)
    yield { type: 'log', message: 'Registered in hub.' }
    yield { type: 'done', agentId: row.id, slug, vercelUrl: projectUrl }
  } catch (err: unknown) {
    yield { type: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}
