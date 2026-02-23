# Tracker — Product Documentation

> **Last Updated**: February 22, 2026  
> **Stack**: FastAPI + PostgreSQL | Next.js 15 | Expo SDK 54  
> **Status**: Functional MVP — all core flows working

---

## What Is Tracker?

Tracker connects your grocery spending to what's actually in your kitchen. Scan a receipt, and the app tracks your food, tells you what to cook before things expire, shows where your money goes, and nudges you when you're about to waste something.

**One sentence**: The app that makes your grocery spending feel obvious.

---

## User Stories

### As a new user, I can...

1. **Register and create a household** — email/password, household name
2. **Invite family members** — generate an invite code, share it, they join
3. **Set a monthly grocery budget** — stored on the household, shared by all members

### As a daily user, I can...

4. **Scan a grocery receipt** — take a photo or pick from gallery, AI extracts items + prices
5. **Review and confirm items** — edit names/prices/categories before saving to pantry
6. **See a post-scan budget nudge** — "$X added to pantry. Groceries this month: $Y / $Z. You're on pace."
7. **Check my dashboard** — see what's expiring, budget health, recipe suggestion, weekly summary
8. **View my pantry** — filter by location (fridge/freezer/pantry), see expiry dates, swipe to mark used/trashed
9. **Get recipe suggestions** — based on what's in my pantry, prioritizing expiring items
10. **Add items manually** — bottom sheet form for items not from receipts

### As a budget-conscious user, I can...

11. **Upload a bank statement** — PDF, CSV, or photo. AI parses transactions
12. **See a report card after upload** — income, expenses, net, vs last month, surplus
13. **View honest budget breakdown** — confirmed (receipt) vs estimated (bank-only) spending
14. **Track spending by category** — see where money goes with visual breakdowns
15. **Set savings goals** — target amount, monthly contribution, deadline, loan scenarios
16. **Move surplus to goals** — one-tap "Move $X → Goal" when there's leftover budget
17. **See detected subscriptions** — auto-flagged recurring charges from bank data
18. **Track price inflation** — search any item, see price history over time

### As someone who wants advice, I can...

19. **Ask the AI assistant anything** — floating chat on every screen, powered by Gemini with full household context
20. **Get contextual nudges** — budget pace alerts, expiring item warnings, waste cost, surplus→goal suggestions
21. **See insights on my dashboard** — color-coded cards: budget pace, category trends, expiry warnings

### As a household manager, I can...

22. **Edit profile and password** — in settings/profile
23. **Manage household members** — see who's in the household, invite new members
24. **Export data as CSV** — pantry items and bank transactions
25. **Connect bank via Plaid** — auto-sync transactions (sandbox mode)
26. **Reconcile receipts with bank transactions** — match scanned receipts to bank charges

---

## User Timeline — How Someone Approaches Tracker

```
Day 1: Sign up → Scan first receipt → "Oh cool, it pulled out all my items"
       → Confirm to pantry → See budget nudge

Day 2: Open app → Dashboard says "Milk expires tomorrow"
       → Tap recipe suggestion → Cook it → Mark milk as "Used"

Day 3: Upload bank statement (PDF from email)
       → See report card: "You earned $3,200, spent $2,800, net +$400"
       → Check budget breakdown: "Groceries $340 / $600 — on track"

Week 2: Create a savings goal: "Vacation: $2,000"
        → Dashboard shows surplus: "$400 available"
        → One tap: "Move $200 → Vacation"

Week 3: Ask AI: "Can I afford to eat out this weekend?"
        → AI: "You've spent $420 of $600 with 10 days left.
           You're $15 over pace. Maybe cook with what's expiring instead."

Month 2: App feels natural. Scan receipts, check expiry, cook recipes.
         Budget nudges keep spending in check. Goals track progress.
         Household members collaborate on shared pantry + shopping list.
```

---

## Feature Map — What's Built

### Fully Working

