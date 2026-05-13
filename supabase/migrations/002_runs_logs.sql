-- New columns on agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS avg_manual_minutes NUMERIC DEFAULT 5;

UPDATE agents SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- Run history
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing', 'success', 'error')),
  items_done    INT NOT NULL DEFAULT 0,
  items_total   INT NOT NULL DEFAULT 0,
  duration_ms   INT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started  ON agent_runs(started_at DESC);

-- Log entries
CREATE TABLE IF NOT EXISTS agent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  run_id     UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  level      TEXT NOT NULL DEFAULT 'info'
               CHECK (level IN ('info', 'success', 'error', 'warn')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created  ON agent_logs(created_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
