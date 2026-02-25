# Bank Statement AI

## Landing Page Copy

**Headline**: Upload a statement, get the full picture

**Subheadline**: Drop a PDF, CSV, or photo of your bank statement. AI extracts every transaction, detects subscriptions, and cross-references receipts — in seconds.

**Bullets**:

- **Multi-format support** — PDF, CSV, or even a photo of a paper statement. AI handles all of them
- **Subscription detection** — Automatically identifies recurring charges like Netflix, Spotify, and gym memberships
- **Receipt reconciliation** — Matches bank transactions to your scanned receipts by date and amount, closing the loop between what you bought and what was charged

**CTA**: Upload a statement →

---

## Problem Statement

Bank statements are the most complete record of spending, but they're painful to analyze. PDFs are walls of text. CSV formats vary by bank. Photo statements require OCR. And even after extraction, generic transaction descriptions like "POS PURCHASE #4521" tell you nothing about what you actually bought. Users need automated extraction that also connects bank data to receipt-level detail.

## Solution

A dual-path AI pipeline (Gemini Flash + regex fallback) that handles any bank statement format, extracts and categorizes transactions, detects recurring subscriptions, and reconciles with previously scanned receipts to create a unified spending picture.

---

## User Flow

```
1. Upload statement (PDF / CSV / photo)
         │
         ▼
2. Backend processes:
   ├── PDF → pdfplumber text extraction
   ├── CSV → format auto-detection (Chase, TD, BofA, Capital One)
   ├── Photo → PaddleOCR → text extraction
   │         │
   │         ▼
   ├── Gemini Flash structures transactions as JSON
   └── Regex fallback if AI unavailable
         │
         ▼
3. Results returned:
   ├── Transaction count imported
   ├── Bank name detected
   ├── Parsing method used (gemini / regex)
   ├── Subscriptions detected (name + amount)
   └── Deduplication report (skipped duplicates)
         │
         ▼
4. Transactions appear in list:
   ├── Category-filtered view
   ├── Income/expense summary
   ├── Source badges (upload / plaid / manual)
   └── Matched/unmatched receipt indicators
         │
         ▼
5. Optional: Reconcile
   └── Auto-matches bank txns to receipts by date ±1 day & amount ±$0.50
```

---

## Technical Implementation

### Parsing Pipeline

**Gemini Flash path** (primary):

- Raw text sent to Gemini with structured JSON schema for transactions
- Self-correction retry loop (3 attempts) for JSON parsing errors
- Returns: `[{date, description, amount, category, is_income}]`

**Regex path** (fallback):

| Format            | Detection                                       | Pattern                           |
| ----------------- | ----------------------------------------------- | --------------------------------- |
| PDF               | pdfplumber text extraction                      | Date + description + amount regex |
| CSV (Chase)       | "Transaction Date,Post Date,Description" header | Standard column mapping           |
| CSV (TD Bank)     | "Date,Description,Debit,Credit" header          | Debit/Credit split columns        |
| CSV (BofA)        | "Date,Description,Amount" header                | Signed amount column              |
| CSV (Capital One) | "Transaction Date,Posted Date" header           | Debit/Credit columns              |

**Noise filtering**: Balance lines, account numbers, page headers, and footer text are automatically stripped from PDF parsing.

### Transaction Processing

Each extracted transaction is:

1. **Deduplicated**: Checked against existing transactions by `(household_id, transaction_date, description, amount)` composite. Exact matches are skipped.
2. **Categorized**: Gemini assigns categories, or the bank parser infers from keywords.
3. **Subscription detection**: Description matched against known subscription patterns:
   - Default list: Netflix, Spotify, Hulu, Disney+, Amazon Prime, Apple, Google, YouTube, Gym, Planet Fitness, Adobe, Microsoft, Dropbox, iCloud, AT&T, Verizon, T-Mobile, Comcast, Insurance
   - Configurable via `KNOWN_SUBSCRIPTIONS` env var (comma-separated)
4. **Income detection**: Transactions matching income patterns (payroll, direct deposit, salary, refund) flagged as `is_income`.

### Reconciliation Engine

The `/api/bank/reconcile` endpoint matches bank transactions to receipts:

```
For each unmatched bank transaction:
  Find receipts where:
    |receipt.purchase_date - transaction.date| ≤ 1 day
    AND
    |receipt.total_amount - |transaction.amount|| ≤ $0.50

  If match found:
    transaction.linked_receipt_id = receipt.id
    receipt.is_reconciled = true
```

This creates a bridge between the "what was charged" (bank) and "what was bought" (receipt) views.

---

## Platform Behavior

### Web

- **Upload**: Drag-and-drop zone for PDF/CSV + image upload button
- **Progress**: Elapsed-time messages during AI processing
- **Results card**: Transaction count, bank name, parsing method, subscription list
- **Transaction list**: Category color dots, amount (red/green), matched/recurring badges
- **Plaid integration**: Connect bank accounts for automatic transaction sync (web only)
- **Loading**: `TransactionsSkeleton` — upload area + 6 transaction row placeholders

### Mobile

- **Upload**: Two buttons — "📄 PDF/CSV" (document picker) + "📸 Photo" (image picker)
- **Processing UI**: ActivityIndicator with "AI is analyzing…" text
- **Results**: Same card format with subscription detection display
- **Transaction list**: Category filter pills, expense/income/count summary row
- **Reconcile**: "Match Receipts" button
- **Loading**: `TransactionsSkeleton` — animated pulse skeleton

---

## API Endpoints

| Method | Path                         | Rate Limit | Description                         |
| ------ | ---------------------------- | ---------- | ----------------------------------- |
| POST   | `/api/bank/upload-statement` | 5/min      | Upload and parse bank statement     |
| GET    | `/api/bank/transactions`     | —          | List transactions (latest 200)      |
| POST   | `/api/bank/reconcile`        | —          | Auto-match transactions to receipts |

---

## Plaid Integration (Web Only)

For users who prefer automatic bank sync over manual uploads:

| Method | Path                         | Description                            |
| ------ | ---------------------------- | -------------------------------------- |
| POST   | `/api/plaid/link-token`      | Create Plaid Link widget token         |
| POST   | `/api/plaid/exchange-token`  | Exchange public token for access token |
| GET    | `/api/plaid/linked-items`    | List connected bank accounts           |
| POST   | `/api/plaid/sync`            | Pull latest transactions from Plaid    |
| DELETE | `/api/plaid/items/{item_id}` | Disconnect a bank account              |

Plaid transactions are normalized to the same format as uploaded transactions (`source: "plaid"` vs `source: "upload"`), deduplicated by `plaid_transaction_id`, and automatically categorized using Plaid's category taxonomy.

---

## Connected Features

| Trigger                | Effect                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Statement uploaded     | Transactions added, estimated spending updates in budget    |
| Subscriptions detected | Flagged in transaction list + counted in report card        |
| Reconciliation         | Matched txns move from "estimated" to "confirmed" in budget |
| Income detected        | Report card income total updates                            |
| Category data          | Budget category breakdown updates                           |
