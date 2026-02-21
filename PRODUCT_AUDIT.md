# Tracker — Product Audit

> **Date**: February 20, 2026
> **Scope**: Full-stack audit — backend (FastAPI), web (Next.js), mobile (Expo/React Native), database (PostgreSQL)

---

## How I Approached This

Before touching code, I walked through the application the way a principal product designer would:

1. **Map every backend endpoint** — listed every API route, what it accepts, and what it returns.
2. **Walk every frontend screen** — opened each web and mobile page, traced which API calls it makes, and noted what the user actually sees.
3. **Compare the two** — does every backend capability have a corresponding UI? Does every UI action have a working backend behind it?
4. **Identify hardcoded values** — searched every file for magic numbers, inline credentials, embedded URLs, and values that should come from config or user input.
5. **Write user stories** — described what a real user can do today, step by step
6. **Build a timeline** — ordered those stories into the natural sequence a new user would follow.
7. **Flag gaps** — called out what's incomplete, what's missing, and what needs polish.

---

## 1. Hardcoded Values Found

These are values embedded directly in source code that should be configurable via environment variables, user settings, or database config.

### Backend

| File                                           | Line / Area                | Hardcoded Value                                              | Problem                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backend/app/routers/budget.py`                | `budget_summary()`         | `budget_limit: Decimal = Decimal("600.00")`                  | Default budget is $600. Users can override via query param, but there's no way to **save** a personal budget limit. It resets every request.                                         |
| `backend/app/routers/bank.py`                  | `KNOWN_SUBSCRIPTIONS` list | 16 hardcoded subscription names (`NETFLIX`, `SPOTIFY`, etc.) | Not extensible. Users can't add their own subscriptions, and new services aren't detected.                                                                                           |
| `backend/app/services/receipt_parser.py`       | `CATEGORY_MAP`             | ~30 hardcoded item→category keyword mappings                 | This is acceptable as a fallback since the Phase 2 learned-categorization system overrides it. But the fallback list is small — many common items will hit "Uncategorized".          |
| `backend/app/services/receipt_parser.py`       | `DEFAULT_SHELF_LIFE`       | Hardcoded shelf days per category (Dairy=7, Produce=5, etc.) | Never actually used — expiration dates are not being auto-populated from this map during receipt parsing.                                                                            |
| `backend/app/services/financial_calculator.py` | `insight_cut_amount=50.0`  | "What if you cut $50/month" is hardcoded                     | Should be configurable per user or proportional to their income.                                                                                                                     |
| `backend/app/services/notification_service.py` | Raw SQL everywhere         | All queries use inline `text()` SQL strings                  | Not a "value" hardcode, but fragile — no ORM models for `push_notification_tokens`, `category_overrides`, or `plaid_items`. Changes to schema require hunting through service files. |
| `backend/app/services/recipe_service.py`       | `BUILTIN_RECIPES`          | ~15 built-in recipes hardcoded in Python                     | Works as a fallback, but the recipe list is static. There's no admin interface to add more.                                                                                          |
| `backend/app/main.py`                          | CORS `allow_origins`       | `"http://localhost:8081"` hardcoded for Expo                 | Should be an env var (e.g., `MOBILE_ORIGIN`).                                                                                                                                        |
| `backend/app/routers/recipes.py`               | SQL query                  | `pi.expiry_date`, `pi.added_by_user_id`                      | Uses **wrong column names** — the ORM model defines `expiration_date` and has no `added_by_user_id` column. This endpoint will crash with a SQL error.                               |

### Web Frontend

| File                                  | Line / Area           | Hardcoded Value                              | Problem                                                                                                                                                                                               |
| ------------------------------------- | --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/lib/api.ts`                  | localStorage key      | `"hb_token"`                                 | Old "HomeBase" naming convention. Not broken, but inconsistent with the "Tracker" brand.                                                                                                              |
| `web/src/store/authStore.ts`          | localStorage key      | `"hb_token"`                                 | Same — should be `"tracker_token"` for consistency.                                                                                                                                                   |
| `web/src/hooks/useHouseholdSync.ts`   | localStorage key      | `"hb_token"`                                 | Same.                                                                                                                                                                                                 |
| `web/src/app/dashboard/page.tsx`      | budget limit          | `budget_limit ?? "600"`                      | Dashboard fallback to $600 — mirrors the backend hardcode. No user-set budget stored anywhere.                                                                                                        |
| `web/src/app/dashboard/bank/page.tsx` | Plaid check           | `api.post("/plaid/link-token")` on page load | Makes a POST request on every page mount just to check if Plaid is configured. Should be a lightweight GET health check.                                                                              |
| `web/src/app/dashboard/layout.tsx`    | notification API path | `api.get("/notifications/")`                 | Uses relative path without `/api` prefix — this will fail since `api.ts` uses `baseURL` of `http://localhost:8000`, making the actual request hit `/notifications/` instead of `/api/notifications/`. |

