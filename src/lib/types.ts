export interface Agent {
  id: string
  owner_id: string
  name: string
  slug: string | null
  description: string | null
  tags: string[] | null
  icon: string | null
  category: string | null
  github_repo_url: string | null
  vercel_url: string | null
  vercel_project_id: string | null
  shared_db_schema: string | null
  status: 'pending' | 'active' | 'inactive' | 'error'
  avg_manual_minutes: number
  created_at: string
  updated_at: string
  file_count?: number
}

export interface AgentRun {
  id: string
  agent_id: string
  status: 'processing' | 'success' | 'error'
  items_done: number
  items_total: number
  duration_ms: number | null
  started_at: string
  completed_at: string | null
}

export interface AgentLog {
  id: string
  agent_id: string
  run_id: string | null
  level: 'info' | 'success' | 'error' | 'warn'
  message: string
  created_at: string
}

export interface AgentFile {
  id: string
  agent_id: string
  filename: string
  storage_path: string
  file_size: number | null
  created_at: string
}

export interface ShareToken {
  id: string
  token: string
  agent_ids: string[]
  created_by: string
  expires_at: string | null
  created_at: string
}

export interface BuildPlan {
  name: string
  displayName: string
  icon: string
  category: string
  description: string
  systemPrompt: string
  tools: Array<{ name: string; description: string }>
  schema: string
  extraEnvVars: Array<{ key: string; description: string; required: boolean }>
  avgManualMinutes: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: BuildPlan
}

export interface AgentDraft {
  id: string
  plan: BuildPlan
  messages: ChatMessage[]
  status: 'plan-ready' | 'building' | 'built' | 'failed'
  build_log: string[]
  error_message: string | null
  agent_id: string | null
  created_at: string
  updated_at: string
}
