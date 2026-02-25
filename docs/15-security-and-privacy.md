# Security & Privacy

## Overview

Tracker handles sensitive financial data — bank transactions, spending patterns, household income. Security is enforced at every layer: authentication, authorization, data isolation, transport, and rate limiting.

---

## Authentication

### JWT Flow

```
1. User registers or logs in
   POST /api/auth/register  or  POST /api/auth/login
         │
         ▼
2. Server creates JWT:
   payload = { "sub": user_id, "exp": now + 7 days }
   token = jose.jwt.encode(payload, SECRET_KEY, HS256)
         │
         ▼
3. Token returned to client:
   { "access_token": "eyJ...", "user": {...} }
         │
         ▼
4. Client stores token:
   Web:    localStorage ("tracker_token")
   Mobile: expo-secure-store (encrypted)
         │
         ▼
5. Every request includes:
   Authorization: Bearer <token>
         │
         ▼
6. Server validates on every request:
   payload = jose.jwt.decode(token, SECRET_KEY, [HS256])
   user = SELECT * FROM users WHERE id = payload.sub
   → 401 if invalid/expired/user not found
```

### Configuration

| Parameter        | Value                   | Source                                 |
| ---------------- | ----------------------- | -------------------------------------- |
| Algorithm        | HS256                   | `settings.ALGORITHM`                   |
| Secret key       | Configurable            | `settings.SECRET_KEY` (env var)        |
| Token expiry     | 7 days (10,080 minutes) | `settings.ACCESS_TOKEN_EXPIRE_MINUTES` |
| Password hashing | bcrypt                  | `passlib.context.CryptContext`         |
| Token library    | python-jose             | JWT encode/decode                      |

### Password Security

- **Hashing**: bcrypt via passlib (adaptive cost factor)
- **No plaintext storage**: Only `password_hash` column exists
- **No password in responses**: `UserOut` schema excludes password fields
- **No password logging**: Never appears in logs or error responses

---

## Authorization

### Multi-Tenant Data Isolation

Every data query includes a `household_id` filter, enforced at the application layer:

```python
# Every query pattern follows this shape:
result = await db.execute(
    select(Model).where(Model.household_id == current_user.household_id)
)
```

This means:

- **User A** in Household 1 **cannot** see Household 2's pantry, receipts, goals, or transactions
- **All CRUD operations** check `household_id` before returning or modifying data
- **Delete/Update** operations verify `household_id` ownership before executing

### WebSocket Authorization

```python
# Token validated BEFORE accepting WebSocket connection
payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
if payload.get("sub") is None:
    await websocket.close(code=4001, reason="Unauthorized")
    return
```

---

## Rate Limiting

| Scope             | Limit              | Implementation                      |
| ----------------- | ------------------ | ----------------------------------- |
| Global            | 200 req/min per IP | `slowapi` with `get_remote_address` |
| Upload (receipts) | 5 req/min per IP   | Route-level decorator               |
| Upload (bank)     | 5 req/min per IP   | Route-level decorator               |

Rate limit exceeded returns:

```
HTTP 429 Too Many Requests
Retry-After: <seconds>
```

---

## CORS Configuration

```python
allow_origins = [
    settings.FRONTEND_ORIGIN,  # e.g., http://localhost:3000
    settings.MOBILE_ORIGIN,    # e.g., http://localhost:8081
]

# Development: also match any localhost port
allow_origin_regex = r"http://localhost(:\d+)?$"  # Only when DEBUG=True

allow_credentials = True
allow_methods = ["*"]
allow_headers = ["*"]
```

### Production Hardening

In production (`DEBUG=False`):

- `allow_origin_regex` is disabled — only explicit origins allowed
- Set `FRONTEND_ORIGIN` to your actual domain (e.g., `https://tracker.yourdomain.com`)
- Remove `MOBILE_ORIGIN` if app communicates through a proxy

---

## Data Privacy Model

### What's Stored