### Mobile

| File                            | Line / Area                  | Hardcoded Value                                      | Problem                                                                                |
| ------------------------------- | ---------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `mobile/src/lib/api.ts`         | SecureStore key              | `"hb_token"`                                         | Old "HomeBase" naming — should be `"tracker_token"`.                                   |
| `mobile/src/store/authStore.ts` | SecureStore key              | `"hb_token"`                                         | Same.                                                                                  |
| `mobile/app/(tabs)/index.tsx`   | budget limit                 | `const limit = 600;`                                 | Hardcoded $600 budget limit — not even reading from the API response's `budget_limit`. |
| `mobile/app/_layout.tsx`        | Android notification channel | `"homebase"` channel name, `"HomeBase Alerts"` label | Still using old brand name.                                                            |
| `mobile/app/_layout.tsx`        | Console log                  | `"[HomeBase] Notification received:"`                | Old brand name in log messages.                                                        |
| `mobile/app.json`               | EAS project ID               | `"your-eas-project-id"`                              | Placeholder — push notifications won't work until this is set.                         |

### Docker / Infra

| File                 | Line / Area | Hardcoded Value                                                               | Problem                                                                        |
| -------------------- | ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docker-compose.yml` | DB service  | `POSTGRES_DB: homebase_db`, `POSTGRES_USER: homebase_user`, `homebase_secret` | Still uses old "homebase" naming. Out of sync with the renamed backend `.env`. |

---

## 2. Backend ↔ Frontend Feature Parity

### What the backend offers vs. what each frontend actually exposes:

| Backend Feature              | API Route                           | Web                   | Mobile                               |
| ---------------------------- | ----------------------------------- | --------------------- | ------------------------------------ |
| Register                     | `POST /api/auth/register`           | ✅                    | ✅                                   |
| Login                        | `POST /api/auth/login`              | ✅                    | ✅                                   |
| Get current user             | `GET /api/auth/me`                  | ✅                    | ✅                                   |
| **Upload receipt (OCR)**     | `POST /api/receipts/upload`         | ✅                    | ✅                                   |
| **Confirm receipt → pantry** | `POST /api/receipts/{id}/confirm`   | ✅                    | ✅                                   |
| List receipts                | `GET /api/receipts/`                | ❌ No receipts page   | ❌ No history                        |
| List pantry items            | `GET /api/pantry/`                  | ✅                    | ✅                                   |
| Expiring soon                | `GET /api/pantry/expiring-soon`     | ✅ (dashboard)        | ✅ (home)                            |
| Shopping list                | `GET /api/pantry/shopping-list`     | ❌ No shopping page   | ✅                                   |
| Add pantry item manually     | `POST /api/pantry/`                 | ❌ No manual add form | ❌                                   |
| Update pantry item           | `PATCH /api/pantry/{id}`            | ✅ (consumed/trashed) | ✅ (consumed/trashed)                |
| Delete pantry item           | `DELETE /api/pantry/{id}`           | ❌ No delete button   | ❌                                   |
| Budget summary               | `GET /api/budget/summary/{y}/{m}`   | ✅                    | ✅ (home only — no full budget page) |
| Inflation tracker            | `GET /api/budget/inflation/{item}`  | ✅                    | ❌                                   |
| Create goal                  | `POST /api/goals/`                  | ✅                    | ❌ No goals screen                   |
| List goals                   | `GET /api/goals/`                   | ✅                    | ❌                                   |
| Delete goal                  | `DELETE /api/goals/{id}`            | ✅                    | ❌                                   |
| Upload bank statement        | `POST /api/bank/upload-statement`   | ✅                    | ❌                                   |
| List bank transactions       | `GET /api/bank/transactions`        | ✅                    | ❌                                   |
| Reconcile bank ↔ receipts    | `POST /api/bank/reconcile`          | ✅                    | ❌                                   |
| Recipe suggestions           | `GET /api/recipes/suggestions`      | ✅                    | ✅                                   |
| Recipe search                | `GET /api/recipes/search`           | ✅                    | ❌ No search bar                     |
| Register push token          | `POST /api/notifications/token`     | ❌ No web push impl   | ✅                                   |
| List notifications           | `GET /api/notifications/`           | ✅ (bell dropdown)    | ❌ No notification screen            |
| Mark notification read       | `POST /api/notifications/{id}/read` | ✅ (implicit)         | ❌                                   |
| Plaid link bank              | `POST /api/plaid/link-token`        | ✅                    | ❌                                   |
| Plaid sync transactions      | `POST /api/plaid/sync`              | ✅                    | ❌                                   |
| Plaid unlink                 | `DELETE /api/plaid/items/{id}`      | ✅                    | ❌                                   |
| WebSocket real-time sync     | `WS /api/ws/{household_id}`         | ✅                    | ❌                                   |

### Summary

- **Web covers ~85%** of backend features
- **Mobile covers ~45%** — missing: goals, bank, budget details, inflation, notifications list, recipe search, manual item add, real-time sync, Plaid

---

## 3. User Stories (What Can a User Do Today?)

### Auth

- **US-1**: As a new user, I can create an account with my name, email, password, and household name, so that I have a shared household space.
- **US-2**: As a returning user, I can sign in with email and password and be taken to my dashboard.
- **US-3**: As a user, I can sign out.

### Pantry & Receipt Scanning

- **US-4**: As a user, I can take a photo of a grocery receipt (or upload an image), and the app extracts the store name, date, items, and prices via OCR.
- **US-5**: As a user, I can review the scanned receipt data and confirm it, which adds all items to my household pantry.
- **US-6**: As a user, I can view my pantry items filtered by storage location (Fridge, Freezer, Pantry).
- **US-7**: As a user, I can mark a pantry item as "Used" or "Trashed", which auto-adds it to my shopping list.
- **US-8**: As a user, I can see which items are expiring within the next 3 days on my dashboard ("Eat Me First").

### Shopping List

- **US-9** (Mobile only): As a user, I can view my auto-generated shopping list and tap "Got it" to remove items I've purchased.

### Budget

- **US-10**: As a user, I can see my monthly grocery spending, a budget progress bar, spending by category (pie chart), and food waste cost.
- **US-11**: As a user, I can adjust the month/year and budget limit to view different periods.
- **US-12** (Web only): As a user, I can track the price history of a specific item over time (inflation tracker).

### Financial Goals

- **US-13** (Web only): As a user, I can create a savings goal (e.g., "Toyota Camry — $20,000") and the app tells me how many months it will take.
- **US-14** (Web only): As a user, I can optionally model a loan scenario with interest rate and term, and compare cash vs. loan strategies.
- **US-15** (Web only): As a user, I get an insight like "If you cut $50/month in discretionary spending, you'll reach this goal 3 months sooner."

### Bank Statements

- **US-16** (Web only): As a user, I can upload a PDF or CSV bank statement and the app imports all transactions.
- **US-17** (Web only): As a user, I can see detected recurring subscriptions and total subscription cost.
- **US-18** (Web only): As a user, I can match bank transactions to scanned receipts ("reconcile").
- **US-19** (Web only): As a user, I can connect my bank account live via Plaid for automatic transaction sync.

### Recipes

- **US-20**: As a user, I get recipe suggestions based on what's currently in my pantry, prioritizing items that are about to expire.
- **US-21** (Web only): As a user, I can search recipes by ingredient or name.

### Notifications

- **US-22** (Web only): As a user, I see a notification bell with unread count and can mark all as read.
- **US-23** (Mobile only): As a user, I receive push notifications when pantry items are about to expire.

### Real-Time Sync

- **US-24** (Web only): When a household member confirms a receipt or updates pantry, my dashboard updates in real-time via WebSocket.

---

## 4. New User Timeline (Natural Onboarding Flow)

This is the sequence a first-time user would follow based on current features:

```
Day 1: Getting Started
│
├─ 1. Register → creates account + household
├─ 2. Dashboard → sees empty state (no data yet)
├─ 3. Go to Pantry → "No items. Scan a receipt to get started."
├─ 4. Scan first grocery receipt (photo or upload)
├─ 5. Review OCR results → confirm items → items appear in pantry
│
Day 2–7: Daily Use
│
├─ 6. Check dashboard → see "Eat Me First" (expiring items)
├─ 7. Mark items as Used or Trashed
├─ 8. Shopping list auto-populates (mobile) with consumed/trashed items
├─ 9. Scan another receipt after shopping trip → pantry grows
├─ 10. Check Budget page → see monthly spending + pie chart
│
Week 2+: Power Features
│
├─ 11. Upload a bank statement (CSV/PDF) → see transactions, subscriptions
├─ 12. Reconcile bank transactions with scanned receipts
├─ 13. Connect bank via Plaid for live sync (if configured)
├─ 14. Check Recipe suggestions → cook meals using expiring items
├─ 15. Create a financial goal (e.g., new car, vacation)
├─ 16. See loan vs. cash strategy + actionable insights
│
Ongoing
│
├─ 17. Receive push notifications for expiring items (mobile)
├─ 18. Real-time sync keeps household members in sync (web)
└─ 19. Category learning improves with each receipt confirmation
```

---

## 5. Feature Status & Gaps

### ✅ Complete & Working (when DB is connected)

- User registration and login (web + mobile)
- Receipt OCR scanning and confirmation (web + mobile)
- Pantry management with location filters (web + mobile)
- Expiring items dashboard (web + mobile)
- Budget summary with category breakdown (web)
- Financial goal calculator with cash vs. loan strategies (web)
- Bank statement upload and parsing — PDF + CSV (web)
- Subscription detection from bank statements (web)
- Bank ↔ receipt reconciliation (web)
- Recipe suggestions from pantry (web + mobile)
- WebSocket real-time household sync (web)

### ⚠️ Partially Complete (Need Work)

1. **Recipe suggestions endpoint uses wrong column names**
   - `recipes.py` references `pi.expiry_date` and `pi.added_by_user_id` in raw SQL
   - ORM model has `expiration_date` (no `expiry_date`) and no `added_by_user_id` column
   - **This will crash at runtime** — needs to be fixed

2. **Notification bell API path is wrong in web layout**
   - `dashboard/layout.tsx` calls `api.get("/notifications/")` — missing `/api` prefix
   - All other endpoints use `/api/...`; this will return 404

3. **S3 upload is a placeholder**
   - `receipts.py` has a `TODO: upload to S3 using boto3` comment — local storage only works
   - Production deployment requires this to be implemented

4. **No Alembic migrations**
   - App uses `Base.metadata.create_all` for schema creation (dev-only approach)
   - Raw SQL migration files exist but aren't auto-applied by the app
   - Schema drift risk: ORM models and SQL migrations could diverge

5. **Budget limit isn't persisted**
   - $600 default budget is hardcoded, passed as query parameter
   - No database table or user setting to save a custom budget limit
   - Each page load resets to default

6. **`docker-compose.yml` still uses "homebase" naming**
   - DB name, user, password all say `homebase_*` while backend `.env` says `tracker_*`
   - Docker deployment will fail unless updated

### ❌ Not Available (Missing Features)

1. **Mobile — No goals page**
   - Backend and web have full goal CRUD; mobile has no screen for it

2. **Mobile — No bank/budget page**
   - No way to view bank transactions, upload statements, or see detailed budget on mobile

3. **Mobile — No real-time WebSocket sync**
   - Web has `useHouseholdSync` hook; mobile has nothing equivalent

4. **Mobile — No notification list screen**
   - Push tokens are registered, but there's no in-app notification list/history

5. **Mobile — No recipe search**
   - Mobile shows suggestions but has no search input

6. **Web — No shopping list page**
   - Mobile has a shopping list tab; web has no equivalent

7. **Web — No receipt history page**
   - Backend has `GET /api/receipts/` — neither web nor mobile displays past receipts

8. **Both — No manual pantry item add**
   - Backend has `POST /api/pantry/` — no frontend form uses it
   - Users can only add items by scanning receipts

9. **Both — No pantry item delete**
   - Backend has `DELETE /api/pantry/{id}` — no frontend exposes it

10. **Both — No edit pantry item details**
    - Backend `PATCH` is only used for status change (Used/Trashed)
    - No UI to edit name, category, expiration date, location, quantity

11. **Both — No household member management**
    - No invite system, no way to add a second user to a household
    - `Household` model exists but only the creator is linked

12. **Both — No user profile / settings page**
    - No way to change password, email, name, or household name
    - No way to set a default budget limit

13. **Both — No forgot password / password reset**
    - No email service configured; password reset is completely absent

14. **Web — No web push notification registration**
    - `notificationsApi.registerToken()` exists in the API layer but is never called in the web app
    - Only mobile registers push tokens

15. **Goal update (PATCH) not implemented**
    - Backend has no `PATCH /api/goals/{id}` — once created, saved_amount can never be updated
    - Users can't track progress toward a goal over time

---

## 6. Recommendations (Priority Order)

### High Priority (Bugs / Broken)

1. **Fix `recipes.py` SQL** — wrong column names will crash the endpoint
2. **Fix `dashboard/layout.tsx` notification path** — add `/api` prefix
3. **Fix `docker-compose.yml`** — rename `homebase_*` to `tracker_*`
4. **Rename `hb_token`** to `tracker_token` across web + mobile

### Medium Priority (Missing Core UX)

5. Add **manual pantry item add** form (both platforms)
6. Add **shopping list page** to web
7. Add **receipt history page** (both platforms)
8. Add **pantry item edit** form (name, expiry, location, quantity)
9. Persist **budget limit** per household in the database
10. Add **household invite** system (email or link-based)
11. Add **user settings / profile** page

### Lower Priority (Platform Parity)

12. Add **goals page** to mobile
13. Add **bank/budget page** to mobile
14. Add **WebSocket sync** to mobile
15. Add **recipe search** to mobile
16. Add **notification list** screen to mobile
17. Implement **web push notifications**

### Nice to Have (Polish)

18. Replace raw SQL in notification/plaid services with ORM models
19. Add Alembic migration framework
20. Implement S3 upload for production
21. Make subscription detection user-configurable
22. Make `insight_cut_amount` proportional to user income
23. Add **forgot password** email flow
24. Add **dark mode** support
25. Add **data export** (download your data as CSV)

---

_End of audit._