| Feature | Web | Mobile | Backend |
|---------|-----|--------|---------|
| Auth (register, login, JWT) | ✅ | ✅ | ✅ |
| Receipt scan (OCR + AI parsing) | ✅ | ✅ | ✅ |
| Receipt confirm → pantry | ✅ | ✅ | ✅ |
| Post-confirm budget nudge | ✅ | ✅ | ✅ |
| Pantry list + filters | ✅ | ✅ | ✅ |
| Pantry add/edit/delete | ✅ | ✅ | ✅ |
| Expiring items tracking | ✅ | ✅ | ✅ |
| Shopping list (auto + manual) | ✅ | ✅ | ✅ |
| Budget summary (honest split) | ✅ | ✅ | ✅ |
| Bank statement upload + parse | ✅ | ✅ | ✅ |
| Post-upload report card | ✅ | ✅ | ✅ |
| Bank transactions list | ✅ | ✅ | ✅ |
| Receipt ↔ bank reconciliation | ✅ | ✅ | ✅ |
| Unmatched tx banner | ✅ | ✅ | ✅ |
| Savings goals CRUD | ✅ | ✅ | ✅ |
| Surplus → goal one-tap | ✅ | ✅ | ✅ |
| Recipe suggestions | ✅ | ✅ | ✅ |
| Recipe search | ✅ | ✅ | ✅ |
| Price inflation tracker | ✅ | ✅ | ✅ |
| Contextual insights/nudges | ✅ | ✅ | ✅ |
| Floating AI chat assistant | ✅ | ✅ | ✅ |
| Smart dashboard (4 cards) | ✅ | ✅ | ✅ |
| Notifications (bell + list) | ✅ | ✅ | ✅ |
| Push notification registration | — | ✅ | ✅ |
| WebSocket real-time sync | ✅ | ✅ | ✅ |
| Settings (profile, password) | ✅ | ✅ | ✅ |
| Household (name, budget, invite) | ✅ | ✅ | ✅ |
| Member management | ✅ | ✅ | ✅ |
| CSV data export | ✅ | ✅ | ✅ |
| Plaid bank linking | ✅ | ✅ | ✅ |

### Navigation Structure

**Web sidebar (6 items):** Home, Pantry, Money, Receipts, Recipes, Settings

**Mobile tab bar (4 tabs + FAB):** Home, Pantry, Money, Profile — center FAB for Scan

---

## What Was Just Fixed (Revision 4)

### AI Chat Assistant — 5 Bugs Fixed

The floating AI chat button was present on both web and mobile but **crashed on every request**. Root causes:

| Bug | What Was Wrong | Fix |
|-----|---------------|-----|
| 1 | Used `PantryStatus.ACTIVE` — doesn't exist (enum: UNOPENED, OPENED, CONSUMED, TRASHED) | Changed to `PantryItem.status.in_([UNOPENED, OPENED])` |
| 2 | Used `PantryItem.expiry_date` — column is `expiration_date` | Fixed column name |
| 3 | Hardcoded model `"gemini-2.0-flash"` instead of `settings.GEMINI_API_MODEL` | Now uses config value |
| 4 | Created separate rate limiter instance causing routing conflicts | Removed private limiter, uses app's global 200/min |
| 5 | Suggestion chips only filled input without sending | Web: `handleSend(q)` auto-sends. Mobile already correct |

**Also improved:**
- Gemini model initialized as lazy singleton (one instance reused, not recreated per request)
- Household budget limit included in AI context (AI can now answer "am I on track?")

---

## Honest Feature Assessment

### Complete & Polished

- **Receipt → Pantry → Recipe pipeline** — the core loop works end-to-end with budget context after each scan
- **Bank → Budget → Goals pipeline** — upload, report card, honest budget split, surplus routing to goals
- **Smart dashboard** — Action Needed, Budget Pulse, Tonight's Pick, This Week cards
- **Mobile interactions** — swipe gestures, haptic feedback, bottom sheets, toast notifications, skeleton screens

### Working But Could Be Better

| Feature | Issue | Impact |
|---------|-------|--------|
| **Onboarding** | First-time user sees empty states with basic text. No guided walkthrough | Users may not know what to do first |
| **Receipt editing** | Can edit items before confirm, but no way to add missed items | If OCR misses an item, user can't add it in review |
| **Recipes** | Suggestions are based on pantry ingredients but source is Spoonacular API or hardcoded fallback | Quality depends on API key being set |
| **Plaid** | Sandbox mode only. No production bank linking | Users can't auto-sync real bank data yet |
| **Web push notifications** | Backend sends push tokens but web doesn't register for them | Web users don't get push alerts |
| **Orphaned web pages** | `/dashboard/goals`, `/dashboard/budget`, `/dashboard/bank` still exist but are not in sidebar | Dead routes that duplicate content in `/dashboard/money` |

