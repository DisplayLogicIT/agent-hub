import { describe, it, expect } from 'vitest'
import { calcTimeSaved } from '@/lib/utils/timeSaved'

describe('calcTimeSaved', () => {
  it('returns zero state for 0 runs', () => {
    const r = calcTimeSaved(0, 5)
    expect(r.hours).toBe(0)
    expect(r.minutes).toBe(0)
    expect(r.label).toBe('0h 0m')
    expect(r.progressPct).toBe(0)
  })

  it('calculates hours and minutes correctly', () => {
    // 100 runs × 5 min = 500 min = 8h 20m
    const r = calcTimeSaved(100, 5)
    expect(r.hours).toBe(8)
    expect(r.minutes).toBe(20)
    expect(r.label).toBe('8h 20m')
  })

  it('labels work weeks correctly', () => {
    // 1247 runs × 4 min = 4988 min = 83h 8m → "work weeks"
    const r = calcTimeSaved(1247, 4)
    expect(r.hours).toBe(83)
    expect(r.humanLabel).toMatch(/work weeks/)
  })

  it('caps progressPct at 100', () => {
    const r = calcTimeSaved(100000, 60)
    expect(r.progressPct).toBe(100)
  })

  it('scales monthly target by team size', () => {
    const solo = calcTimeSaved(0, 5, 1)
    const team = calcTimeSaved(0, 5, 3)
    expect(team.monthlyTargetHours).toBe(solo.monthlyTargetHours * 3)
  })
})
