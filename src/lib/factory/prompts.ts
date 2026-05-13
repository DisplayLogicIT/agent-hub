import type { BuildPlan } from '@/lib/types'

// ParsedPlan is an alias for BuildPlan — use BuildPlan everywhere else in the codebase
export type ParsedPlan = BuildPlan

export const FACTORY_SYSTEM_PROMPT = `You are the Agent Factory for Display Logic IT. Your job is to gather requirements for a new AI agent, then output a structured build plan.

## What you know

Every agent is built from the same template:
- Next.js 16 (App Router) on Vercel
- Clerk v7 for auth (pre-wired)
- Supabase for the agent's DB + shared DisplayLogicIT DB (pre-wired)
- Anthropic Claude Sonnet 4.6 via @anthropic-ai/sdk (pre-wired)
- Core logic in \`lib/agent/agent.ts\` (SYSTEM_PROMPT + TOOLS)
- Dashboard UI in \`app/dashboard/page.tsx\`

## Pre-wired env vars — do NOT ask for these
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
SHARED_DB_URL, SHARED_DB_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

## Your job

1. Ask what the user wants to build. One question at a time.
2. Determine: what the agent does, what external services it needs, what data it stores.
3. When you have enough info, output the build plan in EXACTLY this format:

<BUILD_PLAN>
NAME: slug-name-here
DISPLAY_NAME: Human Readable Name
ICON: 🤖
CATEGORY: sourcing|validation|meeting|logistics
DESCRIPTION: One sentence describing what the agent does.
AVG_MANUAL_MINUTES: 5
SYSTEM_PROMPT:
You are a [description] agent...
END_SYSTEM_PROMPT
TOOLS:
- tool_name: Description of what this tool does
- another_tool: Description
END_TOOLS
SCHEMA:
CREATE TABLE IF NOT EXISTS example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
END_SCHEMA
EXTRA_ENV_VARS:
- KEY_NAME|Description of what this key is for|required
- OPTIONAL_KEY|Description|optional
END_EXTRA_ENV_VARS
</BUILD_PLAN>

## Rules
- NAME: lowercase, hyphens only (e.g. vendor-po-monitor)
- CATEGORY: one of sourcing, validation, meeting, logistics
- AVG_MANUAL_MINUTES: minutes a human would spend on this task manually
- EXTRA_ENV_VARS: only keys the user must supply — not the pre-wired ones
- If no extra env vars are needed, put END_EXTRA_ENV_VARS immediately after EXTRA_ENV_VARS:
- Ask clarifying questions before generating the plan if description is vague`

export function parseBuildPlan(text: string): BuildPlan | null {
  const match = text.match(/<BUILD_PLAN>([\s\S]*?)<\/BUILD_PLAN>/)
  if (!match) return null
  const body = match[1]

  const scalar = (key: string) => {
    const m = body.match(new RegExp(`${key}:\\s*(.+)`))
    return m ? m[1].trim() : ''
  }

  const block = (start: string, end: string) => {
    const m = body.match(new RegExp(`${start}:\\s*\\n([\\s\\S]*?)\\n${end}`))
    return m ? m[1].trim() : ''
  }

  const tools = block('TOOLS', 'END_TOOLS')
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => {
      const rest = l.slice(2)
      const ci = rest.indexOf(':')
      return { name: rest.slice(0, ci).trim(), description: rest.slice(ci + 1).trim() }
    })

  const extraEnvVars = block('EXTRA_ENV_VARS', 'END_EXTRA_ENV_VARS')
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => {
      const parts = l.slice(2).split('|')
      return {
        key: parts[0]?.trim() ?? '',
        description: parts[1]?.trim() ?? '',
        required: (parts[2]?.trim() ?? 'required') === 'required',
      }
    })
    .filter(e => e.key)

  return {
    name: scalar('NAME'),
    displayName: scalar('DISPLAY_NAME'),
    icon: scalar('ICON'),
    category: scalar('CATEGORY'),
    description: scalar('DESCRIPTION'),
    avgManualMinutes: Number(scalar('AVG_MANUAL_MINUTES')) || 5,
    systemPrompt: block('SYSTEM_PROMPT', 'END_SYSTEM_PROMPT'),
    schema: block('SCHEMA', 'END_SCHEMA'),
    tools,
    extraEnvVars,
  }
}
