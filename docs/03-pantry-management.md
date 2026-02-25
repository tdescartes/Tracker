# Smart Pantry

## Landing Page Copy

**Headline**: Know what you have, waste less

**Subheadline**: Your fridge, freezer, and pantry in one view. Track expiration dates, manage stock, and automatically build your shopping list from what you've used.

**Bullets**:

- **Three storage zones** — Filter by Fridge, Freezer, or Pantry to see exactly what's where
- **Expiry tracking** — Color-coded urgency warnings with push notifications before items go bad
- **Auto shopping list** — Mark items as used or trashed, and they auto-add to your shopping list for next time

**CTA**: Organize your kitchen →

---

## Problem Statement

Most households have no reliable way to track what food they actually have. Items expire unnoticed in the back of the fridge. Shopping trips result in duplicate purchases. The "what do we have for dinner?" conversation happens daily with no good answer. Existing inventory apps require too much manual entry to sustain.

## Solution

A household pantry system that auto-populates from receipt scans, tracks expiration dates with push alerts, sorts by storage location, and generates a shopping list from consumption patterns — all shared across household members in real time.

---

## User Flow

### Adding Items

```
Two paths into the pantry:

Path A: Receipt Scan (automated)
  Scan receipt → confirm items → pantry auto-populates
  with name, category, price, and calculated expiry date

Path B: Manual Add (quick entry)
  Tap "+" → enter name, category, location, qty, unit, price, expiry
  → item appears in pantry immediately
```

### Managing Items

```
For each item, user can:
  ├── Edit: long-press (mobile) / click (web) → change any field
  ├── Consume: mark as used → auto-adds to shopping list
  ├── Trash: mark as wasted → tracked as waste cost in budget
  └── Delete: remove entirely (no shopping list trigger)
```

### Shopping List Lifecycle

```
Item consumed/trashed → {"on_shopping_list": true}
  │
  ▼
Appears in Shopping tab
  │
  ▼
User marks "Got it" / "Bought" → {"on_shopping_list": false, "status": "UNOPENED"}
  │
  ▼
Item resets to fresh stock
```

---

## Data Model

### Pantry Item

| Field            | Type    | Description                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| name             | string  | Item name (from receipt or manual)                                     |
| brand            | string  | Optional brand                                                         |
| category         | string  | Dairy, Produce, Meat, Bakery, Frozen, Snacks, Drinks, Household, Other |
| location         | enum    | `FRIDGE` / `FREEZER` / `PANTRY`                                        |
| quantity         | decimal | Amount (default 1.0)                                                   |
| unit             | string  | kg, lbs, box, pack, etc.                                               |
| purchase_price   | decimal | Price paid (from receipt)                                              |
| purchase_date    | date    | When bought                                                            |
| expiration_date  | date    | Auto-calculated or manual                                              |
| status           | enum    | `UNOPENED` / `OPENED` / `CONSUMED` / `TRASHED`                         |
| on_shopping_list | boolean | Auto-set on consume/trash                                              |

### Product Catalog

A reference table that provides default category and shelf life for known products:

| Field                  | Description               |
| ---------------------- | ------------------------- |
| name                   | Product name              |
| default_category       | Auto-assigned category    |
| avg_shelf_life_days    | Default expiration offset |
| opened_shelf_life_days | Shorter life once opened  |

---

## Features

### Location-Based Inventory

Items are stored with a location tag (`FRIDGE`, `FREEZER`, `PANTRY`). The UI provides filter pills to quickly narrow the view. Default view shows all locations.

### Expiry Tracking & Alerts

**Visual indicators** (by days remaining):
| Days Left | Web Color | Mobile Treatment |
|-----------|-----------|-----------------|
| 0 (expired) | Red badge | Red left border + "Expired!" |
| 1–3 days | Orange/amber badge | Orange left border + day count |
| 4–7 days | Yellow badge | Yellow indicator |
| 8+ days | Green/none | No special treatment |

**Push notifications**: A scheduled job runs daily at 8 AM, finds all items expiring within 3 days, groups by household, and sends Expo push notifications.

**Expiring items banner** (mobile): When items are about to expire, a warning banner shows the count and estimated dollar value at risk: "⚠️ 3 items expiring soon (~$12.50 at risk)"

### Auto Shopping List

When a pantry item's status changes to `CONSUMED` or `TRASHED`:

1. The `on_shopping_list` flag is set to `true`
2. The item appears in the Shopping List view
3. When the user marks it as "Got it," status resets to `UNOPENED` and `on_shopping_list` → `false`

This creates a passive replenishment cycle — use something, it auto-appears on your next shopping list.

### Sorting & Priority

Items are sorted by expiration date (soonest first), so the pantry view naturally surfaces what needs attention. This aligns with the "Eat Me First" section on the home screen.

### Inline Insights (Mobile)

The pantry screen fetches AI insights filtered to `screen === "pantry"` and displays them as contextual banners (tips, warnings) above the item list.

---

## Platform Behavior

### Web

- **Layout**: Card grid (responsive, 1–3 columns)
- **Add**: Inline form at top + "Scan Receipt" button opens receipt upload flow
- **Edit**: Click item → modal with all fields editable + status dropdown + shopping list toggle
- **Delete**: Confirm dialog
- **Loading**: `PantrySkeleton` — segment control + filter chips + 6 item card placeholders

### Mobile

- **Layout**: Flat list (ScrollView with FlatList for performance)
- **Segments**: "In Stock" / "Shopping" tab control
- **Add**: Floating "+" button → expandable form card
- **Edit**: Long-press item → populates edit form
- **Actions**: Swipe/button for Consume, Trash, Delete with haptic feedback
- **Haptics**: Medium (consume/trash), Heavy (delete), Light (got it), Success (add)
- **Loading**: `PantrySkeleton` — animated pulse skeleton matching item card shapes

---

## API Endpoints

| Method | Path                        | Description                                                           |
| ------ | --------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/pantry/`              | List items (filter by location, excludes consumed/trashed by default) |
| GET    | `/api/pantry/expiring-soon` | Items expiring within N days (default 3)                              |
| GET    | `/api/pantry/shopping-list` | Items flagged for shopping list                                       |
| POST   | `/api/pantry/`              | Add a pantry item                                                     |
| PATCH  | `/api/pantry/{item_id}`     | Update item (partial); auto-adds to shopping list if consumed/trashed |
| DELETE | `/api/pantry/{item_id}`     | Delete item permanently                                               |

---

## Connected Features

| Trigger                 | Effect                                                    |
| ----------------------- | --------------------------------------------------------- |
| Receipt confirmed       | Pantry items created with auto-expiry                     |
| Item consumed/trashed   | Added to shopping list + waste cost tracked in budget     |
| Item expiring in 3 days | Push notification + "Eat Me First" on home screen         |
| Pantry contents change  | Recipe suggestions re-scored (expiring items weighted 2×) |
| Pantry updated          | WebSocket broadcasts → all household devices refresh      |
