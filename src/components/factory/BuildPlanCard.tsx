import type { ParsedPlan } from '@/lib/factory/prompts'

interface Props {
  plan: ParsedPlan
  onApprove: () => void
  onEdit: () => void
  building: boolean
}

export default function BuildPlanCard({ plan, onApprove, onEdit, building }: Props) {
  const rows: [string, string][] = [
    ['NAME',      plan.name],
    ['DISPLAY',   plan.displayName],
    ['CATEGORY',  plan.category],
    ['DESC',      plan.description],
    ['AVG TIME',  `${plan.avgManualMinutes} min/task`],
    ['TOOLS',     plan.tools.map(t => t.name).join(', ')],
    ...(plan.extraEnvVars.length > 0
      ? [['NEEDS', plan.extraEnvVars.map(e => e.key).join(', ')] as [string, string]]
      : []),
  ]
  return (
    <div className="bg-gray-900/80 border border-indigo-900/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">Build Plan</span>
        <span className="text-lg">{plan.icon}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-xs font-mono">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <span className="text-indigo-500 w-20 flex-shrink-0">{k}</span>
            <span className="text-gray-300 break-all">{v}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        <button
          onClick={onApprove}
          disabled={building}
          className="flex-1 bg-emerald-900/60 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-semibold py-2 rounded-lg hover:bg-emerald-900/80 transition-colors disabled:opacity-50"
        >
          {building ? 'Building...' : '✓ Build it'}
        </button>
        <button
          onClick={onEdit}
          disabled={building}
          className="bg-gray-800 border border-gray-700 text-gray-400 text-xs font-mono py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Edit plan
        </button>
      </div>
    </div>
  )
}
