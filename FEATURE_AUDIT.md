# Tracker — Comprehensive Feature Audit

**Generated:** June 2025  
**Scope:** Every user-facing feature, API endpoint, bug, and inconsistency

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Web Frontend — Pages](#2-web-frontend--pages)
3. [Mobile Frontend — Screens](#3-mobile-frontend--screens)
4. [Backend — Routers & API Endpoints](#4-backend--routers--api-endpoints)
5. [Backend — Services](#5-backend--services)
6. [Shared Infrastructure](#6-shared-infrastructure)
7. [Bugs & Issues](#7-bugs--issues)
8. [Dead Code & Redundancy](#8-dead-code--redundancy)
9. [Inconsistencies](#9-inconsistencies)
10. [Feature Parity Matrix (Web vs Mobile)](#10-feature-parity-matrix-web-vs-mobile)
11. [Summary of Findings](#11-summary-of-findings)

---

## 1. Architecture Overview

| Layer | Tech | Key Libraries |
|-------|------|--------------|
| **Web** | Next.js (App Router) | TanStack React Query, Zustand, recharts, react-dropzone, clsx, lucide-react, date-fns |
| **Mobile** | React Native / Expo Router | TanStack React Query, Zustand, expo-image-picker, expo-document-picker, expo-haptics, expo-secure-store, expo-sharing, expo-file-system, react-native-toast-message |
| **Backend** | FastAPI (Python 3.11+) | SQLAlchemy (async), PostgreSQL, PaddleOCR, Google Gemini AI, Plaid SDK, jose (JWT), passlib/bcrypt, SlowAPI, APScheduler |

**Core Flow:** Receipt scan → PaddleOCR text extraction → Gemini AI structuring → User review/confirm → Pantry items created → Budget tracked → AI recipe suggestions → Contextual insights

**Multi-user model:** Household-based. Registration creates a household; other users join via invite code. All data (pantry, receipts, transactions, goals) is scoped to `household_id`.

---

## 2. Web Frontend — Pages

### 2.1 `web/src/app/dashboard/page.tsx` (~210 lines) — Home Dashboard

**Features:**
- Time-based greeting ("Good morning/afternoon/evening, {name}")
- **Action Needed banner** — aggregates: expiring items count, shopping list count, unread notifications count
- **Stat cards**: Expiring Soon, Spent This Month, Food Waste, Remaining Budget
- **Budget Pulse** — stacked progress bar (confirmed from receipts + estimated from bank statement)
- **Tonight's Pick** — first AI recipe suggestion for expiring items
- **This Week** — top AI insights rendered as cards with priority-based icons
- **Eat Me First** — expiring pantry items with days-left badges

**API calls:**
- `pantryApi.expiringSoon(3)` — expiring items within 3 days
- `budgetApi.summary(year, month)` — budget data for progress bar
- `pantryApi.shoppingList()` — shopping list for badge count
- `recipesApi.suggestions(true, 3)` — recipe suggestions prioritizing expiring items
- `notificationsApi.list(true)` — unread notifications for badge count
- `insightsApi.list()` — contextual AI insights

---

### 2.2 `web/src/app/dashboard/money/page.tsx` (956 lines) — Unified Money Hub

**This is the main financial management page with 3 tabs:**

#### Tab: Budget
- Month/year navigation controls
- Client-side budget limit input (default: 600)
- **Stacked progress bar** — confirmed (receipts) + estimated (bank), pace indicator ("On track" / "Ahead" / "Over budget")
- **Pie chart** (recharts) — spending by category, merged from receipt + bank categories
- **Monthly Report Card** — income, expenses, net, vs-last-month change %, subscription total, surplus amount
- **Inflation Tracker** — line chart for price history of any pantry item

**API calls (Budget tab):**
- `budgetApi.summary(year, month, limit)` — budget summary with optional custom limit
- `budgetApi.reportCard(year, month)` — monthly report card
- `budgetApi.inflation(itemName)` — price history data points
- `budgetApi.surplus(year, month)` — surplus amount and cuttable categories

#### Tab: Transactions
- **Plaid integration** — Connect bank account via Plaid Link (loads script dynamically), sync transactions, unlink accounts
- **Statement upload** — drag-and-drop zone (react-dropzone), supports PDF/CSV/images
- Upload progress with elapsed timer and fun status messages
- **Post-upload report card** — Monthly Report Card triggered after upload
- **Summary cards** — total transactions, income, expenses, subscriptions
- **Transaction table** — filterable by category and type (All/Expenses/Income/Subscriptions)
- Matched/unmatched indicators, **Reconcile button** to match bank ↔ receipt transactions

**API calls (Transactions tab):**
- `bankApi.transactions()` — list all bank transactions
- `bankApi.upload(file)` — upload statement (120s timeout)
- `bankApi.reconcile()` — match transactions with receipts
- `api.post("/api/plaid/link-token")` — create Plaid Link token
- `api.post("/api/plaid/exchange-token")` — exchange public token
- `api.post("/api/plaid/sync")` — sync transactions from Plaid
- `api.get("/api/plaid/linked-items")` — list linked bank accounts
- `api.delete("/api/plaid/items/{id}")` — unlink account

#### Tab: Goals
- **Surplus banner** — "Move $X → Goal" with top cuttable categories
- Create/edit/delete goals with form: name, target, saved, monthly contribution, loan toggle (interest rate + term)
- **Goal cards** with progress bar (%), log savings button, estimated completion date
- **Loan details** — monthly payment, total interest displayed for loan-type goals
- AI insight ("If you cut $X/month…")
- Surplus-based projection ("With current surplus, reach goal by…")

**API calls (Goals tab):**
- `goalsApi.list()` / `goalsApi.create()` / `goalsApi.update()` / `goalsApi.delete()`
- `budgetApi.surplus(year, month)` — surplus for goal suggestions

---

### 2.3 `web/src/app/dashboard/receipts/page.tsx` (564 lines) — Receipt Scanner

**Features:**
- **Drag-and-drop upload zone** (react-dropzone) — accepts images and PDFs
- Elapsed timer with rotating status messages during OCR processing
- **Review Panel** — edit merchant, date, total; inline item editing (name, price, qty, category selector with 13 categories)
- **Post-confirm nudge card** — shows budget context (spent/limit + pace) and first AI insight
- **Receipt History** — expandable cards showing merchant, date, total, item count, with full item list in accordion

**API calls:**
- `receiptApi.upload(file)` — OCR + AI structuring (120s timeout)
- `receiptApi.confirm(id, data)` — confirm reviewed receipt (creates pantry items)
- `receiptApi.list()` — receipt history
- `budgetApi.summary(year, month)` — budget context for post-confirm nudge
- `insightsApi.list()` — AI insight for post-confirm nudge

---

### 2.4 `web/src/app/dashboard/pantry/page.tsx` (~350 lines) — Pantry Management

**Features:**
- **Location filter tabs**: ALL / FRIDGE / FREEZER / PANTRY
- **Manual add item form** — name, quantity, unit, location, expiry, price, on_shopping_list toggle
- **Edit item modal** — same fields as add, pre-populated
- **Scan receipt** — file picker triggers `receiptApi.upload()` then shows review modal
- **Pantry cards** — item name, category, location badge, quantity, expiry date with color-coded status, price
- **Actions**: "Used" (patch status → CONSUMED), Edit, Delete
- **Shopping list indicator** — link to shopping page with count badge

**API calls:**
- `pantryApi.list({ location })` — filtered pantry list
- `pantryApi.addItem(data)` — add new item
- `pantryApi.updateItem(id, data)` — update item
- `pantryApi.deleteItem(id)` — delete item
- `receiptApi.upload(file)` — scan receipt for bulk add
- `receiptApi.confirm(id, data)` — confirm scanned items

---

### 2.5 `web/src/app/dashboard/recipes/page.tsx` (~200 lines) — Recipe Suggestions

**Features:**
- **Search bar** — search by ingredient or recipe name
- **Expiring-first toggle** — prioritize recipes using soon-to-expire items
- **Recipe cards** — name, cook time, match score (color-coded: green ≥80%, amber ≥50%, gray <50%), matched vs total ingredients
- **Missing ingredients badges** — orange pills showing what's needed
- **Expandable instructions** — supports both URL links and inline text

**API calls:**
- `recipesApi.suggestions(expiringFirst, 8)` — pantry-based AI suggestions
- `recipesApi.search(query)` — keyword search

---

### 2.6 `web/src/app/dashboard/goals/page.tsx` (~250 lines) — Standalone Goals ⚠️

**Features:**
- Same as Goals tab in Money page but **without**: surplus banner, surplus-based projection, report card context
- Create/edit/delete goals, progress bars, log savings, loan calculator, AI insight

**API calls:**
- `goalsApi.list()` / `goalsApi.create()` / `goalsApi.update()` / `goalsApi.delete()`

> ⚠️ **ISSUE**: This page duplicates the Goals tab in `money/page.tsx` with less functionality. See [Dead Code](#8-dead-code--redundancy).

---

### 2.7 `web/src/app/dashboard/budget/page.tsx` (~180 lines) — Standalone Budget ⚠️

**Features:**
- Month/year navigation, budget limit control
- Spending vs budget progress bar
- Pie chart by category
- Inflation tracker

**API calls:**
- `budgetApi.summary(year, month, limit)` — budget summary
- `budgetApi.inflation(itemName)` — inflation data

> ⚠️ **ISSUE**: This page duplicates the Budget tab in `money/page.tsx` but is **missing**: confirmed/estimated split, pace indicator, report card, bank categories merge. See [Dead Code](#8-dead-code--redundancy).

---

### 2.8 `web/src/app/dashboard/bank/page.tsx` (488 lines) — Standalone Bank ⚠️

**Features:**
- Plaid integration (connect/sync/unlink)
- Statement upload with drag-drop
- Transaction table with filters
- Reconcile button
- Summary cards

**API calls:** Same as Money/Transactions tab.

> ⚠️ **ISSUE**: Near-exact duplicate of the Transactions tab in `money/page.tsx` but **without** post-upload Monthly Report Card. See [Dead Code](#8-dead-code--redundancy).

---

### 2.9 `web/src/app/dashboard/settings/page.tsx` (360 lines) — Settings

**Features:**
- **Profile Section** — edit name and email
- **Password Section** — change password (requires current + new with 8+ char validation)
- **Household Section** — edit household name and budget limit
- **Invite Section** — generate invite code and join household by code
- **Members Section** — list household members with join date
- **Export Section** — download Pantry CSV and Transactions CSV

**API calls:**
- `settingsApi.getProfile()` / `settingsApi.updateProfile(data)`
- `settingsApi.changePassword(data)`
- `settingsApi.updateHousehold(data)`
- `settingsApi.generateInvite()` / `settingsApi.joinHousehold(code)` / `settingsApi.listMembers()`
- `settingsApi.exportPantry()` / `settingsApi.exportTransactions()` — blob downloads

---

### 2.10 `web/src/app/dashboard/shopping/page.tsx` (~90 lines) — Shopping List

**Features:**
- List of all items marked `on_shopping_list`
- "Purchased" button — calls `pantryApi.updateItem(id, { on_shopping_list: false })`
- "Remove" button — same API call

**API calls:**
- `pantryApi.shoppingList()` — list shopping items
- `pantryApi.updateItem(id, { on_shopping_list: false })` — remove from list

---

### 2.11 `web/src/app/dashboard/layout.tsx` (325 lines) — Dashboard Layout Shell

**Features:**
- **Sidebar navigation** — 6 items: Dashboard, Pantry, Money, Recipes, Receipts, Settings
- **Notification bell** dropdown — shows up to 20 notifications with unread count badge, "mark all read" button, type-based emoji icons, 60s polling
- **User email display** and sign-out button
- **Floating AI Chat** — persistent chat bubble on all dashboard pages, Gemini-powered Q&A about spending/pantry/goals, suggested questions, typing indicator
- **Auth hydration** — checks localStorage for JWT token on mount, redirects to login if missing
- **WebSocket sync** — `useHouseholdSync(householdId)` for real-time cache invalidation

**API calls (layout-level):**
- `api.get("/api/notifications/")` — 60s polling
- `api.post("/api/notifications/read-all")` — mark all read
- `chatApi.send(message)` — AI chat

> **NOTE**: The sidebar NAV array does **not** include links to `/dashboard/goals`, `/dashboard/budget`, `/dashboard/bank`, or `/dashboard/shopping`. These pages are only reachable via direct URL or internal `router.push()` calls.

---

### 2.12 Auth Pages — Login & Register

- Login via email+password form
- Register with email, password, full name, household name
- Uses `useAuthStore` Zustand store → `authApi.login()` / `authApi.register()`
- Redirects to `/dashboard` on success

---

## 3. Mobile Frontend — Screens

### 3.1 Tab Layout (`mobile/app/(tabs)/_layout.tsx`, 339 lines)

**4 visible tabs:** Home, Pantry, Money, Profile  
**FAB button** between Pantry and Money → navigates to Scan screen  
**7 hidden screens** (navigable via `router.push()`): scan, bank, budget, goals, shopping, recipes, notifications  
**Floating AI Chat** — full-screen modal with identical suggested questions as web

---

### 3.2 `mobile/app/(tabs)/index.tsx` (~300 lines) — Home Screen

Mirrors web dashboard. Features: pull-to-refresh, action needed card, budget pulse, AI insights, tonight's pick, eat me first.

**Same API calls as web dashboard page.**

---

### 3.3 `mobile/app/(tabs)/money.tsx` (973 lines) — Money Screen

Mirrors web Money page with 3 segments: Budget, Transactions, Goals.

**Budget segment:** month navigation, category spending bars (custom View-based — no recharts equivalent), inflation tracker using colored bars instead of line chart

**Transactions segment:** document picker + image picker (no drag-drop), upload with timer, post-upload report card, reconcile, category filter. Uses `bankApi.upload()` with FormData via fetch (different from web's axios)

**Goals segment:** same as web Goals tab including surplus banner and surplus-based projection

**API calls:** Same as web Money page.

---

### 3.4 `mobile/app/(tabs)/pantry.tsx` (~500 lines) — Pantry Screen

Has 2 segments: **Stock** and **Shopping**.

**Stock segment:**
- Location filter pills with count badges
- Manual add/edit forms in-line
- Items sorted by expiry date, with actions (Used/Trash/Delete)
- Expiring items banner with "value at risk" calculation
- Pantry insights from backend

**Shopping segment:**
- Items on shopping list
- "Got it" button to remove from list

**API calls:**
- `pantryApi.list({ location })` / `pantryApi.addItem(data)` / `pantryApi.update(id, data)` / `pantryApi.deleteItem(id)`
- `pantryApi.shoppingList()` / `pantryApi.expiringSoon(3)`

---

### 3.5 `mobile/app/(tabs)/scan.tsx` (~450 lines) — Receipt Scanner

Has 2 segments: **Scan** and **History**.

**Scan segment:**
- Camera capture + gallery picker (expo-image-picker)
- Editable review screen with category pills for each item
- Post-confirm nudge modal with budget context and AI insight
- "Scan Another" and "Go to Pantry" actions

**History segment:**
- Receipt list with expandable item details

**API calls:**
- `receiptApi.upload(file)` / `receiptApi.confirm(id, data)` / `receiptApi.list()`
- `budgetApi.summary(year, month)` / `insightsApi.list()`

---

### 3.6 `mobile/app/(tabs)/profile.tsx` (~500 lines) — Profile & Settings

Accordion-style sections:

- **Profile** — edit name/email
- **Password** — change with current+new
- **Household** — name, budget limit, invite code generation, join by code, member list
- **Notifications** — in-app notification list with mark read/mark all
- **Export** — pantry CSV and transactions CSV using expo-sharing
- **Sign Out** — clears SecureStore token

**API calls:**
- `settingsApi.*` — all settings API calls
- `notificationsApi.list()` / `notificationsApi.markRead(id)` / `notificationsApi.markAllRead()`

---

### 3.7 Hidden Mobile Screens

| Screen | File | Lines | Purpose |
|--------|------|-------|---------|
| `goals.tsx` | `mobile/app/(tabs)/goals.tsx` | 255 | Standalone goals (create, list, delete, update, log savings) |
| `budget.tsx` | `mobile/app/(tabs)/budget.tsx` | 170 | Standalone budget (month nav, progress bar, categories) |
| `bank.tsx` | `mobile/app/(tabs)/bank.tsx` | 327 | Standalone bank (upload, transactions, reconcile, Plaid) |
| `shopping.tsx` | `mobile/app/(tabs)/shopping.tsx` | ~70 | Shopping list with "Got it" button |
| `recipes.tsx` | `mobile/app/(tabs)/recipes.tsx` | ~200 | Recipe suggestions, search, expiring-first toggle |
| `notifications.tsx` | `mobile/app/(tabs)/notifications.tsx` | ~110 | Notification list with mark read |

> ⚠️ Same duplication issue as web — these standalone screens replicate functionality already in the main tabs (Money has Budget/Transactions/Goals segments; Profile has Notifications section).

---

## 4. Backend — Routers & API Endpoints

### 4.1 Auth (`backend/app/routers/auth.py`, ~95 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create user + household, return JWT |
| POST | `/api/auth/login` | OAuth2 form login, return JWT + user |
| GET | `/api/auth/me` | Get current user from JWT |

---

### 4.2 Receipts (`backend/app/routers/receipts.py`, ~200 lines)
| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|-----------|
| POST | `/api/receipts/upload` | Upload file → OCR → AI structuring → return parsed items for review | 5/min |
| POST | `/api/receipts/{id}/confirm` | Confirm reviewed receipt → create pantry items, learn categories, broadcast WebSocket | — |
| GET | `/api/receipts/` | List receipts with pantry items eager-loaded | — |

**Notable behavior:**
- Auto-populates expiration dates via `DEFAULT_SHELF_LIFE` dictionary (e.g., Produce: 5 days, Meat: 4 days)
- Learns user category corrections via `category_learning` table
- Broadcasts `receipt_confirmed` WebSocket event to household

---

### 4.3 Pantry (`backend/app/routers/pantry.py`, ~115 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pantry/` | List items (filterable by location, status; defaults to UNOPENED+OPENED) |
| GET | `/api/pantry/expiring-soon` | Items expiring within N days |
| GET | `/api/pantry/shopping-list` | Items with `on_shopping_list=true` |
| POST | `/api/pantry/` | Add item manually |
| PATCH | `/api/pantry/{item_id}` | Update item (auto-adds to shopping list on CONSUMED/TRASHED) |
| DELETE | `/api/pantry/{item_id}` | Delete item |

---

### 4.4 Budget (`backend/app/routers/budget.py`, ~280 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/budget/summary/{year}/{month}` | Confirmed (receipts) + estimated (unmatched bank txs), pace calculation, categories merged |
| GET | `/api/budget/report-card/{year}/{month}` | Income, expenses, net, vs-last-month %, subscription total, surplus |
| GET | `/api/budget/surplus/{year}/{month}` | Surplus amount + top 3 cuttable categories |
| GET | `/api/budget/inflation/{item_name}` | Historical price data for a specific pantry item |

**Notable behavior:**
- "Honest" budget: confirmed spending from receipts + estimated from unmatched bank debits
- Pace calculation: `(spent / budget) / fraction_of_month_elapsed`

---

### 4.5 Bank (`backend/app/routers/bank.py`, ~250 lines)
| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|-----------|
| POST | `/api/bank/upload-statement` | Upload PDF/CSV/image → AI + regex parsing, duplicate detection, subscription flagging | 3/min |
| GET | `/api/bank/transactions` | List transactions (limit 200) |  — |
| POST | `/api/bank/reconcile` | Match bank ↔ receipt transactions (±1 day, ±$0.50) | — |

**Notable behavior:**
- Uploaded files are deleted after parsing for privacy
- Subscription detection via keyword matching (Netflix, Spotify, etc.)
- Duplicate prevention via `(household_id, transaction_date, description, amount)` unique check

---

### 4.6 Goals (`backend/app/routers/goals.py`, ~120 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/goals/` | List goals with financial calculations (cash strategy, loan strategy, insight) |
| POST | `/api/goals/` | Create goal |
| PATCH | `/api/goals/{id}` | Update goal |
| DELETE | `/api/goals/{id}` | Delete goal |

---

### 4.7 Recipes (`backend/app/routers/recipes.py`, ~90 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/recipes/suggestions` | Suggest recipes from pantry items (Spoonacular or builtin fallback) |
| GET | `/api/recipes/search` | Search builtin recipes by keyword |

**Notable behavior:**
- Double-weights items expiring within 4 days when `expiring_first=true`
- Falls back to 20 hardcoded builtin recipes when Spoonacular API key is not configured

---

### 4.8 Notifications (`backend/app/routers/notifications.py`, ~90 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/notifications/token` | Register push notification token (Expo/web) |
| DELETE | `/api/notifications/token` | Unregister push token |
| GET | `/api/notifications/` | List in-app notifications (limit 50) |
| POST | `/api/notifications/{id}/read` | Mark one notification read |
| POST | `/api/notifications/read-all` | Mark all read |
| POST | `/api/notifications/trigger-expiry` | Manually trigger expiry check (admin/cron) |

---

### 4.9 Plaid (`backend/app/routers/plaid.py`, 221 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/plaid/link-token` | Create Plaid Link token for frontend widget |
| POST | `/api/plaid/exchange-token` | Exchange public token → save access token to DB |
| GET | `/api/plaid/linked-items` | List linked bank accounts |
| POST | `/api/plaid/sync` | Pull transactions from Plaid, detect subscriptions, save to DB |
| DELETE | `/api/plaid/items/{item_id}` | Unlink bank account |

---

### 4.10 Settings (`backend/app/routers/settings.py`, ~250 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/settings/profile` | Get user profile + household info |
| PATCH | `/api/settings/profile` | Update name/email (with duplicate email check) |
| POST | `/api/settings/change-password` | Change password (verifies current) |
| PATCH | `/api/settings/household` | Update household name/currency/budget limit |
| POST | `/api/settings/household/generate-invite` | Generate 12-char invite code |
| POST | `/api/settings/household/join` | Join household by invite code |
| GET | `/api/settings/household/members` | List household members |
| GET | `/api/settings/export/pantry` | Download pantry as CSV |
| GET | `/api/settings/export/transactions` | Download transactions as CSV |

---

### 4.11 Insights (`backend/app/routers/insights.py`, 235 lines)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/insights/` | Generate contextual insights (6 types) |

**Insight types:**
1. **Budget pace** — "On track" / "X% over" / "X% under"
2. **Category spending changes** — "Dining up 35% vs last month"
3. **Expiring items** — "3 items expiring in 2 days ($12 value)"
4. **Waste cost** — "$X worth of food trashed this month"
5. **Surplus → goals** — "You have $X surplus, consider allocating to goals"
6. **Subscription total** — "$X/mo in recurring charges = $Y/year"

All wrapped in try/except — the endpoint never fails; it returns whatever insights it can generate.

---

### 4.12 Chat (`backend/app/routers/chat.py`, 182 lines)
| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|-----------|
| POST | `/api/chat/` | AI chat with household context | 20/min |

**Behavior:**
- Builds comprehensive household context (pantry count, expiring items, monthly spending, income, expenses, waste, top categories, goals)
- Sends context + user message to Gemini 2.0 Flash
- Falls back to a helpful message if no Gemini API key

---

### 4.13 WebSocket (`backend/app/routers/ws.py`, 147 lines)
| Protocol | Endpoint | Purpose |
|----------|----------|---------|
| WS | `/api/ws/{household_id}?token=<jwt>` | Real-time household sync |

**Events broadcast to room:**
- `pantry_updated`
- `receipt_confirmed`
- `goal_updated`
- `bank_synced`
- `connected` (welcome message on join)
- `ping` (keepalive every 30s)

JWT validated before connection accepted. In-memory room map (`_rooms` dict).

---

## 5. Backend — Services

### 5.1 AI Document Service (`backend/app/services/ai_document_service.py`, 450 lines)
- **PaddleOCR + Gemini Flash pipeline**: Extract text → Classify document type → Structure with LLM
- Thread-safe Gemini singleton, separate thread pools for OCR (CPU) and Gemini (network)
- **Self-correction retry loop**: feeds JSON parse errors back to Gemini (up to 3 retries)
- **Regex fallback**: if Gemini fails, falls back to `receipt_parser` or `bank_parser`
- Detailed receipt prompt with 13 categories and learned-mappings support
- Processing log written to `document_processing_log` table (best-effort)

### 5.2 OCR Service (`backend/app/services/ocr_service.py`, ~85 lines)
- **PaddleOCR** (primary) — lazy singleton, CPU-only
- **Tesseract** (fallback) — last resort
- Async wrapper via `run_in_executor`

### 5.3 Recipe Service (`backend/app/services/recipe_service.py`, 268 lines)
- **20 built-in recipes** with ingredients, instructions, cook time
- Fuzzy matching (normalized substring matching) of pantry items to recipe ingredients
- Returns `match_score`, `matched_count`, `missing` ingredients
- Optional **Spoonacular API** integration for richer results

### 5.4 Financial Calculator (`backend/app/services/financial_calculator.py`, ~80 lines)
- **Cash strategy**: months to wait = principal / monthly_contribution
- **Loan strategy**: standard amortization formula
- **AI insight**: "If you cut $X/month, you reach this goal Y months sooner"

### 5.5 Notification Service (`backend/app/services/notification_service.py`, 209 lines)
- Push notifications via **Expo Push API**
- Push token CRUD (register/unregister per user)
- Expiry notification sender — groups by household, builds message, sends to all household member tokens
- In-app notification CRUD (save, list, mark read/all read)

### 5.6 Receipt Parser & Bank Parser
- Regex-based fallback parsers for when Gemini is unavailable
- Receipt parser extracts merchant, date, total, items from OCR text
- Bank parser handles PDF, CSV, and image statements

### 5.7 Categorization Service
- Category learning: stores user corrections for item-to-category mappings
- Used by receipt confirm flow to improve future categorization

### 5.8 Plaid Service
- Plaid API wrapper: create link token, exchange token, get institution name, sync transactions
- Returns `None` if Plaid credentials not configured

---

## 6. Shared Infrastructure

### 6.1 API Layers

**Web** (`web/src/lib/api.ts`, ~145 lines):
- Axios instance with JWT interceptor (localStorage), auto-logout on 401
- Typed API modules: `authApi`, `pantryApi`, `receiptApi`, `budgetApi`, `insightsApi`, `chatApi`, `bankApi`, `recipesApi`, `notificationsApi`, `plaidApi`, `settingsApi`, `goalsApi`

**Mobile** (`mobile/src/lib/api.ts`, ~150 lines):
- Axios instance with JWT interceptor (SecureStore), no auto-logout redirect (mobile)
- Same API module structure as web

### 6.2 Auth Store (Zustand)

Both web and mobile use identical structure:
- `login(email, password)` → store token + user
- `register(payload)` → store token + user
- `logout()` → clear token + user state
- `hydrate()` → check stored token + fetch `/me`

### 6.3 WebSocket Hook (`useHouseholdSync`)

Both web and mobile versions:
- Connect to `/api/ws/{householdId}?token=<jwt>`
- Parse incoming events and invalidate TanStack Query caches
- Auto-reconnect on close (5s delay)
- Mobile version uses `SecureStore.getItemAsync()` for token
- Mobile version additionally invalidates `["shopping-list"]` and `["notifications"]`

### 6.4 Main App (`backend/app/main.py`, ~140 lines)
- FastAPI with lifespan: creates DB tables on startup, schedules daily expiry check at 8 AM (APScheduler)
- CORS configured for web origin + mobile origin + localhost regex in dev
- Global exception handler re-attaches CORS headers on 500 errors
- SlowAPI rate limiter (200/min default)
- Static file serving for local uploads
- 13 routers registered

---

## 7. Bugs & Issues

### BUG-1: Goals DELETE endpoint missing `db.commit()` ⛔

**File:** `backend/app/routers/goals.py`, DELETE `/{id}` endpoint  
**Issue:** `await db.delete(goal)` is called but `await db.commit()` is never called. The deletion will not be persisted to the database unless there is middleware auto-committing (there isn't — other endpoints explicitly call `db.commit()`).  
**Impact:** Deleting a goal will appear to work in the current request but the goal will reappear on next page load.  
**Fix:** Add `await db.commit()` after `await db.delete(goal)`.

---

### BUG-2: Pantry DELETE endpoint missing `db.commit()` ⛔

**File:** `backend/app/routers/pantry.py`, DELETE `/{item_id}` endpoint  
**Issue:** Same problem as BUG-1. `await db.delete(item)` without `await db.commit()`.  
**Impact:** Pantry item deletions won't persist.

---

### BUG-3: Pantry PATCH endpoint missing `db.commit()` ⛔

**File:** `backend/app/routers/pantry.py`, PATCH `/{item_id}` endpoint  
**Issue:** Updates are assigned via `setattr()` but `await db.commit()` is never called. Item modifications (edit, "Used" action, status changes) won't persist.  
**Impact:** All pantry updates silently fail to save.

---

### BUG-4: Pantry POST endpoint uses `flush()` instead of `commit()` ⚠️

**File:** `backend/app/routers/pantry.py`, POST `/` endpoint  
**Issue:** `await db.flush()` generates an ID but doesn't commit the transaction. Unless there's session middleware handling commit, newly added pantry items won't be saved.  
**Impact:** Manually added pantry items may not persist.

---

### BUG-5: Budget limit client-side default overrides household setting ⚠️

**File:** `web/src/app/dashboard/money/page.tsx`  
**Issue:** The Budget tab has `const [limit, setLimit] = useState(600)`. This is passed to `budgetApi.summary(year, month, limit)`, which sends `budget_limit=600` as a query param. The backend's `budget_limit` parameter defaults to `None` and falls back to the household budget setting only when `None`. Since the client always sends 600, the household's configured budget limit (from Settings) is always ignored.  
**Fix:** Initialize `limit` from the budget summary response's `budget_limit` field, or don't send it if user hasn't explicitly changed it.

---

### BUG-6: Chat router references non-existent model fields ⚠️

**File:** `backend/app/routers/chat.py`, `_build_household_context()` function  
**Issue:** References `PantryItem.expiry_date` and `PantryStatus.ACTIVE` — but the actual model uses `PantryItem.expiration_date` and statuses are `UNOPENED`/`OPENED`/`CONSUMED`/`TRASHED` (no `ACTIVE`). Also references `PantryItem.updated_at` which may not exist on the model.  
**Impact:** The chat context builder will raise SQL errors silently (wrapped in try/except) or return incomplete context, degrading AI chat quality.

---

### BUG-7: Receipt upload crash recovery gap ⚠️

**File:** `backend/app/routers/receipts.py`, POST `/upload`  
**Issue:** The receipt DB record is committed (status=PROCESSING) before OCR begins. Parsed items are only returned in the HTTP response — they're not saved to DB until the user confirms. If the server crashes after commit but before the response is sent, the user gets a PROCESSING receipt with no way to retry OCR.  
**Impact:** Edge case: occasional "stuck" receipts that can't be re-processed.

---

### BUG-8: Mobile `bankApi.upload()` signature mismatch ⚠️

**File:** `mobile/app/(tabs)/bank.tsx` calls `bankApi.upload(uri, mime, name)` with 3 arguments, but `mobile/src/lib/api.ts` defines `bankApi.upload` as accepting a single `File` argument (same as web). React Native doesn't have a `File` constructor.  
**Impact:** Bank statement upload on mobile will fail at runtime.

---

## 8. Dead Code & Redundancy

### DEAD-1: Standalone `goals/page.tsx` is a weaker duplicate

**Files:** `web/src/app/dashboard/goals/page.tsx` (~250 lines) duplicates the Goals tab in `web/src/app/dashboard/money/page.tsx`.  
**Difference:** The standalone version lacks: surplus banner, surplus-based projection, report card context.  
**Not linked in sidebar navigation.** Only reachable via direct URL.  
**Recommendation:** Remove or redirect to `/dashboard/money` with `?tab=goals`.

---

### DEAD-2: Standalone `budget/page.tsx` is an outdated duplicate

**Files:** `web/src/app/dashboard/budget/page.tsx` (~180 lines) duplicates the Budget tab in `web/src/app/dashboard/money/page.tsx`.  
**Difference:** Missing: confirmed/estimated split, pace indicator, report card, bank categories.  
**Not linked in sidebar navigation.**  
**Recommendation:** Remove or redirect to `/dashboard/money` with `?tab=budget`.

---

### DEAD-3: Standalone `bank/page.tsx` is a near-exact duplicate

**Files:** `web/src/app/dashboard/bank/page.tsx` (488 lines) duplicates the Transactions tab in `web/src/app/dashboard/money/page.tsx`.  
**Difference:** Missing: post-upload Monthly Report Card.  
**Not linked in sidebar navigation.**  
**Recommendation:** Remove or redirect to `/dashboard/money` with `?tab=transactions`.

---

### DEAD-4: Same standalone duplication on mobile

**Files:** `mobile/app/(tabs)/goals.tsx`, `budget.tsx`, `bank.tsx`, `shopping.tsx`, `recipes.tsx`, `notifications.tsx` all exist as hidden screens.  
- `goals.tsx` (255 lines) duplicates the Goals segment in `money.tsx`
- `budget.tsx` (170 lines) duplicates the Budget segment in `money.tsx`
- `bank.tsx` (327 lines) duplicates the Transactions segment in `money.tsx`
- Notifications functionality exists in `profile.tsx`  

These hidden screens are registered in the tab layout but are navigable only via `router.push()`.  
**NOTE:** `shopping.tsx`, `recipes.tsx`, and `notifications.tsx` are standalone screens that are NOT duplicated inside the main tabs — they serve as dedicated screens navigated to from other screens and are legitimate.

---

### DEAD-5: Duplicated `GoalForm` interface and `defaultForm` constant

**Files:** Both `money/page.tsx` and `goals/page.tsx` define identical `GoalForm` interface and `defaultForm` object.  
**Impact:** Divergence risk if one is updated without the other.

---

### DEAD-6: Duplicated `useElapsedSeconds` hook

Defined inline in `money/page.tsx` and `receipts/page.tsx` (web). Should be extracted to a shared hooks file.

---

## 9. Inconsistencies

### INC-1: Mobile vs web pantry API function name

- **Web:** `pantryApi.updateItem(id, data)` → calls `PATCH /api/pantry/{id}`
- **Mobile:** `pantryApi.update(id, data)` → calls `PATCH /api/pantry/{id}`

Same endpoint, different function names. Can cause developer confusion.

---

### INC-2: Mobile WebSocket invalidates more keys than web

- **Web** `useHouseholdSync` invalidates: `pantry`, `expiring`, `receipts`, `budget`, `goals`, `bank-transactions`
- **Mobile** `useHouseholdSync` additionally invalidates: `shopping-list`, `notifications`, and `budget` on `bank_synced` events

The mobile version is more correct. Web is missing `shopping-list` and `budget` invalidation on bank sync.

---

### INC-3: Web Notification bell uses different query key format

- Dashboard layout's `NotificationBell` queries with key `["notifications"]` and URL `/api/notifications/`
- Some pages query `notificationsApi.list(true)` which also uses `/api/notifications/?unread_only=true`
- These share the same `["notifications"]` key but return different data (all vs unread only), which could cause stale cache issues.

---

### INC-4: Sidebar navigation doesn't include all pages

**Sidebar NAV** includes: Dashboard, Pantry, Money, Recipes, Receipts, Settings  
**Missing from sidebar:** Goals, Budget, Bank, Shopping, Notifications  
**Impact:** Shopping list page is only reachable through internal links or pantry page's shopping badge.

---

### INC-5: `parseFloat()` without fallback in mobile money screen

**File:** `mobile/app/(tabs)/money.tsx`  
Multiple instances of `parseFloat(reportCard.income)` where `reportCard` could be null/undefined. Some places use `|| 0` fallback, others don't. Inconsistent null safety.

---

### INC-6: Bank transaction `source` field

**File:** `backend/app/routers/bank.py`  
Uses `getattr(t, "source", "upload")` when listing transactions, suggesting the `source` field might not always exist on the model.

---

## 10. Feature Parity Matrix (Web vs Mobile)

| Feature | Web | Mobile | Notes |
|---------|:---:|:------:|-------|
| Home Dashboard | ✅ | ✅ | Equivalent |
| Receipt Scan (OCR) | ✅ Drag-drop | ✅ Camera+Gallery | Different UX, same API |
| Receipt Review/Confirm | ✅ | ✅ | |
| Post-confirm Nudge | ✅ | ✅ | |
| Receipt History | ✅ | ✅ | |
| Pantry CRUD | ✅ | ✅ | |
| Pantry Location Filter | ✅ | ✅ | |
| Shopping List | ✅ (separate page) | ✅ (tab segment + hidden screen) | |
| Expiring Items Alerts | ✅ | ✅ | |
| Budget Summary | ✅ | ✅ | |
| Budget Report Card | ✅ | ✅ | |
| Inflation Tracker | ✅ recharts line | ✅ colored bars | Different visualization |
| Bank Statement Upload | ✅ Drag-drop | ✅ Picker | |
| Plaid Integration | ✅ | ✅ | |
| Transaction List | ✅ | ✅ | |
| Reconcile (bank↔receipt) | ✅ | ✅ | |
| Goals CRUD | ✅ | ✅ | |
| Loan Calculator | ✅ | ✅ | |
| Surplus → Goals Flow | ✅ | ✅ | |
| Recipe Suggestions | ✅ | ✅ | |
| Recipe Search | ✅ | ✅ | |
| AI Chat | ✅ Floating widget | ✅ Floating modal | |
| Notifications (in-app) | ✅ Bell dropdown | ✅ Dedicated screen + profile section | |
| Push Notifications | ❌ Not implemented | ✅ Expo Push ready | Web push token API exists but no browser integration |
| Settings/Profile | ✅ | ✅ | |
| Household Management | ✅ | ✅ | |
| Data Export | ✅ Download blobs | ✅ expo-sharing | |
| Real-time Sync (WS) | ✅ | ✅ | |
| Pie Chart (categories) | ✅ recharts | ❌ | Mobile uses bar-based layout instead |

---

## 11. Summary of Findings

### By the Numbers
- **Web pages:** 12 (including login/register)
- **Mobile screens:** 11 (4 visible tabs + 7 hidden screens)
- **Backend API endpoints:** 38 across 13 routers
- **Backend services:** 8
- **WebSocket channels:** 1 (household room with 6 event types)

### Critical Bugs (data loss risk)
- **BUG-1**: Goals DELETE missing `db.commit()` — deletions don't persist
- **BUG-2**: Pantry DELETE missing `db.commit()` — deletions don't persist
- **BUG-3**: Pantry PATCH missing `db.commit()` — updates don't persist
- **BUG-4**: Pantry POST uses `flush()` not `commit()` — creates may not persist

### Important Bugs
- **BUG-5**: Budget limit default (600) always overrides household setting
- **BUG-6**: Chat context builder references wrong model field names
- **BUG-8**: Mobile bank upload passes wrong arguments

### Code Quality Issues
- 3 standalone web pages (goals, budget, bank) are weaker duplicates of Money page tabs — ~920 lines of redundant code
- 6 hidden mobile screens partially duplicate main tab content
- GoalForm interface and useElapsedSeconds hook are copy-pasted across files
- Inconsistent function naming between web and mobile API layers

### Strengths
- Excellent AI pipeline architecture (PaddleOCR → Gemini → self-correction retry → regex fallback)
- Comprehensive financial flow (receipts → pantry → budget → recipes → insights)
- Real-time sync via WebSocket with intelligent cache invalidation
- Good error boundaries (insights never fail, chat has fallback, OCR has Tesseract fallback)
- Household-scoped multi-user design is clean and consistent
- CORS 500 handler is a nice touch for developer experience
