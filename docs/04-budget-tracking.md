# Budget Pulse

## Landing Page Copy

**Headline**: See where every dollar goes

**Subheadline**: Dual-source budget tracking that combines receipt data with bank statements — showing confirmed spending, estimated spending, daily pace, and category breakdowns in real time.

**Bullets**:

- **Confirmed + Estimated** — Receipt-verified spending shown separately from unmatched bank transactions, so you know exactly what's verified
- **Daily pace tracking** — See if you're on track or over-spending relative to your monthly budget and remaining days
- **Category intelligence** — Spending breakdown by category with visual progress bars and month-over-month comparison

**CTA**: Track your budget →

---

## Problem Statement

Traditional budgeting apps rely on a single data source — either manual entry, bank feeds, or receipt totals. None of them distinguish between verified spending (where you know exactly what was bought) and estimated spending (where you only have a transaction line item). Users can't tell which parts of their budget are accurate vs. approximated.

## Solution

A dual-source budget engine that treats receipt-confirmed spending and unmatched bank transactions as separate confidence tiers. The budget view stacks both visually (like a two-tone progress bar), calculates daily spending pace, and surfaces month-over-month category trends.

---

## Core Concepts

### Dual-Source Spending Model

```
Total Spent = Confirmed (receipts) + Estimated (unmatched bank txns)

┌──────────────────────────────────────────────────────────┐
│  Budget Progress Bar                                      │
│  ██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ├── Confirmed ──┤ Estimated ┤                            │
│  │  (solid color) (lighter)  │     Remaining budget       │
└──────────────────────────────────────────────────────────┘
```

- **Confirmed**: Sum of all receipt-confirmed items for the month. These have item-level detail.
- **Estimated**: Sum of bank transactions not linked to any receipt. Less detail, but still categorized.
- **Budget limit**: Household-configurable monthly ceiling (default $600).

### Pace Tracking

```
daily_pace = total_spent / day_of_month
expected_pace = budget_limit / days_in_month
on_track = daily_pace ≤ expected_pace
days_left = days_in_month - day_of_month
daily_remaining = (budget_limit - total_spent) / days_left
```

The UI shows:

- ✓ On track / ⚠ Over pace indicator
- $/day current pace
- $/day remaining budget

### Category Breakdown

Spending is grouped by category with two sources:

- **Receipt categories**: Item-level categorization (Produce, Dairy, Meat, etc.)
- **Bank categories**: Transaction-level categorization (Groceries, Dining, Transport, etc.)

Both are displayed with color-coded progress bars showing percentage of total budget.

---

## Budget Summary Calculation

The `/api/budget/summary/{year}/{month}` endpoint computes:

| Field                     | Source     | Calculation                                                   |
| ------------------------- | ---------- | ------------------------------------------------------------- |
| `confirmed_spent`         | Receipts   | Sum of confirmed receipt totals for month                     |
| `estimated_spent`         | Bank txns  | Sum of unmatched (no linked_receipt_id) expense transactions  |
| `total_spent`             | Both       | confirmed + estimated                                         |
| `budget_limit`            | Household  | Configurable limit (default $600)                             |
| `by_category`             | Receipts   | Pantry item prices grouped by category                        |
| `bank_category_breakdown` | Bank txns  | Transaction amounts grouped by category                       |
| `waste_cost`              | Pantry     | Sum of purchase_price × quantity for TRASHED items this month |
| `daily_pace`              | Calculated | total_spent / day_of_month                                    |
| `on_track`                | Calculated | daily_pace ≤ (budget_limit / days_in_month)                   |

---

## Monthly Report Card

The `/api/budget/report-card/{year}/{month}` endpoint generates:

| Field                       | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `total_income`              | Sum of `is_income` bank transactions            |
| `total_expenses`            | Sum of non-income bank transactions             |
| `net`                       | income − expenses                               |
| `vs_last_month`             | Percentage change from previous month           |
| `biggest_category`          | Highest-spending category                       |
| `biggest_increase_category` | Category with largest month-over-month increase |
| `subscription_total`        | Sum of `is_subscription` transactions           |
| `subscription_count`        | Count of subscription transactions              |
| `surplus`                   | income − expenses (if positive)                 |

---

## Waste Tracking

When a pantry item is marked as `TRASHED`, its `purchase_price × quantity` is counted as waste cost:

```
waste_cost = Σ (purchase_price × quantity) for all TRASHED items this month
```

This appears in:

- Budget summary as "Food waste: $X.XX"
- Home screen "This Week" stats
- AI insights (if waste exceeds a threshold)

---

## Platform Behavior

### Web

- **Month navigation**: ◀ / ▶ arrows to browse months
- **Budget limit control**: Adjustable from budget view
- **Spending card**: Stacked progress bar (confirmed solid + estimated lighter)
- **Category chart**: Recharts PieChart + list with progress bars
- **Report card**: Expandable card with income/expenses/net/subscriptions
- **Loading**: `BudgetSkeleton` — stat card + category bar placeholders

### Mobile

- **Month navigation**: ◀ / ▶ tap buttons
- **Spending card**: Same stacked progress bar pattern using RN Views
- **Category breakdown**: Color-coded bars with amount + percentage
- **Pace indicator**: On-track badge with daily rate
- **Haptics**: Selection feedback on month navigation
- **Loading**: `BudgetSkeleton` — animated pulse skeleton

---

## API Endpoints

| Method | Path                                     | Description                                        |
| ------ | ---------------------------------------- | -------------------------------------------------- |
| GET    | `/api/budget/summary/{year}/{month}`     | Complete budget summary with dual-source breakdown |
| GET    | `/api/budget/report-card/{year}/{month}` | Monthly financial report card                      |
| GET    | `/api/budget/surplus/{year}/{month}`     | Surplus analysis for goal funding                  |
| GET    | `/api/budget/inflation/{item_name}`      | Price history for inflation tracking               |

---

## Connected Features

| Trigger                 | Effect                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| Receipt confirmed       | Confirmed spending increases, category breakdown updates            |
| Bank statement uploaded | Estimated spending increases, report card updates                   |
| Reconciliation          | Matched bank txns removed from estimated, confirmed total unchanged |
| Item trashed            | Waste cost increases in budget summary                              |
| Budget changes          | Daily pace recalculated, insights regenerated                       |
| Surplus detected        | Goal funding suggestions appear on Goals tab                        |
