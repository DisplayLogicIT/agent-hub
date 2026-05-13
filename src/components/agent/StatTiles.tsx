interface Props {
  totalRuns: number
  successRate: number
  avgLatencyMs: number | null
  createdAt: string
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export default function StatTiles({ totalRuns, successRate, avgLatencyMs, createdAt }: Props) {
  const tiles = [
    { value: totalRuns.toLocaleString(), label: 'total runs',   color: 'text-indigo-400' },
    { value: `${successRate}%`,          label: 'success rate', color: 'text-emerald-400' },
    {
      value: avgLatencyMs != null ? `${(avgLatencyMs / 1000).toFixed(1)}s` : '—',
      label: 'avg latency', color: 'text-amber-400',
    },
    { value: String(daysSince(createdAt)), label: 'days running', color: 'text-sky-400' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {tiles.map(({ value, label, color }) => (
        <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-center">
          <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          <p className="text-[10px] font-mono text-gray-600 mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}
