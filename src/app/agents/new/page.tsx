'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import FactoryChat from '@/components/factory/FactoryChat'
import ConfigModal from '@/components/factory/ConfigModal'
import type { BuildPlan } from '@/lib/types'

type BuildState = 'idle' | 'building' | 'done' | 'error'

export default function AgentFactoryPage() {
  const [buildState, setBuildState] = useState<BuildState>('idle')
  const [builtAgent, setBuiltAgent] = useState<{ id: string; slug: string; plan: BuildPlan } | null>(null)
  const [buildLog, setBuildLog] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)

  async function handleBuildApproved(plan: BuildPlan) {
    setBuildState('building')
    setBuildLog(['Starting build...'])

    const res = await fetch('/api/factory/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })

    if (!res.ok || !res.body) {
      setBuildState('error')
      setBuildLog(p => [...p, 'Build failed — check the console.'])
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'log')   setBuildLog(p => [...p, event.message])
          if (event.type === 'done')  { setBuiltAgent({ id: event.agentId, slug: event.slug, plan }); setBuildState('done'); setShowConfig(true) }
          if (event.type === 'error') { setBuildState('error'); setBuildLog(p => [...p, `Error: ${event.message}`]) }
        } catch {}
      }
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-gray-100">Agent Factory</h1>
            <span className="bg-indigo-950 border border-indigo-800 text-indigo-400 text-[10px] font-mono px-2 py-0.5 rounded-full">Claude-powered</span>
          </div>
          <p className="text-xs font-mono text-gray-600 mt-0.5">Describe what you want built — Claude handles the rest</p>
        </div>
        <span className="text-[10px] font-mono text-gray-700 border border-gray-800 bg-gray-900 px-2.5 py-1 rounded-lg">Template: agent-template v1</span>
      </div>

      {buildState === 'building' && (
        <div className="mx-6 mt-4 bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex-shrink-0">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-2">Build Progress</p>
          {buildLog.map((line, i) => <p key={i} className="text-xs font-mono text-gray-400">{line}</p>)}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-indigo-500">running...</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <FactoryChat onBuildApproved={handleBuildApproved} building={buildState === 'building'} />
      </div>

      {showConfig && builtAgent && (
        <ConfigModal
          agentId={builtAgent.id}
          slug={builtAgent.slug}
          extraEnvVars={builtAgent.plan.extraEnvVars}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}
