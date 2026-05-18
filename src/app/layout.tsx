import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agent Hub — Display Logic IT',
  description: 'Your AI agent command center',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: recentAgents } = await supabase
    .from('agents')
    .select('id, name, icon, category')
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="h-full flex text-white">
          <Sidebar recentAgents={recentAgents ?? []} />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
