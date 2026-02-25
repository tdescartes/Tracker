# Price & Inflation Tracker

## Landing Page Copy

**Headline**: Track how prices change over time

**Subheadline**: Search any item you've bought before and see its price history across every receipt. A sparkline chart shows whether you're paying more or less than last month — with no extra data entry.

**Bullets**:
- **Automatic price history** — Every receipt scan builds a price database. No manual tracking needed
- **Sparkline visualization** — See price trends at a glance with a compact line chart
- **Percentage change** — Instant "up 12% since January" indicators so you know where inflation hits your wallet hardest

**CTA**: Check your prices →

---

## Problem Statement

Consumers feel inflation but can't measure it at the household level. National CPI numbers don't reflect *your* grocery store, *your* brands, *your* buying patterns. Without per-item price tracking, you can't tell if milk really went up or if you switched to a more expensive brand.

## Solution

An item-level price tracker built automatically from scanned receipts. Every time a pantry item is created from a receipt, its `purchase_price` and `purchase_date` are stored. The inflation endpoint aggregates these into a time series, showing average price per date for any searched item.

---

## Technical Implementation

### How It Works

```
Receipt scanned → Items extracted → Each PantryItem gets:
  - purchase_price (from receipt line items)
  - purchase_date (from receipt header)
  - household_id (from user)

Later, user searches "milk":
  → Query pantry_items WHERE name ILIKE '%milk%'
  → GROUP BY purchase_date
  → AVG(purchase_price) per date
  → ORDER BY date ASC
  → Return time series
```

### Query

```sql
SELECT purchase_date, AVG(purchase_price) AS avg_price
FROM pantry_items
WHERE household_id = :hid
  AND name ILIKE '%{item_name}%'
  AND purchase_price IS NOT NULL
GROUP BY purchase_date
ORDER BY purchase_date ASC
```

The `ILIKE` match is intentionally fuzzy — searching "milk" will match "Whole Milk", "2% Milk", "Oat Milk", etc. This gives a view across brands and variants.

### Response Shape

```json
[
  { "date": "2025-10-15", "avg_price": 3.49 },
  { "date": "2025-11-02", "avg_price": 3.69 },
  { "date": "2025-12-18", "avg_price": 3.99 },
  { "date": "2026-01-22", "avg_price": 3.79 },
  { "date": "2026-02-10", "avg_price": 4.09 }
]
```

### Client-Side Calculations

The frontend computes from the response:

```
first_price = data[0].avg_price       // 3.49
last_price = data[data.length - 1].avg_price  // 4.09

change = last_price - first_price     // +0.60
change_pct = (change / first_price) × 100  // +17.2%
```

Displayed as: **"Milk: $4.09 — up 17.2% since October 2025"**

---

## Platform Behavior

### Web
- **Search input**: Text field in budget page, debounced search
- **Results**: Sparkline chart (Recharts `<LineChart>`) + price summary
- **Badge**: Green (price down) or red (price up) percentage indicator
- **Empty state**: "Search an item to see its price history"

### Mobile
- **Search**: Text input with "Search" button
- **Results**: Compact sparkline + price points
- **Loading**: Skeleton placeholder while fetching

---

## API Endpoint

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/api/budget/inflation/{item_name}` | Path param: item name | Price history time series |

---

## Data Source

This feature requires **no additional data entry**. It piggybacks entirely on receipt scanning:

```
Receipt scan → OCR → Gemini → Line items → PantryItem records
  └── purchase_price ← line item price
  └── purchase_date  ← receipt date
  └── name           ← item name (searchable)
```

The more receipts scanned over time, the richer the price history becomes. This creates a natural incentive to keep scanning receipts — each scan improves the price intelligence.

---

## Connected Features

| Trigger | Effect |
|---------|--------|
| Receipt scanned | New price data points added |
| Multiple receipts over time | Trend line becomes meaningful |
| Price increase detected | Budget insight could reference inflation |
| Item searched | Historical comparison across all purchases |
