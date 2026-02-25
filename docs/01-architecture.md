# System Architecture

## High-Level Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Next.js Web    │     │  Expo Mobile App │
│   (Port 3000)    │     │  (Port 8081)     │
└────────┬─────────┘     └────────┬─────────┘
         │  HTTP + WebSocket      │  HTTP + WebSocket
         └───────────┬────────────┘
                     ▼
         ┌───────────────────────┐
         │   FastAPI Backend     │
         │   (Port 8000)        │
         │                       │
         │  ┌─────────────────┐  │
         │  │  13 Routers     │  │
         │  │  ~45 Endpoints  │  │
         │  │  1 WebSocket    │  │
         │  └────────┬────────┘  │
         │           │           │
         │  ┌────────▼────────┐  │
         │  │  8 Services     │  │
         │  │  AI Pipeline    │  │
         │  │  OCR Engine     │  │
         │  └────────┬────────┘  │
         └───────────┼───────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
┌────────┐   ┌────────────┐   ┌───────────┐
│ Postgres│   │ PaddleOCR  │   │  Gemini   │
│  16     │   │ (on-box)   │   │  Flash    │
│ 8+3    │   │            │   │  (Google) │
│ tables  │   └────────────┘   └───────────┘
└────────┘
```

---

## Tech Stack

### Backend

| Layer             | Technology                          | Purpose                                  |
| ----------------- | ----------------------------------- | ---------------------------------------- |
| **Framework**     | FastAPI 0.115                       | Async REST API + WebSocket               |
| **Runtime**       | Python 3.12, uvicorn                | ASGI server                              |
| **ORM**           | SQLAlchemy 2.0 + asyncpg            | Async PostgreSQL access                  |
| **Database**      | PostgreSQL 16-alpine                | Primary data store                       |
| **OCR**           | PaddleOCR 3.0                       | On-device optical character recognition  |
| **AI/LLM**        | Google Gemini Flash                 | Receipt/bank statement structuring, chat |
| **Auth**          | python-jose (JWT), passlib (bcrypt) | Token-based authentication               |
| **Scheduling**    | APScheduler                         | Daily expiry notification cron           |
| **Rate Limiting** | slowapi                             | 200/min global, 5/min uploads            |
| **Validation**    | Pydantic v2                         | Request/response schemas                 |

### Web Frontend

| Layer             | Technology              | Purpose                                  |
| ----------------- | ----------------------- | ---------------------------------------- |
| **Framework**     | Next.js 15 (App Router) | File-based routing, SSR-ready            |
| **Styling**       | Tailwind CSS 3          | Utility-first CSS                        |
| **State**         | Zustand                 | Lightweight client state (auth)          |
| **Data Fetching** | TanStack React Query    | Cache, stale-while-revalidate, mutations |
| **HTTP**          | Axios                   | API client with JWT interceptor          |
| **Charts**        | Recharts                | PieChart, LineChart for budget           |
| **File Upload**   | react-dropzone          | Receipt/statement drag-and-drop          |
| **Icons**         | Lucide React            | Sidebar + navigation icons               |
| **Real-time**     | Native WebSocket        | Household sync                           |

### Mobile Frontend

| Layer             | Technology                      | Purpose                          |
| ----------------- | ------------------------------- | -------------------------------- |
| **Framework**     | Expo SDK 54, React Native 0.81  | Cross-platform mobile            |
| **Routing**       | expo-router (file-based)        | Tab + auth navigation            |
| **State**         | Zustand + expo-secure-store     | Auth tokens in secure storage    |
| **Data Fetching** | TanStack React Query            | Same as web                      |
| **Camera**        | expo-image-picker               | Receipt photo capture            |
| **Documents**     | expo-document-picker            | Bank statement upload            |
| **Haptics**       | expo-haptics                    | Tactile feedback on interactions |
| **Push**          | expo-notifications              | Expiry alerts                    |
| **Sharing**       | expo-sharing + expo-file-system | Export CSV, invite codes         |
| **Toast**         | react-native-toast-message      | Success/error feedback           |

### Infrastructure

| Component           | Technology                                  | Configuration                |
| ------------------- | ------------------------------------------- | ---------------------------- |
| **Orchestration**   | Docker Compose 3.9                          | 3 services: db, backend, web |
| **Database Volume** | Named volume `postgres_data`                | Persistent across restarts   |
| **Upload Volume**   | Named volume `uploads_data`                 | Receipt images               |
| **Backend Memory**  | 512MB reserved, 2GB limit                   | PaddleOCR model (~100MB)     |
| **Health Checks**   | PostgreSQL `pg_isready`, Backend HTTP probe | 30s interval                 |

---

## Application Layers

### Layer 1: Presentation (Web + Mobile)

Both frontends follow the same data architecture:

```
┌─────────────────────────────────────────┐
│  Pages / Screens                        │
│  ┌───────────────────────────────────┐  │
│  │  TanStack Query (cache layer)     │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  API Client (Axios + JWT)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────────┐  │
│  │ Auth Store   │ │ Household Sync   │  │
│  │ (Zustand)    │ │ (WebSocket)      │  │
│  └──────────────┘ └──────────────────┘  │
└─────────────────────────────────────────┘
```

**Query Key Naming Convention**: `["entity", ...params]` — e.g., `["budget", 2026, 2]`, `["pantry", "FRIDGE"]`

**Cache Invalidation Strategy**: WebSocket events trigger targeted `queryClient.invalidateQueries()` calls, keeping all connected clients in sync without polling.

### Layer 2: API (FastAPI)

```
Request → Rate Limiter → CORS → JWT Auth → Router → Service → Database
                                                         ↓
                                                   AI Pipeline
                                                   (OCR + LLM)
