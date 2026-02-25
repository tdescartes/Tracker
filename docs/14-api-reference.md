# API Reference

## Base URL

```
Development: http://localhost:8000/api
Production:  https://your-domain.com/api
```

All endpoints require `Authorization: Bearer <jwt>` unless noted otherwise.

---

## Authentication

| Method | Path                 | Auth | Rate Limit | Description                |
| ------ | -------------------- | ---- | ---------- | -------------------------- |
| POST   | `/api/auth/register` | None | 200/min    | Create account + household |
| POST   | `/api/auth/login`    | None | 200/min    | Login (OAuth2 form)        |
| GET    | `/api/auth/me`       | JWT  | 200/min    | Current user profile       |

### POST /api/auth/register

**Request**:

```json
{
  "email": "user@example.com",
  "password": "securepass",
  "full_name": "Jane Smith",
  "household_name": "Smith Home"
}
```

**Response** (201):

```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Smith",
    "household_id": "uuid",
    "household_name": "Smith Home"
  }
}
```

### POST /api/auth/login

**Request**: OAuth2 form (`application/x-www-form-urlencoded`)

- `username`: email
- `password`: password

**Response** (200): Same as register.

---

## Receipt Scanning

| Method | Path                   | Auth | Rate Limit | Description                |
| ------ | ---------------------- | ---- | ---------- | -------------------------- |
| POST   | `/api/receipts/upload` | JWT  | 5/min      | Upload + OCR + AI parse    |
| GET    | `/api/receipts/`       | JWT  | 200/min    | List household receipts    |
| GET    | `/api/receipts/{id}`   | JWT  | 200/min    | Get single receipt + items |

### POST /api/receipts/upload

**Request**: `multipart/form-data` with `file` field (image/pdf)

**Response** (201):

```json
{
  "receipt_id": "uuid",
  "merchant_name": "Whole Foods",
  "total_amount": 87.43,
  "purchase_date": "2026-02-20",
  "items_added": 12,
  "items": [
    {
      "name": "Organic Milk",
      "quantity": 1.0,
      "price": 5.99,
      "category": "Dairy",
      "expiration_date": "2026-02-27"
    }
  ],
  "processing_time_seconds": 4.2,
  "method": "gemini"
}
```

---

## Pantry Management

| Method | Path                            | Auth | Rate Limit | Description                        |
| ------ | ------------------------------- | ---- | ---------- | ---------------------------------- |
| GET    | `/api/pantry/items`             | JWT  | 200/min    | List all pantry items              |
| POST   | `/api/pantry/items`             | JWT  | 200/min    | Add item manually                  |
| PUT    | `/api/pantry/items/{id}`        | JWT  | 200/min    | Update item                        |
| PUT    | `/api/pantry/items/{id}/status` | JWT  | 200/min    | Change status                      |
| DELETE | `/api/pantry/items/{id}`        | JWT  | 200/min    | Delete item                        |
| GET    | `/api/pantry/expiring`          | JWT  | 200/min    | Items expiring within N days       |
| GET    | `/api/pantry/shopping-list`     | JWT  | 200/min    | Items with `on_shopping_list=true` |
| POST   | `/api/pantry/shopping-list/add` | JWT  | 200/min    | Add item to shopping list          |

---

## Budget & Spending

| Method | Path                                     | Auth | Rate Limit | Description                   |
| ------ | ---------------------------------------- | ---- | ---------- | ----------------------------- |
| GET    | `/api/budget/summary/{year}/{month}`     | JWT  | 200/min    | Monthly budget summary        |
| GET    | `/api/budget/report-card/{year}/{month}` | JWT  | 200/min    | Monthly report card           |
| GET    | `/api/budget/surplus/{year}/{month}`     | JWT  | 200/min    | Surplus + cuttable categories |
| GET    | `/api/budget/inflation/{item_name}`      | JWT  | 200/min    | Price history for item        |

### GET /api/budget/summary/{year}/{month}

**Query params**: `budget_limit` (optional, overrides household default)

**Response**:

```json
{
  "month": "2026-02",
  "total_spent": 412.5,
  "confirmed_spent": 312.5,
  "estimated_spent": 100.0,
  "budget_limit": 600.0,
  "remaining": 187.5,
  "by_category": { "Groceries": 285.0, "Dairy": 45.5 },
  "bank_category_breakdown": { "Dining": 62.0, "Transport": 38.0 },
  "waste_cost": 28.5,
  "daily_pace": 17.18,
  "on_track": true
}
```

### GET /api/budget/report-card/{year}/{month}

**Response**:

```json
{
  "month": "2026-02",
  "income": 3200.0,
  "expenses": 2860.0,
  "net": 340.0,
  "vs_last_month_expenses": 120.0,
  "vs_last_month_pct": 4.4,
  "biggest_increase_category": "Dining",
  "biggest_increase_amount": 42.0,
  "category_breakdown": { "Groceries": 285.0, "Dining": 162.0 },
  "subscriptions": [
    { "description": "Netflix", "amount": 15.99, "months_seen": 1 }
  ],
  "subscription_monthly_total": 87.0,
  "subscription_annual_total": 1044.0,
  "surplus": 340.0
}
```

---

## Bank Statements

