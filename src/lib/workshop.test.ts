import { describe, it, expect } from 'vitest'
import { splitDrafts } from './workshop'
import type { AgentDraft } from './types'

const base: AgentDraft = {
  id: '1', plan: {} as any, messages: [], status: 'plan-ready',
  build_log: [], error_message: null, agent_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

describe('splitDrafts', () => {
  it('puts plan-ready and building in active', () => {
    const drafts = [
      { ...base, id: '1', status: 'plan-ready' as const },
      { ...base, id: '2', status: 'building' as const },
      { ...base, id: '3', status: 'built' as const },
      { ...base, id: '4', status: 'failed' as const },
    ]
    const { active, log } = splitDrafts(drafts)
    expect(active.map(d => d.id)).toEqual(['1', '2'])
    expect(log.map(d => d.id)).toEqual(['3', '4'])
  })

  it('returns empty arrays when no drafts', () => {
    const { active, log } = splitDrafts([])
    expect(active).toEqual([])
    expect(log).toEqual([])
  })

  it('limits log to 20 entries', () => {
    const drafts = Array.from({ length: 25 }, (_, i) => ({
      ...base, id: String(i), status: 'built' as const,
    }))
    const { log } = splitDrafts(drafts)
    expect(log).toHaveLength(20)
  })
})
