import { SignUp } from '@clerk/nextjs'
import { Bot } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <span className="font-semibold text-base text-white tracking-tight">
              Agent<span className="text-indigo-400">Hub</span>
            </span>
            <p className="text-[10px] font-mono text-gray-600">Display Logic IT</p>
          </div>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
