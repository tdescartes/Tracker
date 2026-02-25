# AI Receipt Scanner

## Landing Page Copy

**Headline**: Scan receipts, skip the data entry

**Subheadline**: Point your camera at any grocery receipt. AI extracts every item, price, and category — then updates your pantry and budget in one tap.

**Bullets**:

- **PaddleOCR + Gemini Flash** — On-device text extraction paired with LLM structuring means receipts parse in seconds, not minutes
- **Edit before you commit** — Review extracted items, fix any errors, adjust categories. Nothing saves until you confirm
- **One scan updates everything** — Pantry inventory, budget tracking, category learning, and recipe suggestions all react to a single confirmed receipt

**CTA**: Start scanning →

---

## Problem Statement

Manually logging groceries is tedious enough that nobody does it consistently. Existing receipt scanner apps either require manual correction for every item or only track totals without individual item detail. Users need item-level extraction that also feeds into pantry tracking and budgeting — not just a digital copy of the receipt.

## Solution

A three-stage pipeline — OCR → AI structuring → user confirmation — that extracts individual items with prices, quantities, and categories from any grocery receipt photo, then cascades the confirmed data into pantry inventory, budget calculations, and recipe matching.

---

## User Flow

```
1. User taps "Scan" (mobile camera / web file upload)
         │
         ▼
2. Image uploaded → backend processes:
   ├── PaddleOCR extracts raw text
   ├── Gemini Flash structures into JSON (merchant, date, items[])
   └── Regex fallback if AI unavailable
         │
         ▼
3. Review screen shows editable results:
   ├── Merchant name, purchase date, total
   └── Item list: name, price, quantity, category (editable)
         │
         ▼
4. User confirms → backend:
   ├── Creates pantry items with auto-expiration dates
   ├── Learns category overrides for future scans
   ├── Updates budget calculations
   └── Broadcasts WebSocket event to household
         │
         ▼
5. Post-confirm nudge card:
   ├── "X items added to pantry"
   ├── Budget progress update
   └── AI insight (if available)
```

---

## Technical Implementation

### OCR Pipeline

**Text extraction chain** (try in order, use first success):

| Stage | Engine        | Best For                          | Speed  |
| ----- | ------------- | --------------------------------- | ------ |
| 1     | pdfplumber    | Digital PDFs with selectable text | ~100ms |
| 2     | PaddleOCR 3.0 | Scanned documents, photos         | ~2-5s  |
| 3     | Tesseract     | Last-resort fallback              | ~3-8s  |

PaddleOCR runs as a **singleton** — the ~100MB model loads once on first use and persists for the server lifetime. A dedicated thread pool (2 workers) prevents CPU-bound OCR from blocking the async event loop.

### AI Structuring (Gemini Flash)

The raw OCR text is sent to Gemini with a structured prompt requesting JSON output:

```
Receipt fields: merchant_name, purchase_date, total_amount
Items array: name, price, quantity, category
```

**Self-correction loop**: If JSON parsing fails, the error message is appended to the conversation and Gemini retries (up to 3 attempts). This handles edge cases where the model outputs markdown-wrapped JSON or incomplete arrays.

A separate thread pool (2 workers) handles Gemini calls to isolate network I/O from OCR processing.

### Regex Fallback

When Gemini is unavailable (no API key, quota exceeded, or all retries fail), a regex-based parser extracts:

- **Merchant**: First substantial text line
- **Date**: Multi-format pattern matching (MM/DD/YYYY, YYYY-MM-DD, Mon DD, YYYY, etc.)
- **Items**: Lines ending with a price pattern (`$X.XX` or `X.XX`)
- **Total**: Line containing "total" keyword + price

### Auto-Categorization (3-Tier)

When items are confirmed, each item's category is resolved:

1. **Household overrides** (learned): Check `category_overrides` table for this household's previous mapping of the item name
2. **Built-in keyword map**: 40+ keywords across 10 categories (e.g., "milk" → Dairy, "chicken" → Meat)
3. **Fallback**: "Uncategorized"

On confirmation, new item→category mappings are saved (upsert) for future scans. This means the system gets smarter per household over time.

### Auto-Expiration Dates

Each confirmed pantry item receives an automatic expiration date based on its category:

| Category  | Default Shelf Life |
| --------- | ------------------ |
| Dairy     | 7 days             |
| Produce   | 5 days             |
| Meat      | 3 days             |
| Bakery    | 4 days             |
| Frozen    | 90 days            |
| Snacks    | 60 days            |
| Drinks    | 30 days            |
| Household | 365 days           |
| Other     | 30 days            |

---

## Platform Behavior

### Web

- **Upload method**: Drag-and-drop zone (react-dropzone) accepting JPG, PNG, PDF
- **Upload UX**: Elapsed-time progress messages ("Extracting text…", "AI is structuring…")
- **Review**: Inline editable table with category dropdowns
- **History**: Expandable receipt cards with item list and reconciliation status

### Mobile

- **Upload method**: Camera capture or photo library (expo-image-picker)
- **Upload UX**: Full-screen scanning indicator with haptic feedback on start/complete
- **Review**: Scrollable card list with inline text inputs
- **Tab structure**: Scan tab / History tab

---

## API Endpoints

| Method | Path                         | Description                                               |
| ------ | ---------------------------- | --------------------------------------------------------- |
| POST   | `/api/receipts/upload`       | Upload receipt image, returns parsed items (rate: 5/min)  |
| POST   | `/api/receipts/{id}/confirm` | Confirm edited items → creates pantry + learns categories |
| GET    | `/api/receipts/`             | List receipt history (latest 50)                          |

---

## Processing Telemetry

Every scan is logged to `document_processing_log`:

- File name, document type (receipt/bank), processing method (gemini/regex)
- Success/failure, processing duration in ms, error message if failed

This enables monitoring AI pipeline health and regression detection.