### Not Built Yet

| Feature | Why It Matters |
|---------|---------------|
| **Dark mode** | Common expectation, especially for kitchen/nighttime use |
| **Offline support** | App doesn't work without internet — problem for in-store use |
| **Multi-currency** | `currency_code` field exists on Household model but nothing uses it |
| **Receipt photo in history** | Receipt list shows date/store/total but not the original image |
| **Barcode scanning** | Could auto-identify products and pre-fill categories/shelf life |
| **Household activity feed** | WebSocket exists but no visible feed of "Sarah added 6 items from Costco" |
| **Custom categories** | Category overrides table exists in DB but no UI to manage them |
| **Weekly/monthly email digest** | No scheduled summary emails. Backend scheduler exists but only does expiry checks |

---

## Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   Next.js    │    │  Expo/React  │    │    Plaid     │
│   Web App    │    │  Native App  │    │   Sandbox    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └──────────┬────────┴───────────────────┘
                  │
           ┌──────▼───────┐
           │   FastAPI     │
           │   Backend     │
           │               │
           │  13 Routers   │
           │  8 Services   │
           │  4 Models     │
           └──────┬────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
   ┌────▼───┐ ┌──▼────┐ ┌──▼─────┐
   │ Postgres│ │Gemini │ │Paddle  │
   │   DB    │ │  AI   │ │  OCR   │
   └─────────┘ └───────┘ └────────┘
```

### Backend (38 API Endpoints)

| Router | Endpoints | Purpose |
|--------|-----------|---------|
| `auth.py` | 3 | Register, login, get current user |
| `receipts.py` | 3 | Upload (OCR+AI), confirm→pantry, list |
| `pantry.py` | 6 | List, add, edit, delete, expiring, shopping list |
| `budget.py` | 4 | Summary, report card, surplus, inflation |
| `bank.py` | 3 | Upload statement, list transactions, reconcile |
| `goals.py` | 4 | List, create, update, delete |
| `recipes.py` | 2 | Suggestions, search |
| `insights.py` | 1 | Contextual nudges (6 generators) |
| `chat.py` | 1 | AI chat with household context |
| `notifications.py` | 5 | List, mark read, mark all, register/unregister token |
| `plaid.py` | 5 | Link token, exchange, linked items, sync, unlink |
| `settings.py` | 8 | Profile, password, household, invite, join, members, 2 exports |
| `ws.py` | 1 | WebSocket for real-time household sync |

### Services

| Service | Purpose |
|---------|---------|
| `ai_document_service.py` | PaddleOCR + Gemini pipeline with self-correction retry |
| `ocr_service.py` | PaddleOCR singleton for text extraction |
| `receipt_parser.py` | Parse structured receipt data, default shelf life |
| `bank_parser.py` | Parse bank statement transactions |
| `categorization_service.py` | Auto-categorize items with learning overrides |
| `recipe_service.py` | Recipe suggestions from pantry ingredients |
| `financial_calculator.py` | Goal projections, loan vs cash analysis |
| `notification_service.py` | Push notifications, expiry alerts |
| `plaid_service.py` | Plaid API integration for bank linking |

### Database (PostgreSQL 18)

| Table | Purpose |
|-------|---------|
| `households` | Household with budget_limit, currency, invite_code |
| `users` | User accounts linked to households |
| `receipts` | Scanned receipt metadata |
| `pantry_items` | Food items with expiry, price, location, status |
| `financial_goals` | Savings goals with loan scenario support |
| `bank_transactions` | Parsed bank transactions with subscription flags |
| `product_catalog` | Shared product database (grows with usage) |
| `notifications` | Push notification queue |
| `category_overrides` | User-specific category corrections |
| `plaid_items` | Linked Plaid bank connections |
| `document_processing_log` | AI processing audit trail |

---

## Environment Setup

### Required

```env
DATABASE_URL=postgresql+asyncpg://tracker_user:password@localhost:5432/tracker_db
SECRET_KEY=your-jwt-secret
GEMINI_API_KEY=your-google-ai-key
```

### Optional

```env
GEMINI_API_MODEL=gemini-3-flash-preview   # default in config
SPOONACULAR_API_KEY=                       # for recipe suggestions
PLAID_CLIENT_ID=                           # for bank linking
PLAID_SECRET=
FRONTEND_ORIGIN=http://localhost:3000
MOBILE_ORIGIN=http://localhost:8081
```

### Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Web
cd web
npm install
npm run dev

# Mobile
cd mobile
npm install
npx expo start
```

