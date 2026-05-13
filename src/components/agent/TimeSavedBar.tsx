import { calcTimeSaved } from '@/lib/utils/timeSaved'

interface Props { totalRuns: number; avgManualMinutes: number }

export default function TimeSavedBar({ totalRuns, avgManualMinutes }: Props) {
  const { label, humanLabel, monthlyTargetHours, progressPct } = calcTimeSaved(totalRuns, avgManualMinutes)
  return (
    <div className="bg-gray-900/60 border border-indigo-900/40 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-100">⏱ Time Saved This Month</p>
          <p className="text-xs font-mono text-gray-600 mt-0.5">
            ~{avgManualMinutes} min avg per manual task × {totalRuns.toLocaleString()} runs
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-violet-400 leading-none">{label}</p>
          <p className="text-[11px] font-mono text-violet-600 mt-0.5">{humanLabel}</p>
        </div>
      </div>
      <div className="bg-gray-800 rounded-full h-2 overflow-hidden mb-1.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-gray-700">
        <span>0h</span>
        <span>Monthly target: {monthlyTargetHours}h</span>
        <span>{monthlyTargetHours}h</span>
      </div>
    </div>
  )
}
