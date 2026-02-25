# AI Insights & Chat

## Landing Page Copy

**Headline**: Your finances explained in plain English

**Subheadline**: Contextual nudges appear right where you need them — on the dashboard, in pantry, on your goals page. Need more detail? Ask the AI chat anything about your spending, food waste, or savings progress.

**Bullets**:
- **Contextual nudges** — "Budget running hot: $480 of $600 spent (80%). At this pace you'll hit $720 by month-end." Appears in real-time on the screens where the data lives
- **Category trend detection** — "Dining Out is up 35% vs last month ($120 → $162)." Spots changes you might not notice scrolling through transactions
- **AI chat** — Ask "What should I cut to save $200?" and get an answer grounded in *your* actual spending data, not generic advice

**CTA**: See your insights →

---

## Problem Statement

Dashboards show numbers. Numbers don't tell stories. Users see "$480 spent this month" but don't know if that's good or bad, what's driving it, or what to do about it. They need a system that interprets their data, highlights what matters, and speaks in sentences — not charts.

## Solution

A two-tier intelligence system:

1. **Insights Engine** — Lightweight SQL-based nudges generated on every dashboard load. No AI model required. Runs 6 analytic queries and produces prioritized, screen-targeted insight cards.
2. **AI Chat** — Gemini-powered conversational interface that receives full household context (pantry, budget, goals, waste, income) and answers free-form questions.

---

## Insights Engine

### How It Works

On every `GET /api/insights/` call, the backend runs 6 independent analytic queries and generates priority-ranked insight cards:

```
Request → Run 6 SQL analysis blocks → Collect InsightOut objects
        → Sort by priority (descending) → Return to client
```

Each insight includes:
- `screen`: Where it should appear (home, budget, pantry, goals)
- `type`: Visual treatment (warning, tip, info)
- `priority`: Sort order (1–10, higher = more important)
- `title` + `body`: Human-readable text

### The 6 Insight Categories

| # | Category | Screen | Priority | Trigger |
|---|----------|--------|----------|---------|
| 1 | **Budget Pace** | budget | 3–10 | Always runs. Warns at 80%+ and 100%+ usage |
| 2 | **Category Trends** | budget | 6 | Category spending up ≥15% vs last month |
| 3 | **Expiring Items** | pantry | 9 | Items expiring within 3 days |
| 4 | **Food Waste** | home | 7 | Any trashed items this month |
| 5 | **Surplus → Goals** | goals/home | 4–5 | Positive income minus expenses |
| 6 | **Subscription Total** | home | 4 | Recurring charges exceed $20/month |

### Insight Card Examples

**Budget pace (over budget)**:
```
type: warning | priority: 10
"Over budget"
"You've spent $650 of $600 — 108% used with 12 days left."
```

**Budget pace (running hot)**:
```
type: warning | priority: 8
"Budget running hot"
"$480 of $600 spent (80%). At this pace you'll hit $720 by month-end."
```

**Category trend**:
```
type: tip | priority: 6
"Dining Out spending up"
"Dining Out is up 35% vs last month ($120 → $162)."
```

**Expiring items**:
```
type: warning | priority: 9
"3 items expiring soon"
"Worth $12.50 — use them before they go to waste."
```

**Food waste**:
```
type: tip | priority: 7
"Food waste this month"
"$28.50 in trashed items. That's about $342/year."
```

**Surplus**:
```
type: tip | priority: 5
"$340 surplus this month"
"You have $340 left over. Consider allocating it toward your goals."
```

**Subscriptions**:
```
type: info | priority: 4
"Subscriptions"
"$87/mo in recurring charges — that's $1,044/year."
```

### Dashboard Rendering

The dashboard filters insights by screen and displays the top 3:

```typescript
const homeInsights = insights
  .filter(i => i.screen === "home" || i.screen === "budget")
  .slice(0, 3);
```

Each card is color-coded by type:
- `warning` → Red background (`bg-red-50 border-red-200`)
- `tip` → Blue background (`bg-blue-50 border-blue-200`)
- `info` → Gray background (`bg-gray-50 border-gray-200`)

---

## AI Chat

### Architecture

```
User types question
        │
        ▼
Build household context (8 SQL queries):
  ├── Budget limit
  ├── Active pantry count
  ├── Expiring items (next 3 days)
  ├── Receipt spending this month
  ├── Bank income & expenses
  ├── Savings goals progress
  ├── Food waste cost
  └── Top 5 spending categories
        │
        ▼
Compose Gemini prompt:
  System: "You are a household finance assistant.
           Be concise (2-4 sentences), friendly,
           actionable. If you suggest cutting,
           be specific about which category."
  Context: [household data summary]
  Question: [user message]
        │
        ▼
Gemini Flash generates response
        │
        ▼
Return reply to client
```

### Context Data Sent to AI

The `_build_household_context()` function assembles a text summary:

```
Date: 2026-02-24
Monthly budget limit: $600.00
Pantry: 23 active items out of 45 total
Expiring soon: Milk (expires 2026-02-26), Bread (expires 2026-02-25)
This month's receipt spending: $412.50
Budget used: 69% of limit
Bank income this month: $3,200.00
Bank expenses this month: $2,860.00
Net: $340.00
Food waste cost this month: $28.50
Top spending categories: Groceries: $285.00, Dining: $162.00, Snacks: $45.00
Savings goals: Toyota Camry: $5,000 / $28,000; Emergency Fund: $1,200 / $5,000
```

This gives Gemini enough context to answer questions like:
- "What should I cut to save $200?"
- "Am I on track this month?"
- "What's expiring soon?"
- "How long until I reach my car goal?"

### Fallback Behavior

| Scenario | Response |
|----------|----------|
| No Gemini API key | "AI chat requires a Gemini API key. Check your insights on the dashboard for spending analysis!" |
| Gemini error | "Sorry, I had trouble processing that. Try asking about your spending, pantry items, or savings goals!" |
| Empty message | HTTP 400 — "Message cannot be empty" |

---

## Platform Behavior

### Web
- **Insight cards**: 3-column grid on dashboard, color-coded by type
- **Chat**: Dedicated panel in dashboard with text input and response area
- **Loading**: `InsightsSkeleton` — 3 pulsing card placeholders

### Mobile
- **Insight cards**: Horizontal scroll carousel on home tab
- **Chat**: Bottom sheet with keyboard-aware input
- **Type icons**: Lightbulb for tips, warning triangle for warnings

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/insights/` | Contextual insights (sorted by priority) |
| POST | `/api/chat/` | AI chat (send message, get reply) |

### Insight Response Shape

```json
[
  {
    "screen": "budget",
    "type": "warning",
    "priority": 10,
    "title": "Over budget",
    "body": "You've spent $650 of $600 — 108% used with 12 days left."
  }
]
```

### Chat Request / Response

```json
// Request
{ "message": "What should I cut to save $200?" }

// Response
{ "reply": "Your Dining Out category at $162 is up 35% from last month..." }
```

---

## Connected Features

| Trigger | Effect |
|---------|--------|
| Receipt scanned | Budget pace insight recalculates |
| Item trashed | Food waste insight updates |
| Bank statement uploaded | Income/expense/subscription insights refresh |
| Goal created | Surplus insight links to goals |
| Pantry item nearing expiry | Expiry warning appears on pantry screen |
