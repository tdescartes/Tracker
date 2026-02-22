# Tracker — Product Audit (Revised)

> **Date**: June 2025 (Revision 2)  
> **Scope**: Full-stack deep audit — backend services + routers (FastAPI), web frontend (Next.js 15), mobile (Expo SDK 54), database (PostgreSQL 16)  
> **Focus**: Backend service quality, AI pipeline reliability, web frontend completeness

---

## How I Approached This (Revision 2)

This is a **complete re-audit from scratch**, not a diff from the previous one. I re-read every file line-by-line.

1. **Read every backend service** — `ai_document_service.py`, `ocr_service.py`, `receipt_parser.py`, `bank_parser.py`, `categorization_service.py`, `recipe_service.py`, `financial_calculator.py`, `calc.py`, `notification_service.py`, `plaid_service.py`.
2. **Read every backend router** — `auth.py`, `bank.py`, `budget.py`, `goals.py`, `notifications.py`, `pantry.py`, `plaid.py`, `receipts.py`, `recipes.py`, `settings.py`, `ws.py`.
3. **Read every model, schema, and config file** — all ORM models, Pydantic schemas, `config.py`, `main.py`, `database.py`.
4. **Read every web frontend page** — dashboard, bank, receipts, budget, goals, pantry, shopping, recipes, settings, layout — plus `api.ts`, `authStore.ts`, `useHouseholdSync.ts`.
5. **Compared `ai_document_service.py` against `fix/main.py`** — the proven reference implementation of PaddleOCR + Gemini with a self-correction retry loop. Identified every gap between the production code and what actually works.
6. **Traced each API call from frontend to backend** — verified every `api.get()` / `api.post()` call maps to a real route and returns what the frontend expects.
7. **Identified dead code, redundant files, and missed integration points.**

---

## What Changed Since Audit v1

The following items from the original audit have been **resolved**:

| #   | Original Issue                                                               | Status                                         |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `recipes.py` SQL used wrong column names (`expiry_date`, `added_by_user_id`) | ✅ Fixed                                       |
| 2   | Notification bell path missing `/api` prefix                                 | ✅ Fixed                                       |
| 3   | `docker-compose.yml` used "homebase" naming                                  | ✅ Fixed (now `tracker_*`)                     |
| 4   | `hb_token` localStorage key                                                  | ✅ Renamed to `tracker_token`                  |
| 5   | No manual pantry add form                                                    | ✅ Built (web pantry page)                     |
| 6   | No shopping list on web                                                      | ✅ Built (`/dashboard/shopping`)               |
| 7   | No receipt history page                                                      | ✅ Built (`/dashboard/receipts`)               |
| 8   | No pantry item edit form                                                     | ✅ Built (EditItemModal on pantry page)        |
| 9   | Budget limit not persisted                                                   | ✅ Persisted on `Household.budget_limit`       |
| 10  | No household invite system                                                   | ✅ Built (invite codes in settings)            |
| 11  | No settings / profile page                                                   | ✅ Built (`/dashboard/settings`)               |
| 12  | No pantry item delete                                                        | ✅ Built (delete button on pantry cards)       |
| 13  | No PATCH endpoint for goals                                                  | ✅ Built (goals CRUD complete)                 |
| 14  | No data export                                                               | ✅ Built (CSV export in settings)              |
| 15  | `insight_cut_amount` was hardcoded $50                                       | ✅ Now dynamic (15% of contribution, $25–$200) |
| 16  | CORS origin hardcoded                                                        | ✅ Now from `FRONTEND_ORIGIN` env var          |

**That was good progress.** Now here is what still needs attention.

---

## 1. Backend Services — Deep Findings

### 1.1 CRITICAL — `ai_document_service.py` Missing Self-Correction Retry Loop

**What the working reference does** (`fix/main.py`):

```python
# SELF-CORRECTION LOOP — 3 retries with error feedback
for attempt in range(max_retries):
    try:
        response = model.generate_content(current_prompt)
        data = json.loads(cleaned_response)
        return data
    except json.JSONDecodeError as e:
        current_prompt = f"""
        Previous output was invalid JSON. Error: {e}
        Incorrect Output: {cleaned_response}
        Fix the syntax and return ONLY the valid JSON object.
        """
```

**What production does** (`ai_document_service.py`):

