import { buildAgent } from '@/lib/factory/builder'
import type { ParsedPlan } from '@/lib/factory/prompts'

export async function POST(req: Request) {
  const { plan } = await req.json() as { plan: ParsedPlan }
  if (!plan?.name) return Response.json({ error: 'plan required' }, { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      for await (const event of buildAgent(plan)) {
        controller.enqueue(enc.encode(JSON.stringify(event) + '\n'))
        if (event.type === 'done' || event.type === 'error') break
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
