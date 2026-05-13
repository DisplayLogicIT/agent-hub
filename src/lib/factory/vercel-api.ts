const VERCEL = 'https://api.vercel.com'
const TOKEN   = () => process.env.VERCEL_TOKEN!
const TEAM_ID = () => process.env.VERCEL_TEAM_ID!

function vUrl(path: string) {
  const u = new URL(`${VERCEL}${path}`)
  u.searchParams.set('teamId', TEAM_ID())
  return u.toString()
}

function vFetch(path: string, init: RequestInit = {}) {
  return fetch(vUrl(path), {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

export async function createVercelProject(slug: string, org: string) {
  const res = await vFetch('/v9/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: slug,
      framework: 'nextjs',
      gitRepository: { type: 'github', repo: `${org}/${slug}` },
    }),
  })
  if (!res.ok) throw new Error(`Vercel create project: ${await res.text()}`)
  const d = await res.json()
  return { projectId: d.id as string, projectUrl: `https://${slug}.vercel.app` }
}

export async function setEnvVars(projectId: string, vars: Array<{ key: string; value: string }>) {
  const payload = vars.map(({ key, value }) => ({
    key, value, type: 'encrypted', target: ['production', 'preview'],
  }))
  const res = await vFetch(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Vercel setEnvVars: ${await res.text()}`)
}

export async function triggerDeploy(projectId: string, slug: string) {
  const res = await vFetch('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({ name: slug, project: projectId, target: 'production', gitSource: { type: 'github', ref: 'main' } }),
  })
  if (!res.ok) throw new Error(`Vercel triggerDeploy: ${await res.text()}`)
  const d = await res.json()
  return `https://${d.url}` as string
}
