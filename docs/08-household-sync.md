# Household Real-Time Sync

## Landing Page Copy

**Headline**: Everyone sees the same pantry, budget, and goals — live

**Subheadline**: When one person scans a receipt, everyone's dashboard updates instantly. No refresh, no "did you already buy milk?" texts. Real-time WebSocket sync keeps the whole household on the same page.

**Bullets**:

- **Instant updates** — Pantry changes, receipt confirmations, and goal updates broadcast to all connected devices in milliseconds
- **Household rooms** — Each household gets its own secure channel. Data never leaks between families
- **Smart cache invalidation** — WebSocket events automatically refresh the right queries on every connected client. No stale data

**CTA**: Set up your household →

---

## Problem Statement

Household budgeting is inherently multi-person. One partner buys groceries, the other checks the pantry app an hour later and doesn't see the new items. Stale data leads to duplicate purchases, missed budget warnings, and frustration. Traditional REST polling (every 30 seconds) wastes bandwidth and still shows data that's up to 30 seconds old.

## Solution

A WebSocket-based real-time sync layer where each household is a "room." When any member performs a data-changing action, a broadcast event is sent to all connected members, which triggers automatic TanStack Query cache invalidation on every client. The result: zero-delay updates without polling.

---

## Architecture

```
      ┌─────────────────┐
      │  User A (Web)   │──────┐
      └─────────────────┘      │
                               │  WebSocket
      ┌─────────────────┐      │  /api/ws/{household_id}?token=jwt
      │  User B (Mobile) │──────┤
      └─────────────────┘      │
                               ▼
                    ┌─────────────────────┐
                    │  HouseholdSyncManager │
                    │                      │
                    │  _rooms:             │
                    │    hid_1 → {ws1,ws2} │
                    │    hid_2 → {ws3}     │
                    └─────────────────────┘
                               │
                    broadcast("pantry_updated", {...})
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              User A cache          User B cache
              invalidated           invalidated
```

---

## Technical Implementation

### Connection Lifecycle

```
1. Client sends:    WebSocket /api/ws/{household_id}?token=<jwt>
2. Server validates JWT (jose.jwt.decode with HS256)
   ├── Invalid → close(4001, "Unauthorized")
   └── Valid → accept()

3. Server adds WebSocket to _rooms[household_id]

4. Server sends welcome:
   { "event": "connected",
     "data": { "household_id": "...",
               "active_connections": 2,
               "message": "Connected to Tracker real-time sync" } }

5. Server starts ping loop (every 30 seconds)
   { "event": "ping", "data": {} }

6. Client sends messages → Server responds with ack:
   { "event": "ack", "data": { "received": "..." } }

7. On disconnect:
   ├── Cancel ping task
   ├── Remove WebSocket from room
   └── If room empty, delete room
```

### Event Types

| Event               | Trigger                   | Data                             |
| ------------------- | ------------------------- | -------------------------------- |
| `connected`         | WebSocket accepted        | household_id, active_connections |
| `pantry_updated`    | Item added/edited/deleted | item summary                     |
| `receipt_confirmed` | Receipt scan completed    | receipt_id, item_count           |
| `goal_updated`      | Goal created/edited       | goal_id                          |
| `bank_synced`       | Bank statement processed  | transaction_count                |
| `ping`              | Every 30 seconds          | Empty — keepalive                |
| `ack`               | Client sends any message  | Echoes event name                |

### Client-Side Cache Invalidation

The web hook `useHouseholdSync` maps each event to TanStack Query keys:

```typescript
const EVENT_INVALIDATIONS = {
  pantry_updated: [["pantry"], ["expiring"]],
  receipt_confirmed: [["receipts"], ["pantry"], ["expiring"], ["budget"]],
  goal_updated: [["goals"]],
  bank_synced: [["bank-transactions"]],
};
```

When an event arrives, all mapped query keys are invalidated, triggering automatic re-fetches on any component subscribed to those queries. No manual refresh needed.

### Reconnection Strategy

```
ws.onclose = () => {
  setTimeout(connect, 5000);  // Reconnect after 5 seconds
};

ws.onerror = () => {
  ws.close();  // Triggers onclose → reconnect
};
```

Simple exponential-free retry. On mobile, reconnection also triggers on app foreground via React Navigation focus events.

### Server-Side Broadcasting

Any router can push events to a household:

```python
from app.routers.ws import broadcast_to_household

await broadcast_to_household(
    household_id=str(current_user.household_id),
    event="pantry_updated",
    data={"action": "item_added", "item_name": "Milk"}
)
```

Dead connections are automatically cleaned up during broadcast — if `send_text()` fails, the WebSocket is removed from the room.

---

## Multi-Tenant Data Model

All core tables are scoped by `household_id`:

| Table               | Scope Column   | Effect                               |
| ------------------- | -------------- | ------------------------------------ |
| `pantry_items`      | `household_id` | Each household sees only their items |
| `receipts`          | `household_id` | Receipts isolated per household      |
| `financial_goals`   | `household_id` | Goals shared within household        |
| `bank_transactions` | `household_id` | Transaction data stays private       |
| `product_catalog`   | `household_id` | Custom categories per household      |

### Household Model

```
users (N) ──belongs_to──▶ household (1)
  │
  └── On register:
      ├── New user? → Create household + user
      └── Join code? → Attach user to existing household
```

| Field          | Type          | Description                   |
| -------------- | ------------- | ----------------------------- |
| `id`           | UUID          | Primary key                   |
| `name`         | VARCHAR(255)  | e.g., "Smith Family"          |
| `invite_code`  | VARCHAR(20)   | Unique join code              |
| `budget_limit` | DECIMAL(10,2) | Monthly budget (default $600) |
| `created_at`   | TIMESTAMP     | Auto-set                      |

---

## Platform Behavior

### Web

- `useHouseholdSync(householdId)` hook in dashboard layout
- Connects on mount, disconnects on unmount
- Console logs: `[Tracker] Real-time sync connected`
- WebSocket URL from `NEXT_PUBLIC_WS_URL` env var

### Mobile

- Same hook pattern using React Native WebSocket API
- Reconnects on app foreground
- Token retrieved from `expo-secure-store` (not localStorage)
- Background: WebSocket disconnects to save battery

---

## API Endpoint

| Protocol  | Path                     | Auth                         | Description            |
| --------- | ------------------------ | ---------------------------- | ---------------------- |
| WebSocket | `/api/ws/{household_id}` | JWT in `?token=` query param | Real-time sync channel |

---

## Connected Features

| Trigger                    | Effect                         |
| -------------------------- | ------------------------------ |
| Any data mutation          | Broadcast to household room    |
| WebSocket event received   | Client query cache invalidated |
| Multiple devices connected | All see changes simultaneously |
| Connection lost            | Auto-reconnect after 5 seconds |
| Room empty                 | Cleaned up from server memory  |
