# Design System & UI Patterns

## Design Philosophy

Tracker follows a **data-dense, action-light** design philosophy. Every screen's primary job is to surface the most important data — not to look decorative. Design serves comprehension.

### Core Principles

1. **Information density over whitespace** — A dashboard should answer 5 questions at a glance. Stat cards, progress bars, and insight cards pack maximum signal into minimum space.
2. **Scan before read** — Color coding, badges, and icons let users scan for problems (red = alert, amber = attention, green = safe) before reading any text.
3. **Progressive disclosure** — Summary → detail. Dashboard shows counts; tap to see lists. List shows names; tap to see full records.
4. **One-tap actions** — The most common operation on any screen should be one tap. Mark as consumed, add to shopping list, move surplus to goal.
5. **Platform parity, not uniformity** — Web and mobile share the same data and business logic but use native interaction patterns. No forced mobile UI on desktop.

---

## Design Tokens

```css
:root {
  --primary:   #006994;   /* Teal — trust, finance, calm */
  --secondary: #87a96b;   /* Sage green — freshness, food */
  --alert:     #ec5800;   /* Burnt orange — urgency */
  --neutral:   #708090;   /* Slate gray — secondary text */
}
```

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#006994` | Buttons, links, active states, budget positive indicators |
| `--secondary` | `#87a96b` | Food-related UI, recipe cards, pantry badges |
| `--alert` | `#ec5800` | Expiry warnings, over-budget states, waste indicators |
| `--neutral` | `#708090` | Secondary text, dividers, disabled states |

### Extended Palette (Tailwind)

- **Backgrounds**: `bg-gray-50` (page), `bg-white` (cards)
- **Borders**: `border-gray-200` (default), `border-red-200` (warning), `border-blue-200` (tip)
- **Text**: `text-gray-900` (primary), `text-gray-600` (secondary), `text-gray-400` (muted)
- **Status cards**: `bg-red-50` (warning), `bg-blue-50` (info), `bg-amber-50` (action needed)

---

## Component Inventory

### Cards

| Card Type | Used In | Structure |
|-----------|---------|-----------|
| **Stat Card** | Dashboard | Icon + label + value + sub-text |
| **Insight Card** | Dashboard | Type badge + title + body (color-coded) |
| **Budget Pulse** | Dashboard, Budget | Stacked progress bar + pace text |
| **Recipe Card** | Recipes | Name + time + match % + ingredients |
| **Goal Card** | Goals | Name + progress bar + dual strategy |
| **Transaction Row** | Bank | Date + description + amount + badges |
| **Pantry Item** | Pantry | Name + category + expiry + status actions |
| **Notification Card** | Notifications | Type icon + title + body + timestamp |

### Progress Indicators

| Pattern | Usage |
|---------|-------|
| **Stacked bar** | Budget (confirmed green + estimated striped) |
| **Linear progress** | Goal savings (saved/target) |
| **Circular** | Mobile goal progress |
| **Pace indicator** | Daily spending vs. expected pace |
| **Match score** | Recipe ingredient match percentage |

### Skeleton Loading

Every data-fetching page has a dedicated skeleton component:

| Skeleton | Page | Structure |
|----------|------|-----------|
| `DashboardSkeleton` | Dashboard | Stat cards + budget bar + recipe card |
| `PantrySkeleton` | Pantry | Search bar + tab bar + item rows |
| `RecipesSkeleton` | Recipes | Section header + recipe cards |
| `GoalsSkeleton` | Goals | Goal cards with progress bars |
| `BudgetSkeleton` | Budget | Summary cards + chart area + category rows |
| `BankSkeleton` | Bank | Upload area + transaction row placeholders |
| `TransactionsSkeleton` | Bank (detail) | Upload + transaction rows |

All skeletons use `animate-pulse` with `bg-gray-200` on `rounded` shapes. The shimmer effect provides perceived performance during API calls.

---

## Interaction Patterns

