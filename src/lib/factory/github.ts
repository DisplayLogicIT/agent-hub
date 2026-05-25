const GH = 'https://api.github.com'
const TOKEN = () => process.env.GITHUB_TOKEN!
const ORG   = () => process.env.GITHUB_ORG!

function gh(path: string, init: RequestInit = {}) {
  return fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export async function createRepoFromTemplate(slug: string) {
  const [tOwner, tName] = (process.env.VERCEL_TEMPLATE_REPO ?? '').split('/')
  const res = await gh(`/repos/${tOwner}/${tName}/generate`, {
    method: 'POST',
    body: JSON.stringify({ owner: ORG(), name: slug, private: true }),
  })
  if (!res.ok) {
    const body = await res.text()
    // [DEBUG-gh01] surface exact request context for diagnosis
    const tok = TOKEN() ?? ''
    console.error('[DEBUG-gh01] token len:', tok.length, 'last charCode:', tok.charCodeAt(tok.length - 1))
    console.error('[DEBUG-gh01] url:', `/repos/${tOwner}/${tName}/generate`, 'owner arg:', ORG())
    console.error('[DEBUG-gh01] status:', res.status, 'body:', body)
    const hint = res.status === 404
      ? ' (Is agent-template marked as a Template Repository in GitHub settings?)'
      : ''
    throw new Error(`GitHub create repo ${res.status}: ${body}${hint}`)
  }
  const data = await res.json()
  return { repoUrl: data.html_url as string }
}

export async function waitForRepo(slug: string, maxRetries = 12) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await gh(`/repos/${ORG()}/${slug}/contents/lib/agent/agent.ts`)
    if (res.ok) return
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Timed out waiting for GitHub repo to initialise')
}

export async function getFile(slug: string, path: string) {
  const res = await gh(`/repos/${ORG()}/${slug}/contents/${path}`)
  if (!res.ok) throw new Error(`GitHub getFile failed: ${path}`)
  const d = await res.json()
  return { content: Buffer.from(d.content, 'base64').toString('utf-8'), sha: d.sha as string }
}

export async function updateFile(slug: string, path: string, content: string, sha: string, message: string) {
  const res = await gh(`/repos/${ORG()}/${slug}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), sha }),
  })
  if (!res.ok) throw new Error(`GitHub updateFile failed: ${path} — ${await res.text()}`)
}
