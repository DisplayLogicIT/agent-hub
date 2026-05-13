'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface EnvVar { key: string; description: string; required: boolean }

interface Props {
  agentId: string
  slug: string
  extraEnvVars: EnvVar[]
  onClose: () => void
}

export default function ConfigModal({ agentId, slug, extraEnvVars, onClose }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const statusRes = await fetch(`/api/agents/${agentId}/status`)
    const { agent } = await statusRes.json()
    const envVars = extraEnvVars
      .filter(e => values[e.key])
      .map(e => ({ key: e.key, value: values[e.key] }))
    await fetch('/api/factory/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, projectId: agent.vercel_project_id, slug, envVars }),
    })
    setSaving(false)
    onClose()
    router.push(`/agents/${agentId}`)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-100">🎉 {slug} deployed!</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-xs font-mono text-gray-600 mt-0.5">Configure your agent&apos;s credentials</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {extraEnvVars.length === 0 ? (
            <p className="text-sm font-mono text-gray-500">No extra credentials needed — your agent is ready!</p>
          ) : (
            <>
              <p className="text-xs font-mono text-gray-600 leading-relaxed">
                These go directly to Vercel and never touch the hub. Add them to activate your agent immediately.
              </p>
              {extraEnvVars.map(v => (
                <div key={v.key}>
                  <label className="block text-[10px] font-mono text-gray-500 mb-1.5">
                    {v.key}
                    <span className={`ml-1.5 ${v.required ? 'text-red-400' : 'text-gray-600'}`}>
                      {v.required ? '*required' : 'optional'}
                    </span>
                    <span className="block text-gray-700 mt-0.5">{v.description}</span>
                  </label>
                  <input
                    type="password"
                    placeholder={`Enter ${v.key}...`}
                    value={values[v.key] ?? ''}
                    onChange={e => setValues(p => ({ ...p, [v.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-600/60"
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold py-2.5 rounded-xl transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            {saving ? 'Saving...' : 'Save & Activate Agent'}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-800 border border-gray-700 text-gray-500 text-xs font-mono py-2.5 px-4 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