### Docker

```bash
docker-compose up --build
```

---

## UX Design Principles

1. **The app should talk first.** Every screen leads with a sentence that tells the user something they didn't know. Not "here are your pantry items" — rather "You have 3 items expiring tomorrow."

2. **One primary action per screen.** Home = "Scan a receipt." Pantry = "What should I cook?" Money = "Am I on track?"

3. **Proactive > Reactive.** Expiring items appear on home. Budget warnings appear when you scan a receipt. Recipe ideas appear when you open the pantry.

4. **Mobile-first interactions.** Camera scan is one tap (FAB). Swipe gestures for quick actions. Haptic feedback. Bottom sheets instead of full pages.

5. **Reduce navigation depth.** 4 tabs + FAB, not 9. Organized around moments ("what should I cook?"), not database tables ("goals tab").

---

## Screen-by-Screen Walkthrough

### Home (Dashboard)

Smart daily briefing with 4 cards:
- **Action Needed** — expiring items + recipe suggestion (only shows when relevant)
- **Budget Pulse** — spending vs limit with pace indicator
- **Tonight's Pick** — single recipe recommendation from expiring ingredients
- **This Week** — receipts scanned, items used, waste cost, savings progress
- **Contextual Insights** — AI-generated nudges (budget pace, category trends, waste alerts)

### Pantry

Living inventory with two modes:
- **In Stock** — all active items, grouped by expiry urgency, filterable by location
- **Shopping List** — auto-populated when items are consumed/trashed, plus manual adds
- Swipe left = Used (green), swipe right = Trash (red)
- Long press → Edit, Move, Shopping List, Delete
- [+] button → bottom sheet add form
- Expiring items pinned to top

### Money (Budget + Transactions + Goals)

Three segments in one tab:
- **Budget** — honest confirmed/estimated split, pace indicator, category breakdown, subscription detection
- **Transactions** — bank statement upload, transaction list with filters, matched/unmatched indicators
- **Goals** — CRUD with loan vs cash analysis, surplus routing, progress bars

### Scan (FAB)

Center floating action button on every screen:
- Opens camera immediately
- AI extracts items via PaddleOCR + Gemini
- Review screen: edit merchant, date, prices, categories
- Confirm → items go to pantry → budget nudge appears
- Return to previous screen

### Recipes

Recipe suggestions based on pantry contents:
- Prioritizes recipes using expiring items
- Search by ingredient or dish name
- Shows how many ingredients you have vs need
- "Add missing to shopping list" action

### Profile/Settings

Everything about "me and my household":
- Profile (name, email) + password change
- Household (name, budget limit, currency)
- Invite members (generate code) + join (enter code)
- Member list
- CSV export (pantry, transactions)
- Notification preferences
- Sign out

### AI Chat (Floating)

Bottom-right button on every dashboard screen:
- Opens a chat panel with message history
- Suggestion chips for quick questions
- Powered by Gemini with full household context (pantry, budget, goals, waste, subscriptions)
- 2-4 sentence concise, actionable responses

---

## Revision History

| Rev | Date | Summary |
|-----|------|---------|
| 1 | Feb 2026 | Initial audit — found 16 issues, all resolved |
| 2 | Feb 2026 | Re-audit — identified 13 changes (Phases A-C) |
| 3 | Feb 2026 | Full rebuild — Phases A-K (65 changes), 5 connected financial flows |
| 4 | Feb 2026 | Fixed AI chat (5 bugs), user stories, timeline, honest feature assessment |
