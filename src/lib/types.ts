export interface Agent {
  id: string
  owner_id: string
  name: string
  description: string | null
  tags: string[] | null
  icon: string | null
  category: string | null
  github_repo_url: string | null
  vercel_url: string | null
  shared_db_schema: string | null
  status: string
  created_at: string
  updated_at: string
  file_count?: number
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
