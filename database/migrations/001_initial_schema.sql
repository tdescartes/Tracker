-- homebase/database/migrations/001_initial_schema.sql
-- Run this against a fresh PostgreSQL database:
--   psql -U postgres -d homebase_db -f 001_initial_schema.sql

-- ─── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy item name search later


-- ─── Households ────────────────────────────────────────────────────────────
CREATE TABLE households (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ─── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id   UUID REFERENCES households(id) ON DELETE SET NULL,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(100),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_household ON users(household_id);


-- ─── Product Catalog (Shared Master List) ──────────────────────────────────
CREATE TABLE product_catalog (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                  VARCHAR(255) NOT NULL,
    default_category      VARCHAR(100),
    avg_shelf_life_days   INT NOT NULL DEFAULT 30,
    opened_shelf_life_days INT
);
CREATE INDEX idx_catalog_name ON product_catalog USING gin(name gin_trgm_ops);


-- ─── Receipts ──────────────────────────────────────────────────────────────
CREATE TABLE receipts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    uploader_id       UUID NOT NULL REFERENCES users(id),
    image_url         TEXT NOT NULL,
    merchant_name     VARCHAR(255),
    total_amount      NUMERIC(10, 2),
    purchase_date     DATE,
    raw_ocr_text      TEXT,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    is_reconciled     BOOLEAN NOT NULL DEFAULT FALSE,
    scanned_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receipts_household ON receipts(household_id);
CREATE INDEX idx_receipts_date ON receipts(purchase_date);


-- ─── Pantry Inventory ──────────────────────────────────────────────────────
CREATE TYPE pantry_status AS ENUM ('UNOPENED', 'OPENED', 'CONSUMED', 'TRASHED');
CREATE TYPE pantry_location AS ENUM ('FRIDGE', 'FREEZER', 'PANTRY');

CREATE TABLE pantry_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    receipt_id       UUID REFERENCES receipts(id) ON DELETE SET NULL,
    name             VARCHAR(255) NOT NULL,
    brand            VARCHAR(100),
    category         VARCHAR(100),
    location         pantry_location NOT NULL DEFAULT 'PANTRY',
    quantity         NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
    unit             VARCHAR(50),
    purchase_price   NUMERIC(10, 2),
    purchase_date    DATE,
    expiration_date  DATE,
    opened_date      DATE,
    status           pantry_status NOT NULL DEFAULT 'UNOPENED',
    on_shopping_list BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pantry_household ON pantry_items(household_id);
CREATE INDEX idx_pantry_expiry    ON pantry_items(expiration_date) WHERE status IN ('UNOPENED', 'OPENED');
CREATE INDEX idx_pantry_status    ON pantry_items(household_id, status);


-- ─── Financial Goals ───────────────────────────────────────────────────────
CREATE TABLE financial_goals (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    goal_name            VARCHAR(255) NOT NULL,
    target_amount        NUMERIC(12, 2) NOT NULL,
    saved_amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    monthly_contribution NUMERIC(10, 2) NOT NULL DEFAULT 0,
    deadline             DATE,
    is_loan              BOOLEAN NOT NULL DEFAULT FALSE,
    interest_rate        NUMERIC(5, 2),
    loan_term_months     INT,
    linked_category      VARCHAR(100),
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ─── Bank Transactions ─────────────────────────────────────────────────────
CREATE TABLE bank_transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description      VARCHAR(255) NOT NULL,
    amount           NUMERIC(10, 2) NOT NULL,
    category         VARCHAR(100),
    is_subscription  BOOLEAN NOT NULL DEFAULT FALSE,
    is_income        BOOLEAN NOT NULL DEFAULT FALSE,
    linked_receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
    raw_description  TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bank_household ON bank_transactions(household_id);
CREATE INDEX idx_bank_date      ON bank_transactions(transaction_date);


-- ─── Trigger: auto-update pantry updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pantry_updated_at
BEFORE UPDATE ON pantry_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_goals_updated_at
BEFORE UPDATE ON financial_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
