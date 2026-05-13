export interface TimeSavedResult {
  hours: number
  minutes: number
  label: string
  humanLabel: string
  monthlyTargetHours: number
  progressPct: number
}

const WORK_HOURS_PER_MONTH = 160

export function calcTimeSaved(
  totalRuns: number,
  avgManualMinutes: number,
  teamSize = 1
): TimeSavedResult {
  const totalMinutes = totalRuns * avgManualMinutes
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const monthlyTargetHours = Math.round(teamSize * WORK_HOURS_PER_MONTH * 0.1)
  const label = `${hours}h ${minutes}m`

  let humanLabel: string
  if (hours >= 160)     humanLabel = `≈ ${Math.round(hours / 160)} work months`
  else if (hours >= 40) humanLabel = `≈ ${Math.round(hours / 40)} full work weeks`
  else if (hours >= 8)  humanLabel = `≈ ${Math.round(hours / 8)} full work days`
  else                  humanLabel = `${hours} hours back to your team`

  const progressPct = Math.min(100, Math.round((hours / Math.max(monthlyTargetHours, 1)) * 100))

  return { hours, minutes, label, humanLabel, monthlyTargetHours, progressPct }
}
