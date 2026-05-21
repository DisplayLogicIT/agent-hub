import type { AgentDraft } from './types'

export function splitDrafts(drafts: AgentDraft[]): {
  active: AgentDraft[]
  log: AgentDraft[]
} {
  const active = drafts.filter(d => d.status === 'plan-ready' || d.status === 'building')
  const log = drafts.filter(d => d.status === 'built' || d.status === 'failed').slice(0, 20)
  return { active, log }
}
