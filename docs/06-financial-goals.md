# Financial Goals

## Landing Page Copy

**Headline**: Plan every purchase before it happens

**Subheadline**: Set savings goals for anything — a car, a vacation, an emergency fund. See two strategies side by side: save in cash, or finance with a loan. AI tells you exactly when you'll get there.

**Bullets**:
- **Dual strategy calculator** — Compare "save and buy" vs "finance now" with real amortization math. Know the true cost of both paths before deciding
- **Surplus integration** — See your monthly surplus after expenses and move it to any goal with one tap
- **Smart insight engine** — "If you cut discretionary spending by $75/month, you reach this goal 4 months sooner — by March 2027"

**CTA**: Start planning →

---

## Problem Statement

People set vague savings goals ("save for a car") without knowing when they'll actually get there, how much they need to set aside monthly, or whether financing makes more sense. Most budgeting apps track spending but don't help you plan forward. Users need a tool that takes a target amount and turns it into a concrete timeline with actionable insights.

## Solution

A goal planner that accepts any target purchase, calculates two strategies (cash save vs. loan finance), projects completion dates, and generates plain-English "what if" insights using actual spending data. Goals are household-scoped so partners track shared targets together.

---

## User Flow

```
1. Tap "Add Goal"
         │
         ▼
2. Enter details:
   ├── Goal name (e.g., "Toyota Camry")
   ├── Target amount ($28,000)
   ├── Amount already saved ($5,000)
   ├── Monthly contribution ($400)
   ├── Optional: loan interest rate (5.25%)
   ├── Optional: loan term (60 months)
   └── Optional: deadline
         │
         ▼
3. Dual strategy calculated instantly:
   ├── Cash strategy: 58 months → October 2030
   └── Loan strategy: $435.89/mo, $3,153 total interest
         │
         ▼
4. Insight generated:
   "If you reduce discretionary spending by $60/month,
    you reach this goal 11 months sooner — by November 2029."
         │
         ▼
5. Goal appears on dashboard:
   ├── Progress bar (saved / target)
   ├── Months remaining
   ├── Completion date
   └── Edit / Delete
```

---

## Technical Implementation

### Data Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `household_id` | UUID | FK → households |
| `goal_name` | VARCHAR(255) | Display name |
| `target_amount` | DECIMAL(12,2) | Total cost |
| `saved_amount` | DECIMAL(12,2) | Current savings |
| `monthly_contribution` | DECIMAL(10,2) | Monthly savings commitment |
| `deadline` | DATE | Optional target date |
| `is_loan` | BOOLEAN | Whether loan strategy applies |
| `interest_rate` | DECIMAL(5,2) | Annual loan rate (e.g., 5.25) |
| `loan_term_months` | INTEGER | Loan duration in months |
| `linked_category` | VARCHAR(100) | Budget category to suggest cutting |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-updated on change |

### Financial Calculator

The `calculate_goal()` function runs on every read and write, so goal projections are always current.

**Cash Strategy**:
```
principal = target_amount - saved_amount
months_to_wait = ⌈principal / monthly_contribution⌉
completion_date = today + months_to_wait months
```

**Loan Strategy** (standard amortization):
```
r = (interest_rate / 100) / 12       # Monthly rate
n = loan_term_months

monthly_payment = principal × (r × (1 + r)^n) / ((1 + r)^n - 1)
total_interest  = (monthly_payment × n) - principal
```

**Insight Generator**:
```
insight_cut = max($25, min($200, monthly_contribution × 0.15))
accelerated_monthly = monthly_contribution + insight_cut
accelerated_months = ⌈principal / accelerated_monthly⌉
time_saved = months_to_wait - accelerated_months

Output: "If you reduce discretionary spending by $[cut]/month,
         you reach this goal [time_saved] month(s) sooner —
         by [accelerated_completion_date]."
```

The cut amount scales with contribution size (15% of monthly, clamped to $25–$200) so insights feel proportionate regardless of goal size.

### Surplus Integration

The `/api/budget/surplus/{year}/{month}` endpoint feeds directly into goal planning:

```
surplus = income - total_expenses

top_cuttable = non-essential categories sorted by amount
  → excludes: Housing, Utilities, Insurance, Medical
  → returns: category, amount, % of expenses
```

This powers the "where can I find extra money?" view, letting users identify spending they could redirect toward goals.

---

## Platform Behavior

### Web
- **Goal cards**: Grid layout, each card shows progress bar, dual strategy comparison, insight text
- **Add/Edit**: Modal form with all fields, live preview of calculations
- **Surplus panel**: Separate section showing monthly surplus + cuttable categories
- **Loading**: `GoalsSkeleton` — 3 card placeholders with pulsing lines

### Mobile
- **Goal cards**: Vertical scroll list with expandable detail sections
- **Add**: Full-screen form with keyboard-aware scroll
- **Progress**: Circular progress indicator with percentage
- **Haptics**: Success haptic on goal creation, notification on milestone dates

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals/` | List all household goals (with live calculations) |
| POST | `/api/goals/` | Create a new goal |
| PATCH | `/api/goals/{id}` | Update goal fields |
| DELETE | `/api/goals/{id}` | Remove a goal |
| GET | `/api/budget/surplus/{year}/{month}` | Get monthly surplus + cuttable categories |

---

## Response Shape

Each goal returned includes computed fields that are **not stored in the database** — they're calculated fresh on every request:

| Field | Source | Description |
|-------|--------|-------------|
| `months_to_goal` | Calculated | Months to fully save in cash |
| `estimated_completion` | Calculated | Projected completion date |
| `monthly_loan_payment` | Calculated | Amortized monthly payment |
| `total_interest` | Calculated | Lifetime interest cost |
| `insight` | Generated | Plain-English savings advice |

---

## Connected Features

| Trigger | Effect |
|---------|--------|
| Goal created/updated | WebSocket `goal_updated` event to household |
| Surplus endpoint called | Uses bank transaction income & expenses |
| Insight generated | References discretionary spending from budget data |
| Receipt scanned | Updates expense totals → changes surplus calculation |
