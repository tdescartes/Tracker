# Data Model

## Overview

Tracker uses PostgreSQL 16 with 11 tables across 2 migration files. All primary keys are UUID v4. Multi-tenant data isolation is enforced at the application layer via `household_id` on every query.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────────┐
│  households  │╌╌╌╌╌╌╌│        users          │
│──────────────│  1:N   │──────────────────────│
│ id           │◄──────│ household_id (FK)     │
│ name         │       │ email (UNIQUE)        │
│ currency_code│       │ password_hash         │
│ invite_code  │       │ full_name             │
│ budget_limit │       │ created_at            │
│ created_at   │       └──────────┬───────────┘
└──────┬───────┘                  │
       │                          │ 1:N
       │ 1:N                      ▼
       │              ┌───────────────────────┐
       ├─────────────►│   push_notification   │
       │              │      _tokens          │
       │              │───────────────────────│
       │              │ user_id (FK)          │
       │              │ token (UNIQUE)        │
       │              │ platform              │
       │              └───────────────────────┘
       │
       │ 1:N          ┌───────────────────────┐
       ├─────────────►│     notifications     │
       │              │───────────────────────│
       │              │ user_id (FK)          │
       │              │ title, body, type     │
       │              │ is_read, meta (JSONB) │
       │              └───────────────────────┘
       │
       │ 1:N          ┌───────────────────────┐
       ├─────────────►│      receipts         │
       │              │───────────────────────│
       │              │ household_id (FK)     │
       │              │ uploader_id (FK→users)│
       │              │ image_url, total      │
       │              │ merchant_name         │
       │              │ purchase_date         │
       │              │ raw_ocr_text          │
       │              │ processing_status     │
       │              │ is_reconciled         │
       │              └──────────┬────────────┘
       │                         │
       │ 1:N                     │ 1:N (receipt_id FK)
       │              ┌──────────▼────────────┐
       ├─────────────►│    pantry_items       │
       │              │───────────────────────│
       │              │ household_id (FK)     │
       │              │ receipt_id (FK)       │
       │              │ name, brand, category │
       │              │ location (ENUM)       │
       │              │ quantity, unit        │
       │              │ purchase_price        │
       │              │ expiration_date       │
       │              │ status (ENUM)         │
       │              │ on_shopping_list      │
       │              └───────────────────────┘
       │
       │ 1:N          ┌───────────────────────┐
       ├─────────────►│  financial_goals      │
       │              │───────────────────────│
       │              │ household_id (FK)     │
       │              │ goal_name, target     │
       │              │ saved, monthly_contrib│
       │              │ interest_rate, term   │
       │              │ linked_category       │
       │              └───────────────────────┘
       │
       │ 1:N          ┌───────────────────────┐
       ├─────────────►│  bank_transactions    │
       │              │───────────────────────│
       │              │ household_id (FK)     │
       │              │ transaction_date      │
       │              │ description, amount   │
       │              │ category              │
       │              │ is_subscription       │
       │              │ is_income             │
       │              │ linked_receipt_id (FK)│
       │              │ source, plaid_txn_id  │
       │              └───────────────────────┘
       │
       │ 1:N          ┌───────────────────────┐
       ├─────────────►│ category_overrides    │
                      │───────────────────────│
                      │ household_id (FK)     │
                      │ item_name (UNIQUE w/) │
                      │ category              │
                      └───────────────────────┘

Standalone:
┌───────────────────────┐      ┌───────────────────────┐
│   product_catalog     │      │     plaid_items       │
│───────────────────────│      │───────────────────────│
│ name                  │      │ user_id (FK→users)    │
│ default_category      │      │ item_id (Plaid)       │
│ avg_shelf_life_days   │      │ access_token          │
│ opened_shelf_life_days│      │ institution_name      │
└───────────────────────┘      │ last_synced_at        │
                               └───────────────────────┘