| Data Type           | Storage                               | Encryption at Rest                   |
| ------------------- | ------------------------------------- | ------------------------------------ |
| Passwords           | bcrypt hash only                      | N/A (one-way hash)                   |
| Receipt images      | Local disk (`./uploads/`)             | No (filesystem)                      |
| OCR text            | PostgreSQL `raw_ocr_text` column      | No (database level)                  |
| Bank transactions   | PostgreSQL                            | No                                   |
| Plaid access tokens | PostgreSQL `plaid_items.access_token` | ⚠️ Plaintext — encrypt in production |
| Push tokens         | PostgreSQL                            | No                                   |
| JWT secret          | Environment variable                  | Not in database                      |

### What's NOT Stored

- Raw bank account numbers
- Full credit card numbers
- Social security numbers
- Biometric data
- Location data (GPS)

### Data Deletion

- `ON DELETE CASCADE` on household FK — deleting a household removes all associated data
- Push tokens deleted on explicit unregister (logout)
- No soft-delete pattern — records are permanently removed

---

## API Key Security

| Key                   | Storage     | Exposure           |
| --------------------- | ----------- | ------------------ |
| `SECRET_KEY`          | `.env` file | Never in responses |
| `GEMINI_API_KEY`      | `.env` file | Never in responses |
| `SPOONACULAR_API_KEY` | `.env` file | Never in responses |
| `PLAID_CLIENT_ID`     | `.env` file | Never in responses |
| `PLAID_SECRET`        | `.env` file | Never in responses |

All API keys loaded via `pydantic_settings.BaseSettings` from `.env` file. The `.env` file should be in `.gitignore` and never committed.

---

## Error Handling

### Global Exception Handler

A custom exception handler ensures that unhandled 500 errors still return proper CORS headers:

```python
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request, exc):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(status_code=500, content={"detail": "Internal error"}, headers=headers)
```

This prevents the browser from showing a CORS error instead of the actual 500, which would hide the real problem during debugging.

### Error Logging

- Unhandled exceptions logged with full traceback
- Chat AI errors logged with `exc_info=True`
- No sensitive data (passwords, tokens) in log output

---

## Production Checklist

| Item                     | Status | Action Needed                         |
| ------------------------ | ------ | ------------------------------------- |
| Change `SECRET_KEY`      | ⚠️     | Set a strong random key in production |
| Set `DEBUG=False`        | ⚠️     | Disables CORS regex, dev features     |
| Encrypt Plaid tokens     | ⚠️     | Add column-level encryption           |
| HTTPS                    | ⚠️     | Add TLS termination (nginx/Caddy)     |
| `.env` in `.gitignore`   | ✅     | Already excluded                      |
| bcrypt passwords         | ✅     | Implemented                           |
| Rate limiting            | ✅     | 200/min global, 5/min uploads         |
| CORS whitelist           | ✅     | Explicit origins only in prod         |
| JWT validation           | ✅     | Every protected endpoint              |
| Household isolation      | ✅     | All queries filtered by household_id  |
| SQL injection prevention | ✅     | SQLAlchemy parameterized queries      |
| File upload validation   | ✅     | MIME type + size checks               |

---

## Threat Model

| Threat                   | Mitigation                                        |
| ------------------------ | ------------------------------------------------- |
| Credential stuffing      | Rate limiting (200/min per IP)                    |
| JWT theft                | 7-day expiry, HTTPS in production                 |
| Cross-tenant data access | `household_id` filter on every query              |
| CSRF                     | Bearer token auth (not cookies)                   |
| SQL injection            | SQLAlchemy ORM with parameterized queries         |
| XSS                      | React auto-escaping, no `dangerouslySetInnerHTML` |
| File upload attacks      | MIME validation, isolated upload directory        |
| Brute force              | bcrypt adaptive cost factor                       |
| WebSocket hijacking      | JWT validation before connection accept           |
| Rate limit bypass        | Per-IP tracking via `get_remote_address`          |
