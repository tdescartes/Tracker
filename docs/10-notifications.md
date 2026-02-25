# Smart Notifications

## Landing Page Copy

**Headline**: Never throw away food because you forgot it was there

**Subheadline**: Automatic expiry alerts sent to every household member's phone. In-app notifications keep a persistent feed of what needs attention — from expiring items to budget milestones.

**Bullets**:

- **Expiry push notifications** — Daily at 8 AM, the system checks for pantry items expiring within 3 days and pushes alerts to every registered device via Expo Push
- **In-app notification feed** — A persistent, always-available feed of events with unread count badge, one-tap mark-as-read, and deep links to relevant screens
- **Household-wide delivery** — One person's expiring item triggers notifications for the whole household. Everyone stays informed

**CTA**: Stay ahead of waste →

---

## Problem Statement

Food expires silently. Without active reminders, items sit in the back of the fridge until they're thrown away — wasting money and increasing the household's food waste cost. Push notifications are the only mechanism that reaches users who don't open the app daily.

## Solution

A dual notification system:

1. **Push notifications** via Expo Push API — triggered by a daily cron job that scans all households for expiring items, then sends to every registered device.
2. **In-app notifications** — persistent database-backed feed with unread counts, type-based styling, and mark-as-read capability.

---

## Technical Implementation

### Push Notification Pipeline

```
Daily Cron (8:00 AM)
        │
        ▼
Query: pantry_items WHERE
  status IN (UNOPENED, OPENED)
  AND expiration_date ≤ today + 3 days
  AND expiration_date IS NOT NULL
        │
        ▼
Group by household_id
        │
        ▼
For each household:
  ├── Fetch all push tokens (via user → token join)
  ├── Build message:
  │   ├── 1 item: "Milk expires in 2 day(s)!"
  │   └── N items: "5 items expiring soon — check your pantry!"
  └── Send to each Expo push token
        │
        ▼
Return: { households_notified: N, total_pushed: N }
```

### Expo Push Integration

```python
payload = {
    "to": "ExponentPushToken[xxxx]",
    "title": "🍎 Tracker — Expiry Alert",
    "body": "Milk expires in 2 day(s)!",
    "data": {"screen": "pantry", "filter": "expiring"},
    "sound": "default",
    "priority": "high",
}

POST https://exp.host/--/api/v2/push/send
```

Token validation: Only tokens starting with `ExponentPushToken[` are sent. Invalid tokens are silently skipped.

### Push Token Management

| Operation    | Behavior                                              |
| ------------ | ----------------------------------------------------- |
| Register     | Upsert — if token exists, update user_id and platform |
| Unregister   | Delete token record (called on logout)                |
| Multi-device | One user can have multiple tokens (phone + tablet)    |
| Multi-user   | All household members receive the same expiry alerts  |

### Data Model

**PushNotificationToken**:

| Field        | Type         | Description            |
| ------------ | ------------ | ---------------------- |
| `id`         | UUID         | Primary key            |
| `user_id`    | UUID         | FK → users             |
| `token`      | VARCHAR(255) | Expo push token string |
| `platform`   | VARCHAR(10)  | "expo" or "web"        |
| `created_at` | TIMESTAMP    | Auto-set               |

**Notification** (in-app):

| Field        | Type         | Description                        |
| ------------ | ------------ | ---------------------------------- |
| `id`         | UUID         | Primary key                        |
| `user_id`    | UUID         | FK → users                         |
| `title`      | VARCHAR(255) | Notification headline              |
| `body`       | TEXT         | Notification message               |
| `type`       | VARCHAR(50)  | info, warning, success, alert      |
| `is_read`    | BOOLEAN      | Default false                      |
| `meta`       | JSONB        | Optional metadata (deep link info) |
| `created_at` | TIMESTAMP    | Auto-set                           |

### In-App Notification Feed

- Returns most recent 50 notifications per user
- Supports `unread_only` filter
- Returns `unread_count` alongside notification list
- Mark individual or all-at-once as read

### Type-Based Styling

| Type      | Icon             | Color     |
| --------- | ---------------- | --------- |
| `warning` | ⚠️ AlertTriangle | Red/Amber |
| `info`    | 💡 Lightbulb     | Blue      |
| `success` | ✅ CheckCircle   | Green     |
| `alert`   | 🔔 Bell          | Orange    |

---

## Platform Behavior

### Web

- **Bell icon** in dashboard header with unread count badge
- **Dropdown feed**: Click bell → scrollable notification list
- **Mark read**: Click individual notification or "Mark all read" button
- **No push**: Web push not implemented (Expo tokens only)

### Mobile

- **Push notifications**: Received natively via Expo Notifications
- **Deep linking**: Notification `data.screen` field navigates to relevant tab
- **Badge count**: App icon badge updated with unread count
- **Permission flow**: Requests notification permission on first app open
- **Haptics**: Notification impact on receive (foreground)

---

## API Endpoints

| Method | Path                                | Description                         |
| ------ | ----------------------------------- | ----------------------------------- |
| POST   | `/api/notifications/token`          | Register push token (upsert)        |
| DELETE | `/api/notifications/token`          | Unregister push token               |
| GET    | `/api/notifications/`               | List notifications (most recent 50) |
| POST   | `/api/notifications/{id}/read`      | Mark one notification as read       |
| POST   | `/api/notifications/read-all`       | Mark all as read                    |
| POST   | `/api/notifications/trigger-expiry` | Manually trigger expiry check       |

### Trigger Endpoint

The `/trigger-expiry` endpoint is designed for:

- **Cron job**: APScheduler calls daily at 8:00 AM
- **Manual testing**: Any authenticated user can trigger
- **Custom window**: `days_ahead` param (default 3) controls lookahead

---

## Connected Features

| Trigger                         | Effect                                       |
| ------------------------------- | -------------------------------------------- |
| Pantry item approaching expiry  | Push notification to all household devices   |
| Notification received on mobile | Deep link to pantry with expiring filter     |
| Unread notifications exist      | Badge count on dashboard bell icon           |
| Item consumed/trashed           | Stops appearing in next expiry check         |
| New household member joins      | Their token registered → they get alerts too |