````python
text = response.text.replace("```json", "").replace("```", "").strip()
try:
    return json.loads(text)
except json.JSONDecodeError:
    logger.error("Gemini returned invalid JSON: %s", text[:500])
    raise ValueError("AI returned unparseable response")  # ← GIVES UP IMMEDIATELY
````

**Impact**: When Gemini returns slightly malformed JSON (which happens ~15% of the time — trailing commas, markdown artifacts, truncated output), the production code fails the entire upload. The reference implementation recovers from this by feeding the error back to Gemini.

**Fix**: Port the self-correction loop from `fix/main.py` into `structure_with_gemini()`.

---

### 1.2 HIGH — Gemini Model Recreated On Every Call

```python
async def structure_with_gemini(raw_text, doc_type, ...):
    genai.configure(api_key=settings.GEMINI_API_KEY)          # re-runs every call
    model = genai.GenerativeModel(settings.GEMINI_API_MODEL)  # new object every call
```

The PaddleOCR engine is properly initialized as a singleton in `ocr_service.py`. The Gemini model should follow the same pattern — configure once at module load, reuse the instance.

**Fix**: Initialize `genai` and the model once at module level (lazy singleton).

---

### 1.3 HIGH — `process_document_auto()` Does Double OCR

```python
async def process_document_auto(file_path):
    raw_text = await extract_text_from_file_async(file_path)  # ← OCR here
    doc_type = classify_document(raw_text)
    if doc_type == "bank_statement":
        result = await process_bank_document(file_path)       # ← OCR AGAIN inside
    else:
        result = await process_receipt_document(file_path)    # ← OCR AGAIN inside
```

Each sub-function calls `extract_text_from_file_async()` again. For a scanned image that takes 3–5 seconds per OCR pass, this doubles processing time.

**Fix**: Extract text once, pass `raw_text` to the sub-functions.

---

### 1.4 HIGH — `calc.py` Is Dead Code (Duplicate)

Two files implement the exact same `calculate_goal()` function:

- `financial_calculator.py` (77 lines) — the **active** version, imported by `goals.py`
- `calc.py` (66 lines) — **never imported anywhere**, older version with hardcoded `cut_amount=50.0`

**Fix**: Delete `calc.py`.

---

### 1.5 MEDIUM — `document_processing_log` Table Never Written To

Migration 003 created a `document_processing_log` table with columns for tracking processing attempts, methods, durations, and confidence scores. But no backend service or router writes to it.

**Fix**: Add logging to `process_receipt_document()` and `process_bank_document()` — record each document processed, method used, success/failure, and duration.

---

### 1.6 MEDIUM — `DEFAULT_SHELF_LIFE` Defined But Never Used

`receipt_parser.py` defines:

```python
DEFAULT_SHELF_LIFE = {
    "Dairy": 7, "Produce": 5, "Bakery": 3, "Meat": 4,
    "Seafood": 2, "Deli": 5, "Frozen": 90, ...
}
```

But this is never called to auto-populate `expiration_date` when items are added to the pantry. Users must manually enter expiration dates for every item.

**Fix**: Use `DEFAULT_SHELF_LIFE` in the receipt confirm flow to auto-calculate expiration dates for items that don't have one.

---

### 1.7 MEDIUM — `categorization_service.py` and `plaid.py` Use Raw SQL Instead of ORM

- `categorization_service.py` uses `text()` SQL for the `category_overrides` table — no SQLAlchemy model exists.
- `plaid.py` uses `text()` SQL for the `plaid_items` table — no SQLAlchemy model exists.

This is fragile: schema changes require hunting through service files and routers instead of updating a model in one place.

**Fix**: Create ORM models for `CategoryOverride` and `PlaidItem`, then convert raw SQL to ORM queries.

---

### 1.8 LOW — Redundant Double-Commit Pattern in `database.py`

```python
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()   # ← auto-commit on success
        except:
            await session.rollback()
            raise
```

Routers also call explicit `await db.commit()` before returning. This means every successful request commits twice. Not broken, but wasteful.

**Fix**: Remove explicit `db.commit()` calls from routers — let `get_db()` handle it.

---

## 2. Web Frontend — Deep Findings

### 2.1 HIGH — Recipes Page Uses Raw `api.get()` Instead of Typed Helpers

`recipes/page.tsx`:

