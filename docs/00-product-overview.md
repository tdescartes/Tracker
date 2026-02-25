# Product Overview

## Vision

Tracker exists to answer two questions every household asks daily: **"What do we have?"** and **"Where is our money going?"** — and to connect those answers so that knowing one informs the other.

Most people manage groceries and finances in completely separate apps. Tracker merges them into a single flow: scan a receipt, and your pantry updates _and_ your budget updates _and_ your meal suggestions update — all at once, in real time, across every device in the household.

---

## Value Proposition

**One scan. Pantry, budget, and meals — all updated.**

Tracker replaces the gap between your grocery list, your fridge, your budget spreadsheet, and your "what's for dinner?" conversation with a single, interconnected system.

| Pain Point                                                  | How Tracker Solves It                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Food expires before you remember to use it                  | Expiry tracking with push alerts and recipe suggestions that prioritize expiring items          |
| No idea how much you've actually spent this month           | Dual-source budget: receipts (confirmed) + bank statements (estimated) with daily pace tracking |
| Budgeting apps don't know what you bought — just line items | Receipt AI extracts individual items with categories, prices, and auto-expiration dates         |
| Bank statements are a wall of text                          | AI + regex parsing extracts transactions, detects subscriptions, categorizes spending           |
| Multiple household members, no shared view                  | Multi-tenant household model with invite codes, real-time WebSocket sync, shared pantry/budget  |
| Savings goals feel disconnected from daily spending         | Surplus detection → one-tap "move to goal" with cash/loan strategy calculations                 |

---

## Target Audience

### Primary: Budget-conscious households (2–5 members)

- Families managing a shared grocery budget
- Roommates splitting expenses
- Young couples building financial habits together

### Secondary: Solo users who want visibility

- Individuals tired of food waste
- People who want receipt-level spending insight without manual spreadsheets
- Anyone managing savings goals alongside daily expenses

---

## Product Pillars

### 1. Scan-First Workflow

Everything starts with a scan. Point your camera at a receipt or upload a bank statement — AI handles the rest. No manual data entry required.

### 2. Connected Data

Pantry, budget, recipes, and goals aren't separate features — they're different views of the same data. A receipt scan updates all four simultaneously.

### 3. Household-Native

Built for shared living from day one. Every item, transaction, and goal is scoped to the household. Real-time sync means everyone sees the same data.

### 4. AI That Assists, Not Replaces

Gemini Flash structures receipts and bank statements. The AI chat answers budget questions with your actual data. But you always review and confirm before anything is saved.

### 5. Dual Platform, Single Experience

Web dashboard for deep analysis at your desk. Mobile app for scanning on the go. Same API, same data, same real-time sync.

---

## Platform Overview

| Platform           | Tech Stack                                      | Primary Use Case                                                       |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| **Web**            | Next.js 15, Tailwind CSS, Recharts              | Dashboard analysis, bank statement uploads, detailed budget review     |
| **Mobile**         | Expo SDK 54, React Native 0.81                  | Receipt scanning (camera), quick pantry checks, on-the-go goal updates |
| **Backend**        | FastAPI, PostgreSQL 16, PaddleOCR, Gemini Flash | REST API, AI pipeline, real-time WebSocket, scheduled jobs             |
| **Infrastructure** | Docker Compose, 3-service stack                 | One-command deployment: `docker compose up`                            |

---

## Feature Map

```
┌─────────────────────────────────────────────────────────────┐
│                     TRACKER                                  │
├──────────────┬──────────────┬───────────────┬───────────────┤
│  📸 Scan     │  📦 Pantry   │  💰 Money     │  🤖 AI        │
│              │              │               │               │
│  Receipt OCR │  Inventory   │  Budget Pulse │  Insights     │
│  Bank Parse  │  Expiry      │  Transactions │  Chat         │
│  AI Extract  │  Shopping    │  Goals        │  Categorize   │
│  Confirm     │  Locations   │  Inflation    │  Notifications│
│              │              │  Surplus      │               │
│              │  🍽 Recipes   │  Bank Recon   │  📊 Reports   │
│              │  Match Score │  Plaid Link   │  Report Card  │
│              │  Missing     │  Subscriptions│  Export CSV   │
└──────────────┴──────────────┴───────────────┴───────────────┘
```

---

## The Connected Flow

```
Receipt Scan ──→ AI Extraction ──→ User Confirms
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              Pantry Items      Budget Updated      Category Learned
                    │                  │                  │
                    ▼                  ▼                  ▼
              Recipe Match      Pace Recalc        Future Auto-Cat
              Expiry Alert      Surplus Check
                    │                  │
                    ▼                  ▼
              Push Notif        Goal Suggestion
```

Every scan triggers a cascade of updates across the entire system — pantry, budget, recipes, goals, and notifications all react to a single confirmed receipt.