| Method | Path                         | Auth | Rate Limit | Description                 |
| ------ | ---------------------------- | ---- | ---------- | --------------------------- |
| POST   | `/api/bank/upload-statement` | JWT  | 5/min      | Upload + parse statement    |
| GET    | `/api/bank/transactions`     | JWT  | 200/min    | List transactions (200 max) |
| POST   | `/api/bank/reconcile`        | JWT  | 200/min    | Auto-match txns to receipts |

### POST /api/bank/upload-statement

**Request**: `multipart/form-data` with `file` field (PDF/CSV/image)

**Response**:

```json
{
  "transactions_imported": 45,
  "duplicates_skipped": 3,
  "bank_name": "Chase",
  "parsing_method": "gemini",
  "subscriptions_detected": [{ "name": "Netflix", "amount": 15.99 }]
}
```

---

## Financial Goals

| Method | Path              | Auth | Rate Limit | Description                    |
| ------ | ----------------- | ---- | ---------- | ------------------------------ |
| GET    | `/api/goals/`     | JWT  | 200/min    | List goals (with calculations) |
| POST   | `/api/goals/`     | JWT  | 200/min    | Create goal                    |
| PATCH  | `/api/goals/{id}` | JWT  | 200/min    | Update goal                    |
| DELETE | `/api/goals/{id}` | JWT  | 200/min    | Delete goal                    |

---

## Recipes

| Method | Path                       | Auth | Rate Limit | Description               |
| ------ | -------------------------- | ---- | ---------- | ------------------------- |
| GET    | `/api/recipes/suggestions` | JWT  | 200/min    | Pantry-based suggestions  |
| GET    | `/api/recipes/search`      | JWT  | 200/min    | Search by name/ingredient |

**Query params for `/suggestions`**: `limit` (1-20), `expiring_first` (bool)
**Query params for `/search`**: `q` (min 2 chars), `limit` (1-10)

---

## AI Insights & Chat

| Method | Path             | Auth | Rate Limit | Description              |
| ------ | ---------------- | ---- | ---------- | ------------------------ |
| GET    | `/api/insights/` | JWT  | 200/min    | Contextual insight cards |
| POST   | `/api/chat/`     | JWT  | 200/min    | AI chat (Gemini)         |

### POST /api/chat/

**Request**:

```json
{ "message": "What should I cut to save $200?" }
```

**Response**:

```json
{ "reply": "Your Dining Out spending at $162 is up 35%..." }
```

---

## Notifications

| Method | Path                                | Auth | Rate Limit | Description           |
| ------ | ----------------------------------- | ---- | ---------- | --------------------- |
| POST   | `/api/notifications/token`          | JWT  | 200/min    | Register push token   |
| DELETE | `/api/notifications/token`          | JWT  | 200/min    | Unregister push token |
| GET    | `/api/notifications/`               | JWT  | 200/min    | List notifications    |
| POST   | `/api/notifications/{id}/read`      | JWT  | 200/min    | Mark one as read      |
| POST   | `/api/notifications/read-all`       | JWT  | 200/min    | Mark all as read      |
| POST   | `/api/notifications/trigger-expiry` | JWT  | 200/min    | Manual expiry check   |

---

## Plaid Integration (Web Only)

| Method | Path                         | Auth | Rate Limit | Description              |
| ------ | ---------------------------- | ---- | ---------- | ------------------------ |
| POST   | `/api/plaid/link-token`      | JWT  | 200/min    | Create Plaid Link token  |
| POST   | `/api/plaid/exchange-token`  | JWT  | 200/min    | Exchange public token    |
| GET    | `/api/plaid/linked-items`    | JWT  | 200/min    | List connected banks     |
| POST   | `/api/plaid/sync`            | JWT  | 200/min    | Pull latest transactions |
| DELETE | `/api/plaid/items/{item_id}` | JWT  | 200/min    | Disconnect bank          |

---

## Household Settings

| Method | Path                      | Auth | Rate Limit | Description               |
| ------ | ------------------------- | ---- | ---------- | ------------------------- |
| GET    | `/api/settings/household` | JWT  | 200/min    | Get household settings    |
| PATCH  | `/api/settings/household` | JWT  | 200/min    | Update budget limit, name |

---

## WebSocket

| Protocol | Path                                 | Auth        | Description    |
| -------- | ------------------------------------ | ----------- | -------------- |
| WS       | `/api/ws/{household_id}?token=<jwt>` | Query param | Real-time sync |

**Events**: `connected`, `pantry_updated`, `receipt_confirmed`, `goal_updated`, `bank_synced`, `ping`, `ack`

---

## Error Responses

All errors follow a consistent shape:

```json
{
  "detail": "Error description"
}
```

| Status | Meaning                            |
| ------ | ---------------------------------- |
| 400    | Bad request (validation)           |
| 401    | Unauthorized (invalid/expired JWT) |
| 404    | Resource not found                 |
| 429    | Rate limit exceeded                |
| 500    | Internal server error              |

---

## Rate Limiting

| Scope            | Limit                       |
| ---------------- | --------------------------- |
| Global (per IP)  | 200 requests/minute         |
| Upload endpoints | 5 requests/minute           |
| WebSocket        | No rate limit (event-based) |

Implemented via `slowapi` with `get_remote_address` key function. Returns `429 Too Many Requests` with `Retry-After` header.
