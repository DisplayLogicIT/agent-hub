'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap } from 'lucide-react'
import FactoryChat from '@/components/factory/FactoryChat'
import ConfigModal from '@/components/factory/ConfigModal'
import type { BuildPlan, ChatMessage } from '@/lib/types'

type BuildState = 'idle' | 'building' | 'done' | 'error'

const LS_KEY = 'agent-hub:draft-id'

export default function AgentFactoryPage() {
  const [buildState, setBuildState] = useState<BuildState>('idle')
  const [builtAgent, setBuiltAgent] = useState<{ id: string; slug: string; plan: BuildPlan } | null>(null)
  const [buildLog, setBuildLog] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | undefined>(undefined)
  const [restored, setRestored] = useState(false)
  const logBufferRef = useRef<string[]>([])
  const flushCountRef = useRef(0)

  useEffect(() => {
    async function restore() {
      const idFromUrl = new URLSearchParams(window.location.search).get('draft')
      const idFromStorage = localStorage.getItem(LS_KEY)
      const id = idFromUrl ?? idFromStorage
      if (!id) { setRestored(true); return }

      try {
        const res = await fetch(`/api/factory/draft/${id}`)
        if (!res.ok) { localStorage.removeItem(LS_KEY); setRestored(true); return }
        const draft = await res.json()
        setDraftId(draft.id)
        setInitialMessages(draft.messages ?? undefined)
        if (draft.status === 'building') {
          setBuildLog([...draft.build_log, '— Build was interrupted. Check Vercel logs. —'])
          setBuildState('error')
        } else if (draft.status === 'built' || draft.status === 'failed') {
          localStorage.removeItem(LS_KEY)
        }
      } catch {
        localStorage.removeItem(LS_KEY)
      }
      setRestored(true)
    }
    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePlanGenerated(plan: BuildPlan, messages: ChatMessage[]) {
    if (draftId) {
      await fetch(`/api/factory/draft/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, messages }),
      }).catch(() => {})
      return
    }
    try {
      const res = await fetch('/api/factory/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, messages }),
      })
      if (!res.ok) return
      const { id } = await res.json()
      setDraftId(id)
      localStorage.setItem(LS_KEY, id)
    } catch {}
  }

  async function flushLog(log: string[], force = false) {
    flushCountRef.current++
    if (!force && flushCountRef.current % 3 !== 0) return
    if (!draftId) return
    await fetch(`/api/factory/draft/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_log: log }),
    }).catch(() => {})
  }

  async function handleBuildApproved(plan: BuildPlan) {
    setBuildState('building')
    const startLog = ['Starting build...']
    setBuildLog(startLog)
    logBufferRef.current = startLog
    flushCountRef.current = 0

    if (draftId) {
      await fetch(`/api/factory/draft/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'building' }),
      }).catch(() => {})
    }

    try {
      const res = await fetch('/api/factory/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok || !res.body) {
        setBuildState('error')
        setBuildLog(p => [...p, 'Build failed — check the console.'])
        if (draftId) {
          await fetch(`/api/factory/draft/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', error_message: 'HTTP error from build route' }),
          }).catch(() => {})
        }
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let resolved = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'log') {
              logBufferRef.current = [...logBufferRef.current, event.message]
              setBuildLog([...logBufferRef.current])
              await flushLog(logBufferRef.current)
            }
            if (event.type === 'done') {
              resolved = true
              setBuiltAgent({ id: event.agentId, slug: event.slug, plan })
              setBuildState('done')
              setShowConfig(true)
              localStorage.removeItem(LS_KEY)
              if (draftId) {
                await fetch(`/api/factory/draft/${draftId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'built', agent_id: event.agentId, build_log: logBufferRef.current }),
                }).catch(() => {})
              }
            }
            if (event.type === 'error') {
              resolved = true
              setBuildState('error')
              setBuildLog(p => [...p, `Error: ${event.message}`])
              if (draftId) {
                await fetch(`/api/factory/draft/${draftId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'failed', error_message: event.message, build_log: logBufferRef.current }),
                }).catch(() => {})
              }
            }
          } catch {}
        }
      }

      if (!resolved) {
        setBuildState('error')
        const timeoutMsg = 'Build timed out or was interrupted. Check Vercel logs.'
        setBuildLog(p => [...p, timeoutMsg])
        if (draftId) {
          await fetch(`/api/factory/draft/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', error_message: timeoutMsg, build_log: logBufferRef.current }),
          }).catch(() => {})
        }
      }
    } catch (err) {
      setBuildState('error')
      const msg = err instanceof Error ? err.message : String(err)
      setBuildLog(p => [...p, `Build failed: ${msg}`])
      if (draftId) {
        await fetch(`/api/factory/draft/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed', error_message: msg }),
        }).catch(() => {})
      }
    }
  }

  if (!restored) return null

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

      {buildState === 'error' && buildLog.length > 0 && (
        <div className="mx-6 mt-4 bg-gray-900/80 border border-red-900/40 rounded-xl p-4 flex-shrink-0">
          <p className="text-[10px] font-mono text-red-600 uppercase tracking-wide mb-2">Build Log</p>
          {buildLog.map((line, i) => <p key={i} className="text-xs font-mono text-gray-500">{line}</p>)}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <FactoryChat
          onBuildApproved={handleBuildApproved}
          onPlanGenerated={handlePlanGenerated}
          building={buildState === 'building'}
          initialMessages={initialMessages}
        />
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
