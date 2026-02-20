# Tracker — Household Inventory & Personal Finance App

A dual-platform (web + mobile) app that bridges pantry management with personal finance — powered by receipt scanning, budgeting tools, a goal planner, and bank statement analysis.

---

## Project Structure

```
Tracker/
├── backend/          Python FastAPI REST API
├── web/              Next.js 14 web dashboard
├── mobile/           React Native + Expo mobile app
└── database/         SQL migration scripts
```

---

## Quick Start

### 1. Database (PostgreSQL)

```bash
psql -U postgres -c "CREATE DATABASE homebase_db;"
psql -U postgres -c "CREATE USER homebase_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE homebase_db TO homebase_user;"
psql -U homebase_user -d homebase_db -f database/migrations/001_initial_schema.sql
```

### 2. Backend API

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env    # Then edit with your DB URL + API keys
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### 3. Web App

```bash
cd web
npm install
copy .env.local.example .env.local
npm run dev
# Opens at http://localhost:3000
```

### 4. Mobile App

```bash
cd mobile
npm install
copy .env.example .env    # Set API_URL to your machine's IP
npx expo start
# Scan the QR code with the Expo Go app on your phone
```

---

## Features

| Feature                   | Web              | Mobile         |
| ------------------------- | ---------------- | -------------- |
| Receipt scanning (OCR)    | Upload           | Camera         |
| Pantry inventory          | Full view        | Card view      |
| Expiry tracking + alerts  | Dashboard + list | "Eat Me First" |
| Mark consumed / trashed   | Click            | Swipe          |
| Shopping list             | —                | Auto-populated |
| Budget pie chart + meter  | Full             | Summary        |
| Inflation price tracker   | Full             | —              |
| Financial goal calculator | Full             | —              |
| Bank PDF analyzer         | Full             | —              |
| Subscription detector     | Full             | —              |
| Receipt reconciliation    | Full             | —              |

---

## API Reference

| Method | Endpoint                             | Description                          |
| ------ | ------------------------------------ | ------------------------------------ |
| POST   | `/api/auth/register`                 | Register + create household          |
| POST   | `/api/auth/login`                    | Login, returns JWT                   |
| GET    | `/api/auth/me`                       | Current user info                    |
| GET    | `/api/pantry/`                       | List pantry items                    |
| GET    | `/api/pantry/expiring-soon`          | Items expiring soon                  |
| GET    | `/api/pantry/shopping-list`          | Auto-generated shopping list         |
| POST   | `/api/receipts/upload`               | Upload receipt image → OCR → parse   |
| POST   | `/api/receipts/{id}/confirm`         | Confirm parsed items → add to pantry |
| GET    | `/api/budget/summary/{year}/{month}` | Monthly spending summary             |
| GET    | `/api/budget/inflation/{item}`       | Price history for an item            |
| GET    | `/api/goals/`                        | List financial goals                 |
| POST   | `/api/goals/`                        | Create goal + run calculator         |
| POST   | `/api/bank/upload-statement`         | Parse bank PDF → save transactions   |
| GET    | `/api/bank/transactions`             | List bank transactions               |
| POST   | `/api/bank/reconcile`                | Match bank transactions to receipts  |

---

## OCR Setup

- **Dev**: Set `USE_TESSERACT=true` in `backend/.env`. Install the binary from:
  https://github.com/UB-Mannheim/tesseract/wiki
- **Production**: Set `VERYFI_CLIENT_ID`, `VERYFI_CLIENT_SECRET`, `VERYFI_USERNAME`, `VERYFI_API_KEY` for Veryfi (recommended), or `GOOGLE_CLOUD_VISION_API_KEY` for Google Vision.

---

## Color System

| Token      | Hex       | Usage                               |
| ---------- | --------- | ----------------------------------- |
| Ocean Blue | `#006994` | Primary, buttons, navigation        |
| Sage Green | `#87A96B` | Fresh items, positive status        |
| Persimmon  | `#EC5800` | Alerts, expiring items, over-budget |
| Slate Gray | `#708090` | Neutral text and borders            |

---

## Roadmap

### Phase 1 — MVP (Current)

- [x] Auth + household management
- [x] Receipt upload + OCR + pantry auto-population
- [x] Pantry management (expiry, consume, trash, shopping list)
- [x] Budget summary + category breakdown + waste tracking
- [x] Goal calculator (save vs. loan with amortization formula)
- [x] Bank PDF parser + subscription detector + receipt reconciliation

### Phase 2 — Intelligence

- [x] Push notifications for expiring items
- [x] Recipe suggestions based on pantry contents
- [x] AI-powered auto-categorization that learns from history
- [x] CSV bank statement support

### Phase 3 — Scale

- [x] Multi-user real-time household sync (WebSockets)
- [x] Plaid API for live bank integration
- [x] App Store / Google Play deployment