```

---

## Table Specifications

### households

| Column          | Type          | Constraints                    | Notes                     |
| --------------- | ------------- | ------------------------------ | ------------------------- |
| `id`            | UUID          | PK, default uuid_generate_v4() |                           |
| `name`          | VARCHAR(255)  | NOT NULL                       | e.g., "Smith Family"      |
| `currency_code` | CHAR(3)       | NOT NULL, default 'USD'        |                           |
| `invite_code`   | VARCHAR(20)   | UNIQUE                         | For household joining     |
| `budget_limit`  | NUMERIC(10,2) |                                | Default $600 in app logic |
| `created_at`    | TIMESTAMP     | NOT NULL, default NOW()        |                           |

### users

| Column          | Type         | Constraints                         | Notes            |
| --------------- | ------------ | ----------------------------------- | ---------------- |
| `id`            | UUID         | PK                                  |                  |
| `household_id`  | UUID         | FK → households, ON DELETE SET NULL |                  |
| `email`         | VARCHAR(255) | UNIQUE, NOT NULL                    | Login identifier |
| `password_hash` | VARCHAR(255) | NOT NULL                            | bcrypt hash      |
| `full_name`     | VARCHAR(100) |                                     | Display name     |
| `created_at`    | TIMESTAMP    | NOT NULL, default NOW()             |                  |

**Indexes**: `idx_users_household(household_id)`

### receipts

| Column              | Type          | Constraints                 | Notes               |
| ------------------- | ------------- | --------------------------- | ------------------- |
| `id`                | UUID          | PK                          |                     |
| `household_id`      | UUID          | FK → households, CASCADE    |                     |
| `uploader_id`       | UUID          | FK → users                  | Who scanned it      |
| `image_url`         | TEXT          | NOT NULL                    | File path or URL    |
| `merchant_name`     | VARCHAR(255)  |                             | Extracted by AI     |
| `total_amount`      | NUMERIC(10,2) |                             | Receipt total       |
| `purchase_date`     | DATE          |                             | Receipt date        |
| `raw_ocr_text`      | TEXT          |                             | Full OCR output     |
| `processing_status` | VARCHAR(50)   | NOT NULL, default 'PENDING' | PENDING → DONE      |
| `is_reconciled`     | BOOLEAN       | NOT NULL, default FALSE     | Matched to bank txn |
| `scanned_at`        | TIMESTAMP     | NOT NULL, default NOW()     |                     |

**Indexes**: `idx_receipts_household`, `idx_receipts_date`

### pantry_items

| Column             | Type          | Constraints                            | Notes                     |
| ------------------ | ------------- | -------------------------------------- | ------------------------- |
| `id`               | UUID          | PK                                     |                           |
| `household_id`     | UUID          | FK → households, CASCADE               |                           |
| `receipt_id`       | UUID          | FK → receipts, SET NULL                | Nullable (manual add)     |
| `name`             | VARCHAR(255)  | NOT NULL                               | Item display name         |
| `brand`            | VARCHAR(100)  |                                        | Optional brand            |
| `category`         | VARCHAR(100)  |                                        | Auto-categorized          |
| `location`         | ENUM          | FRIDGE / FREEZER / PANTRY              | Default PANTRY            |
| `quantity`         | NUMERIC(10,2) | NOT NULL, default 1.0                  |                           |
| `unit`             | VARCHAR(50)   |                                        | e.g., "lb", "oz"          |
| `purchase_price`   | NUMERIC(10,2) |                                        | Price tracking            |
| `purchase_date`    | DATE          |                                        | From receipt              |
| `expiration_date`  | DATE          |                                        | Auto-calculated or manual |
| `opened_date`      | DATE          |                                        | Track when opened         |
| `status`           | ENUM          | UNOPENED / OPENED / CONSUMED / TRASHED |                           |
| `on_shopping_list` | BOOLEAN       | NOT NULL, default FALSE                | Shopping list flag        |
| `created_at`       | TIMESTAMP     | NOT NULL, default NOW()                |                           |
| `updated_at`       | TIMESTAMP     | NOT NULL, default NOW()                | Auto-trigger              |

**Indexes**: `idx_pantry_household`, `idx_pantry_expiry` (partial: active items), `idx_pantry_status`
**Triggers**: `trg_pantry_updated_at` — auto-updates `updated_at`

### financial_goals

| Column                 | Type          | Constraints              | Notes                  |
| ---------------------- | ------------- | ------------------------ | ---------------------- |
| `id`                   | UUID          | PK                       |                        |
| `household_id`         | UUID          | FK → households, CASCADE |                        |
| `goal_name`            | VARCHAR(255)  | NOT NULL                 | Display name           |
| `target_amount`        | NUMERIC(12,2) | NOT NULL                 | Total cost             |
| `saved_amount`         | NUMERIC(12,2) | NOT NULL, default 0      | Current savings        |
| `monthly_contribution` | NUMERIC(10,2) | NOT NULL, default 0      | Monthly commit         |
| `deadline`             | DATE          |                          | Optional target date   |
| `is_loan`              | BOOLEAN       | NOT NULL, default FALSE  |                        |
| `interest_rate`        | NUMERIC(5,2)  |                          | Annual rate            |
| `loan_term_months`     | INT           |                          | Duration               |
| `linked_category`      | VARCHAR(100)  |                          | Budget category to cut |
| `created_at`           | TIMESTAMP     | NOT NULL, default NOW()  |                        |
| `updated_at`           | TIMESTAMP     | NOT NULL, default NOW()  | Auto-trigger           |

**Triggers**: `trg_goals_updated_at`

### bank_transactions

| Column                 | Type          | Constraints              | Notes                        |
| ---------------------- | ------------- | ------------------------ | ---------------------------- |
| `id`                   | UUID          | PK                       |                              |
| `household_id`         | UUID          | FK → households, CASCADE |                              |
| `transaction_date`     | DATE          | NOT NULL                 |                              |
| `description`          | VARCHAR(255)  | NOT NULL                 | Bank description             |
| `amount`               | NUMERIC(10,2) | NOT NULL                 | Absolute value               |
| `category`             | VARCHAR(100)  |                          | AI-assigned or bank-inferred |
| `is_subscription`      | BOOLEAN       | NOT NULL, default FALSE  | Recurring flag               |
| `is_income`            | BOOLEAN       | NOT NULL, default FALSE  | Income flag                  |
| `linked_receipt_id`    | UUID          | FK → receipts, SET NULL  | Reconciliation link          |
| `raw_description`      | TEXT          |                          | Original bank text           |
| `source`               | VARCHAR(20)   | default 'upload'         | upload / plaid / manual      |
| `plaid_transaction_id` | TEXT          | UNIQUE                   | Plaid dedup key              |
| `merchant_name`        | TEXT          |                          | Plaid merchant               |
| `pending`              | BOOLEAN       | NOT NULL, default FALSE  | Plaid pending flag           |
| `created_at`           | TIMESTAMP     | NOT NULL, default NOW()  |                              |

**Indexes**: `idx_bank_household`, `idx_bank_date`, `idx_bank_tx_plaid_id` (partial)

### product_catalog

| Column                   | Type         | Constraints          | Notes              |
| ------------------------ | ------------ | -------------------- | ------------------ |
| `id`                     | UUID         | PK                   |                    |
| `name`                   | VARCHAR(255) | NOT NULL             | Product name       |
| `default_category`       | VARCHAR(100) |                      | Built-in category  |
| `avg_shelf_life_days`    | INT          | NOT NULL, default 30 | Auto-expiry source |
| `opened_shelf_life_days` | INT          |                      | Opened expiry      |

**Indexes**: `idx_catalog_name` (GIN trigram for fuzzy search)

### category_overrides

| Column         | Type        | Constraints              | Notes                |
| -------------- | ----------- | ------------------------ | -------------------- |
| `id`           | UUID        | PK                       |                      |
| `household_id` | UUID        | FK → households, CASCADE |                      |
| `item_name`    | TEXT        | NOT NULL                 | Normalized lowercase |
| `category`     | TEXT        | NOT NULL                 | Learned category     |
| `created_at`   | TIMESTAMPTZ |                          |                      |
| `updated_at`   | TIMESTAMPTZ |                          | Auto-trigger         |

**Constraints**: UNIQUE(`household_id`, `item_name`)

### push_notification_tokens

| Column       | Type        | Constraints              | Notes           |
| ------------ | ----------- | ------------------------ | --------------- |
| `id`         | UUID        | PK                       |                 |
| `user_id`    | UUID        | FK → users, CASCADE      |                 |
| `token`      | TEXT        | UNIQUE, NOT NULL         | Expo push token |
| `platform`   | VARCHAR(10) | CHECK IN ('expo', 'web') |                 |
| `created_at` | TIMESTAMPTZ |                          |                 |
| `updated_at` | TIMESTAMPTZ |                          |                 |

### notifications

| Column       | Type        | Constraints                              | Notes          |
| ------------ | ----------- | ---------------------------------------- | -------------- |
| `id`         | UUID        | PK                                       |                |
| `user_id`    | UUID        | FK → users, CASCADE                      |                |
| `title`      | TEXT        | NOT NULL                                 |                |
| `body`       | TEXT        | NOT NULL                                 |                |
| `type`       | VARCHAR(20) | CHECK IN (info, warning, alert, success) |                |
| `is_read`    | BOOLEAN     | NOT NULL, default FALSE                  |                |
| `meta`       | JSONB       | default '{}'                             | Deep link info |
| `created_at` | TIMESTAMPTZ |                                          |                |

**Indexes**: Partial index on `(user_id, is_read) WHERE is_read = FALSE`, `(user_id, created_at DESC)`

### plaid_items

| Column             | Type        | Constraints            | Notes                 |
| ------------------ | ----------- | ---------------------- | --------------------- |
| `id`               | UUID        | PK                     |                       |
| `user_id`          | UUID        | FK → users, CASCADE    |                       |
| `item_id`          | TEXT        | UNIQUE                 | Plaid's item_id       |
| `access_token`     | TEXT        | NOT NULL               | Encrypt in production |
| `institution_name` | TEXT        | default 'Unknown Bank' |                       |
| `account_name`     | TEXT        |                        |                       |
| `last_synced_at`   | TIMESTAMPTZ |                        |                       |
| `created_at`       | TIMESTAMPTZ |                        |                       |
| `updated_at`       | TIMESTAMPTZ |                        | Auto-trigger          |

---

## Migrations

| File                      | Phase | Tables Created                                                                                       |
| ------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| `001_initial_schema.sql`  | 1     | households, users, product_catalog, receipts, pantry_items, financial_goals, bank_transactions       |
| `002_phase2_3_schema.sql` | 2–3   | push_notification_tokens, notifications, category_overrides, plaid_items + bank_transactions columns |

### Extensions

- `uuid-ossp` — UUID generation functions
- `pg_trgm` — Trigram-based fuzzy text search (product catalog)

### Triggers

| Trigger                                | Table              | Function                     |
| -------------------------------------- | ------------------ | ---------------------------- |
| `trg_pantry_updated_at`                | pantry_items       | `update_updated_at()`        |
| `trg_goals_updated_at`                 | financial_goals    | `update_updated_at()`        |
| `update_category_overrides_updated_at` | category_overrides | `update_updated_at_column()` |
| `update_plaid_items_updated_at`        | plaid_items        | `update_updated_at_column()` |
