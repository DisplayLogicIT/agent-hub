'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseBuildPlan } from '@/lib/factory/prompts'
import BuildPlanCard from './BuildPlanCard'
import type { ChatMessage, BuildPlan } from '@/lib/types'

interface Props {
  onBuildApproved: (plan: BuildPlan) => void
  building: boolean
}

export default function FactoryChat({ onBuildApproved, building }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: `Hey Keith 👋 I'm your Agent Factory. Tell me what kind of agent you want to build and I'll take care of the rest.\n\nI'll work out the system prompt, tools, database schema, and required credentials — then create the GitHub repo, deploy to Vercel, and register it in your hub.\n\nWhat do you want to build?`,
  }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming || building) return
    setInput('')

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setStreaming(true)

    const res = await fetch('/api/factory/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
    })

    if (!res.ok || !res.body) {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      setStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    setMessages(p => [...p, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      const plan = parseBuildPlan(full) ?? undefined
      setMessages(p => {
        const updated = [...p]
        updated[updated.length - 1] = { role: 'assistant', content: full, plan }
        return updated
      })
    }
    setStreaming(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0',
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                : 'bg-gradient-to-br from-indigo-600 to-violet-700 rounded-full'
            )}>
              {msg.role === 'assistant' ? '✦' : 'K'}
            </div>
            <div className={cn('max-w-[75%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'px-4 py-3 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap',
                msg.role === 'assistant'
                  ? 'bg-gray-900 border border-gray-800 text-gray-300 rounded-tl-sm'
                  : 'bg-indigo-950 border border-indigo-900 text-gray-200 rounded-tr-sm'
              )}>
                {msg.content.replace(/<BUILD_PLAN>[\s\S]*?<\/BUILD_PLAN>/g, '').trim()
                  || (streaming && i === messages.length - 1 ? '▍' : '')}
              </div>
              {msg.plan && (
                <BuildPlanCard
                  plan={msg.plan}
                  onApprove={() => onBuildApproved(msg.plan!)}
                  onEdit={() => setInput('Please adjust: ')}
                  building={building}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-gray-800 bg-gray-950/50">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Describe the agent you want to build..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-600/60 resize-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming || building}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl px-4 flex items-center gap-1.5 text-white text-xs font-mono font-semibold transition-colors shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            <Send size={13} /> Send
          </button>
        </div>
        <p className="text-[10px] font-mono text-gray-700 mt-2">
          Template: Next.js 16 · Clerk · Supabase · Claude Sonnet 4.6 · Deploys to Vercel + DisplayLogicIT GitHub
        </p>
      </div>
    </div>
  )
}
