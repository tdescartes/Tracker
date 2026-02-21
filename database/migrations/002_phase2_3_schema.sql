-- ============================================================
-- Migration 002 — Phase 2 & 3 Schema
-- Tracker: Notifications, Category Learning, Plaid Integration
-- Run: psql -U tracker_user -d tracker_db -f 002_phase2_3_schema.sql
-- ============================================================

-- ============================================================
-- Push notification tokens (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    platform    VARCHAR(10) NOT NULL DEFAULT 'expo' CHECK (platform IN ('expo', 'web')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_notification_tokens(user_id);

-- ============================================================
-- In-app notifications store (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert', 'success')),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    meta        JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC);

-- ============================================================
-- AI Auto-categorization overrides (Phase 2)
-- Stores household-specific item-name → category learned mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS category_overrides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    item_name       TEXT NOT NULL,                          -- Normalized lowercase
    category        TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (household_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_category_overrides_household
    ON category_overrides(household_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER update_category_overrides_updated_at
    BEFORE UPDATE ON category_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Plaid linked bank items (Phase 3)
-- access_token is encrypted at rest in production
-- ============================================================
CREATE TABLE IF NOT EXISTS plaid_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id             TEXT NOT NULL UNIQUE,               -- Plaid's item_id
    access_token        TEXT NOT NULL,                      -- Plaid access token (encrypt in prod)
    institution_name    TEXT NOT NULL DEFAULT 'Unknown Bank',
    account_name        TEXT,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user ON plaid_items(user_id);

CREATE OR REPLACE TRIGGER update_plaid_items_updated_at
    BEFORE UPDATE ON plaid_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Add plaid_transaction_id to bank_transactions if not exists
-- (for Plaid dedup during sync — Phase 3)
-- ============================================================
ALTER TABLE bank_transactions
    ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS merchant_name TEXT,
    ADD COLUMN IF NOT EXISTS pending BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bank_tx_plaid_id
    ON bank_transactions(plaid_transaction_id)
    WHERE plaid_transaction_id IS NOT NULL;

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracker_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracker_user;
