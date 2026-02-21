-- ============================================================
-- Migration 003 — AI Document Pipeline & Enhanced Financial Data
-- Tracker: PaddleOCR + Gemini integration, transaction categorization
-- Run: psql -U tracker_user -d tracker_db -f 003_ai_pipeline_schema.sql
-- ============================================================

-- ============================================================
-- Receipts — track processing method (OCR engine + structuring)
-- ============================================================
ALTER TABLE receipts
    ADD COLUMN IF NOT EXISTS processing_method VARCHAR(50) DEFAULT 'regex',
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2);

COMMENT ON COLUMN receipts.processing_method IS 'OCR+structuring method: gemini, regex, veryfi, google_vision';

-- ============================================================
-- Bank Transactions — add source tracking & better categorization
-- ============================================================
ALTER TABLE bank_transactions
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'upload'
        CHECK (source IN ('upload', 'plaid', 'manual')),
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

COMMENT ON COLUMN bank_transactions.source IS 'How transaction was imported: upload (PDF/CSV), plaid (API), manual (user entry)';

-- ============================================================
-- Document processing log — audit trail for AI pipeline runs
-- ============================================================
CREATE TABLE IF NOT EXISTS document_processing_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type   VARCHAR(20) NOT NULL CHECK (document_type IN ('receipt', 'bank_statement')),
    file_name       TEXT,
    ocr_engine      VARCHAR(30),    -- paddleocr, tesseract, veryfi, google_vision
    structuring     VARCHAR(30),    -- gemini, regex
    raw_text_length INT,
    items_extracted INT DEFAULT 0,
    processing_ms   INT,            -- Total processing time in milliseconds
    status          VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_log_household ON document_processing_log(household_id);
CREATE INDEX IF NOT EXISTS idx_doc_log_created ON document_processing_log(created_at DESC);

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracker_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracker_user;
