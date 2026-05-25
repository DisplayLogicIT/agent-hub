export const dynamic = 'force-dynamic'

export async function GET() {
  const tok = process.env.GITHUB_TOKEN ?? ''
  const tmpl = process.env.VERCEL_TEMPLATE_REPO ?? ''
  const org = process.env.GITHUB_ORG ?? ''
  const [tOwner, tName] = tmpl.split('/')

  // Probe the generate endpoint with a fake slug so we see the real error
  const res = await fetch(`https://api.github.com/repos/${tOwner}/${tName}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner: org, name: `diag-probe-${Date.now()}`, private: true }),
  })
  const body = await res.text()

  return Response.json({
    tokenLen: tok.length,
    tokenLastCharCode: tok.charCodeAt(tok.length - 1),
    tokenStart: tok.slice(0, 4),
    tmpl,
    tOwner,
    tName,
    org,
    ghStatus: res.status,
    ghBody: body.slice(0, 300),
  })
}