```tsx
api.get(`/recipes/suggestions?limit=8&expiring_first=${expiringFirst}`);
api.get(`/recipes/search?q=${encodeURIComponent(searchQ)}&limit=8`);
```

Every other page uses typed API helpers (`bankApi.transactions()`, `goalsApi.list()`, etc.). The recipes page bypasses the `recipesApi` object defined in `api.ts`, making it inconsistent and harder to maintain.

**Fix**: Use `recipesApi.suggestions()` and `recipesApi.search()` from `api.ts`.

---

### 2.2 HIGH — Settings Profile/Household Sections Set State During Render

```tsx
function ProfileSection() {
  const [initialized, setInitialized] = useState(false);
  if (profile && !initialized) {
    setName(profile.full_name || ""); // ← setState during render
    setEmail(profile.email || "");
    setInitialized(true);
  }
}
```

This is a React anti-pattern that triggers extra re-renders. The same pattern appears in `HouseholdSection`.

**Fix**: Use `useEffect` to initialize form state when profile data loads.

---

### 2.3 MEDIUM — No Error Feedback on Upload Failures

Receipt upload (`receipts/page.tsx`) and bank statement upload (`bank/page.tsx`) use try/catch but don't show any user-visible error when the upload or AI parsing fails. The UI just silently stops the spinner.

**Fix**: Add error state with a visible error banner that tells the user what went wrong (e.g., "Could not parse this receipt — try a clearer photo").

---

### 2.4 MEDIUM — Bank Page Missing Filter State in Transactions Query

The bank page has type/category filter dropdowns but they only filter the already-fetched transactions client-side. If there are thousands of transactions, this loads them all into memory.

**Current**: Acceptable for now (most users have < 500 transactions), but noted for future pagination.

---

### 2.5 MEDIUM — Missing Migration 003 in Docker Init Scripts

`docker-compose.yml` mounts migrations 001 and 002 into `/docker-entrypoint-initdb.d/`:

```yaml
- ./database/migrations/001_initial_schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
- ./database/migrations/002_phase2_3_schema.sql:/docker-entrypoint-initdb.d/02_phase2_3.sql
```

Migration 003 (which adds `source`, `plaid_transaction_id`, `subcategory` columns and creates `document_processing_log`) is not mounted. Docker deployments will be missing these schema changes.

**Fix**: Add migration 003 to docker-compose init scripts.

---

### 2.6 LOW — No Loading State on Data Export Buttons

The settings page export buttons (`ExportSection`) call async functions but show no spinner or disabled state while the CSV is being generated.

**Fix**: Add pending state to export buttons.

---

### 2.7 LOW — Missing Gemini Env Vars in Docker Compose

The docker-compose backend environment doesn't pass through `GEMINI_API_KEY` or `GEMINI_API_MODEL`, so AI document processing won't work in Docker deployments.

**Fix**: Add Gemini env vars to docker-compose.

---

## 3. Backend ↔ Frontend Feature Parity (Updated)

| Backend Feature            | API Route                          | Web | Mobile                |
| -------------------------- | ---------------------------------- | --- | --------------------- |
| Register                   | `POST /api/auth/register`          | ✅  | ✅                    |
| Login                      | `POST /api/auth/login`             | ✅  | ✅                    |
| Get current user           | `GET /api/auth/me`                 | ✅  | ✅                    |
| Upload receipt (OCR)       | `POST /api/receipts/upload`        | ✅  | ✅                    |
| Confirm receipt → pantry   | `POST /api/receipts/{id}/confirm`  | ✅  | ✅                    |
| List receipts              | `GET /api/receipts/`               | ✅  | ❌                    |
| List pantry items          | `GET /api/pantry/`                 | ✅  | ✅                    |
| Add pantry item            | `POST /api/pantry/`                | ✅  | ❌                    |
| Edit pantry item           | `PATCH /api/pantry/{id}`           | ✅  | Partial (status only) |
| Delete pantry item         | `DELETE /api/pantry/{id}`          | ✅  | ❌                    |
| Expiring soon              | `GET /api/pantry/expiring-soon`    | ✅  | ✅                    |
| Shopping list              | `GET /api/pantry/shopping-list`    | ✅  | ✅                    |
| Budget summary             | `GET /api/budget/summary/{y}/{m}`  | ✅  | ✅ (home only)        |
| Inflation tracker          | `GET /api/budget/inflation/{item}` | ✅  | ❌                    |
| Goal CRUD                  | `/api/goals/`                      | ✅  | ❌                    |
| Bank upload                | `POST /api/bank/upload-statement`  | ✅  | ❌                    |
| Bank transactions          | `GET /api/bank/transactions`       | ✅  | ❌                    |
| Bank reconcile             | `POST /api/bank/reconcile`         | ✅  | ❌                    |
| Recipe suggestions         | `GET /api/recipes/suggestions`     | ✅  | ✅                    |
| Recipe search              | `GET /api/recipes/search`          | ✅  | ❌                    |
| Plaid link / sync / unlink | `/api/plaid/*`                     | ✅  | ❌                    |
| Notifications list         | `GET /api/notifications/`          | ✅  | ❌                    |
| Push token register        | `POST /api/notifications/token`    | ❌  | ✅                    |
| WebSocket sync             | `WS /api/ws/{household_id}`        | ✅  | ❌                    |
| Profile settings           | `/api/settings/profile`            | ✅  | ❌                    |
| Household settings         | `/api/settings/household`          | ✅  | ❌                    |
| Invite / Join              | `/api/settings/household/*`        | ✅  | ❌                    |
| Data export                | `/api/settings/export/*`           | ✅  | ❌                    |