### Pull to Refresh (Mobile)
- Available on all list screens (Pantry, Recipes, Bank, Goals)
- Triggers `queryClient.invalidateQueries()`
- Haptic feedback on pull threshold: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

### Haptic Feedback (Mobile)

| Action | Haptic Style |
|--------|-------------|
| Pull-to-refresh | Light impact |
| Item status change | Medium impact |
| Goal created | Success notification |
| Delete confirmation | Warning notification |
| Tab switch | Selection change |
| Receipt scan complete | Success notification |

### Toast Notifications (Mobile)
- `react-native-toast-message` at top of screen
- Green for success, red for error
- Auto-dismiss after 3 seconds
- Context: "Item added to pantry", "Receipt processed", "Goal saved"

### Segmented Controls

| Screen | Segments | Behavior |
|--------|----------|----------|
| Pantry | All / FRIDGE / FREEZER / PANTRY | Filters by `location` |
| Pantry status | UNOPENED / OPENED / CONSUMED / TRASHED | Color-coded pills |
| Bank transactions | Category filter pills | Multi-category filter |
| Budget report | Summary / Categories / Subscriptions | Tab-based sections |

### Modal Patterns

| Modal | Screen | Content |
|-------|--------|---------|
| Add/Edit Item | Pantry | Full form with category, location, expiry |
| Add Goal | Goals | Goal form with loan fields |
| Receipt Confirm | Scan | Preview extracted items before saving |
| Upload Statement | Bank | File drop zone + processing status |

---

## Layout Architecture

### Web (Next.js App Router)

```
(root layout)
  ├── /login, /register   → Auth pages (no sidebar)
  └── /dashboard (layout)  → Sidebar + content area
       ├── /dashboard       → Smart dashboard
       ├── /dashboard/pantry
       ├── /dashboard/recipes
       ├── /dashboard/budget
       ├── /dashboard/bank
       └── /dashboard/goals
```

Dashboard layout:
- Fixed sidebar (left, 256px) with nav links + icons
- Content area with max-width container
- Responsive: sidebar collapses to bottom nav on mobile viewports

### Mobile (Expo Router)

```
(root layout)
  ├── /(auth)/login, /register  → Auth stack
  └── /(tabs)                    → Bottom tab navigator
       ├── index (Home)
       ├── pantry
       ├── scan
       ├── recipes
       └── shopping
```

Tab bar: 5 tabs with Ionicons, center "Scan" tab emphasized.

---

## Typography

| Element | Web | Mobile |
|---------|-----|--------|
| Page title | `text-2xl font-bold` (24px) | `fontSize: 28, fontWeight: "bold"` |
| Section header | `text-lg font-semibold` (18px) | `fontSize: 20, fontWeight: "600"` |
| Card title | `text-sm font-semibold` (14px) | `fontSize: 16, fontWeight: "600"` |
| Body text | `text-sm` (14px) | `fontSize: 14` |
| Caption | `text-xs text-gray-500` (12px) | `fontSize: 12, color: "#6b7280"` |

---

## Design Improvement Opportunities

Based on codebase analysis, these are areas where the current design could be elevated:

| Area | Current | Recommendation |
|------|---------|----------------|
| **Color system** | 4 CSS custom properties | Expand to full semantic token set (success, info, surface, border) |
| **Dark mode** | Not implemented | Add `prefers-color-scheme` support with dark token variants |
| **Motion** | Only pulse animation | Add micro-animations for state changes (item consumed → fade out) |
| **Empty states** | Basic text messages | Illustrated empty states with suggested actions |
| **Onboarding** | Direct to dashboard | Add a 3-step onboarding flow (connect bank → scan receipt → set goal) |
| **Charts** | Recharts defaults | Consistent chart theming with brand colors |
| **Mobile gestures** | Tap only | Add swipe-to-consume, swipe-to-trash on pantry items |
| **Accessibility** | Not audited | Add ARIA labels, focus management, contrast check |