```

**13 Router modules** organized by domain:

- **Core**: auth, settings
- **Inventory**: pantry, receipts, recipes
- **Finance**: budget, bank, goals, plaid
- **Intelligence**: insights, chat
- **System**: notifications, ws (WebSocket)

### Layer 3: Services

| Service                  | Type             | Concurrency                           |
| ------------------------ | ---------------- | ------------------------------------- |
| `ai_document_service`    | Hybrid OCR + LLM | Thread pool: 2 OCR + 2 Gemini workers |
| `ocr_service`            | CPU-bound        | Singleton PaddleOCR model             |
| `receipt_parser`         | Regex fallback   | Synchronous                           |
| `bank_parser`            | Regex fallback   | Synchronous                           |
| `categorization_service` | Learning engine  | SQL upsert                            |
| `financial_calculator`   | Pure math        | Stateless                             |
| `notification_service`   | Push + in-app    | Expo HTTP API                         |
| `recipe_service`         | Matching engine  | In-memory recipe DB                   |
| `plaid_service`          | External API     | Plaid SDK                             |

### Layer 4: Data (PostgreSQL)

**8 ORM-managed tables**: households, users, receipts, pantry_items, product_catalog, financial_goals, bank_transactions, notifications, push_notification_tokens

**3 raw SQL tables**: plaid_items, category_overrides, document_processing_log

**Multi-tenant model**: All data scoped by `household_id`. Users join households via invite codes.

---

## AI Pipeline Architecture

The AI pipeline is the core differentiator. It processes two document types through a unified pipeline:

```
Input Document
      │
      ▼
┌─────────────────┐
│  Text Extraction │
│  Chain:          │
│  1. pdfplumber   │  ← Digital PDFs (fast, accurate)
│  2. PaddleOCR    │  ← Scanned/photo documents
│  3. Tesseract    │  ← Last-resort fallback
└────────┬────────┘
         │  raw text
         ▼
┌─────────────────┐
│  Classification  │  ← Keyword heuristic: "total" → receipt, "balance" → bank
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Receipt    Bank Statement
    │         │
    ▼         ▼
┌─────────────────┐
│  Gemini Flash    │
│  Structuring     │
│                  │
│  • JSON schema   │
│  • Self-correct  │  ← Up to 3 retry attempts with error context
│  • Temperature 0 │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Success    Parse Error
    │         │
    │         ▼
    │    ┌─────────────┐
    │    │ Regex        │  ← Offline fallback parsers
    │    │ Fallback     │
    │    └──────┬──────┘
    │           │
    └─────┬─────┘
          ▼
  Structured Data
  (items + metadata)
```

**Key design decisions:**

- **PaddleOCR on-device**: No external OCR API calls. ~100MB model loaded once as singleton.
- **Gemini self-correction**: If JSON parsing fails, the error message is sent back to Gemini with "fix this" context for up to 3 attempts.
- **Thread pool isolation**: OCR (CPU-bound) and Gemini (I/O-bound) use separate 2-worker thread pools to prevent blocking.
- **Telemetry**: Every AI processing attempt is logged to `document_processing_log` with duration, method, and success/error status.

---

## Real-Time Sync Architecture

```
Client A (web)  ──WebSocket──┐
                              │
Client B (mobile) ─WebSocket─┤──→ Backend WS Hub ──→ Household Room
                              │        │
Client C (mobile) ─WebSocket─┘        │
                                       ▼
                              broadcast_to_household()
                                       │
                              ┌────────┴────────┐
                              │ Event Types:     │
                              │ pantry_updated   │
                              │ receipt_confirmed│
                              │ goal_updated     │
                              │ bank_synced      │
                              │ notification     │
                              └─────────────────┘
```

**Connection lifecycle:**

1. Client connects with JWT token as query parameter
2. Server validates JWT, extracts `household_id`
3. Client added to household connection pool
4. 30-second keepalive pings maintain connection
5. Any mutation broadcasts event → all household clients invalidate relevant query keys

---

## Deployment

### Docker Compose (Production-Ready)

```bash
# Start all services
docker compose up -d

# Services:
#   db       → PostgreSQL 16 on :5432
#   backend  → FastAPI on :8000
#   web      → Next.js on :3000
```

### Environment Variables

| Variable              | Service     | Required | Description              |
| --------------------- | ----------- | -------- | ------------------------ |
| `DB_PASSWORD`         | db, backend | Yes      | PostgreSQL password      |
| `SECRET_KEY`          | backend     | Yes      | JWT signing key          |
| `GEMINI_API_KEY`      | backend     | Yes      | Google AI Studio key     |
| `FRONTEND_ORIGIN`     | backend     | Yes      | CORS allowed origin      |
| `NEXT_PUBLIC_API_URL` | web         | Yes      | Backend URL for client   |
| `PLAID_CLIENT_ID`     | backend     | No       | Plaid integration        |
| `PLAID_SECRET`        | backend     | No       | Plaid integration        |
| `SPOONACULAR_API_KEY` | backend     | No       | Extended recipe database |