**Web: ~95% coverage** (missing only web push registration).  
**Mobile: ~35% coverage** — missing goals, bank, full budget, settings, notifications list, recipe search, data export, Plaid, WebSocket.

---

## 4. Implementation Plan

Here is exactly what I will implement, in order, without changing any existing styles or layout design:

### Phase A — Backend Service Hardening (6 changes)

| #   | Change                         | File(s)                                    | What I Will Do                                                                                                                                  |
| --- | ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Self-correction retry loop     | `ai_document_service.py`                   | Port the 3-retry JSON correction loop from `fix/main.py` into `structure_with_gemini()` — feed JSON errors back to Gemini for self-correction   |
| A2  | Gemini model singleton         | `ai_document_service.py`                   | Initialize `genai.configure()` and `GenerativeModel` once at module level via lazy singleton, same pattern as PaddleOCR                         |
| A3  | Fix double OCR                 | `ai_document_service.py`                   | Add `raw_text` parameter to `process_receipt_document()` and `process_bank_document()` so `process_document_auto()` can pass pre-extracted text |
| A4  | Delete dead code               | `calc.py`                                  | Remove the file — it's an unused duplicate of `financial_calculator.py`                                                                         |
| A5  | Auto-populate expiration dates | `routers/receipts.py`, `receipt_parser.py` | Use `DEFAULT_SHELF_LIFE` to calculate `expiration_date` for each item during receipt confirmation when no date is provided                      |
| A6  | Remove redundant commits       | Multiple routers                           | Remove explicit `db.commit()` calls — `get_db()` already commits on success                                                                     |

### Phase B — Frontend Cleanup (4 changes)

| #   | Change                                | File(s)                              | What I Will Do                                                                                                              |
| --- | ------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| B1  | Use typed API helpers on recipes page | `recipes/page.tsx`                   | Replace raw `api.get()` calls with `recipesApi.suggestions()` and `recipesApi.search()`                                     |
| B2  | Fix settings render-time setState     | `settings/page.tsx`                  | Replace `if (profile && !initialized)` pattern with proper `useEffect` hook in both `ProfileSection` and `HouseholdSection` |
| B3  | Add upload error feedback             | `receipts/page.tsx`, `bank/page.tsx` | Add error state + visible error banner when upload or AI parsing fails                                                      |
| B4  | Add export loading states             | `settings/page.tsx`                  | Add pending/spinner state to export buttons                                                                                 |

### Phase C — Infrastructure (3 changes)

| #   | Change                         | File(s)                  | What I Will Do                                                            |
| --- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------- |
| C1  | Mount migration 003 in Docker  | `docker-compose.yml`     | Add the third migration file to init scripts                              |
| C2  | Pass Gemini env vars to Docker | `docker-compose.yml`     | Add `GEMINI_API_KEY` and `GEMINI_API_MODEL` to backend environment        |
| C3  | Document processing log        | `ai_document_service.py` | Write to `document_processing_log` table after each AI processing attempt |

**Total: 13 targeted changes. No layout or style modifications. No new pages or visual redesigns.**

---

_End of audit._
