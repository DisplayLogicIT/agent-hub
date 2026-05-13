import { describe, it, expect } from 'vitest'
import { parseBuildPlan } from '@/lib/factory/prompts'

const SAMPLE = `Got it! Here's what I'll build:

<BUILD_PLAN>
NAME: vendor-po-monitor
DISPLAY_NAME: Vendor PO Monitor
ICON: 📦
CATEGORY: sourcing
DESCRIPTION: Monitors vendor email inbox and extracts purchase orders into Supabase.
AVG_MANUAL_MINUTES: 4
SYSTEM_PROMPT:
You are a purchase order extraction agent.
END_SYSTEM_PROMPT
TOOLS:
- read_email: Reads unread emails from the vendor inbox
- extract_po: Extracts PO fields from email body
- log_po: Saves extracted PO to Supabase
END_TOOLS
SCHEMA:
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL
);
END_SCHEMA
EXTRA_ENV_VARS:
- GMAIL_CLIENT_ID|Gmail OAuth client ID|required
- GMAIL_CLIENT_SECRET|Gmail OAuth client secret|required
- VENDOR_EMAIL|Email address to monitor|optional
END_EXTRA_ENV_VARS
</BUILD_PLAN>`

describe('parseBuildPlan', () => {
  it('returns null when no BUILD_PLAN tag', () => {
    expect(parseBuildPlan('hello world')).toBeNull()
  })

  it('parses all scalar fields', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.name).toBe('vendor-po-monitor')
    expect(p.displayName).toBe('Vendor PO Monitor')
    expect(p.icon).toBe('📦')
    expect(p.category).toBe('sourcing')
    expect(p.avgManualMinutes).toBe(4)
  })

  it('parses tools correctly', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.tools).toHaveLength(3)
    expect(p.tools[0]).toEqual({ name: 'read_email', description: 'Reads unread emails from the vendor inbox' })
  })

  it('parses extraEnvVars with required flag', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.extraEnvVars).toHaveLength(3)
    expect(p.extraEnvVars[0]).toEqual({ key: 'GMAIL_CLIENT_ID', description: 'Gmail OAuth client ID', required: true })
    expect(p.extraEnvVars[2].required).toBe(false)
  })

  it('parses systemPrompt', () => {
    const p = parseBuildPlan(SAMPLE)!
    expect(p.systemPrompt).toContain('purchase order extraction agent')
  })
})
