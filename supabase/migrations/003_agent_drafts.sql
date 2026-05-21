CREATE TABLE IF NOT EXISTS agent_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan            JSONB NOT NULL,
  messages        JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'plan-ready'
                    CHECK (status IN ('plan-ready','building','built','failed')),
  build_log       TEXT[] NOT NULL DEFAULT '{}',
  error_message   TEXT,
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_drafts_status     ON agent_drafts(status);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_updated_at ON agent_drafts(updated_at DESC);
