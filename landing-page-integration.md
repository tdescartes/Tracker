# Landing Page Integration Tracker

## Objective

Integrate the standalone `landingpage.tsx` marketing page into the Next.js web application at the root route `/`, without disturbing any existing routes, components, or backend logic.

---

## Design Decisions (Principal Product Designer)

| Decision                    | Choice                                            | Rationale                                                           |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| What to extract             | `MarketingLanding`, `HeroAnimation`, `Badge` only | The 7 demo app pages already exist as real routes in `/dashboard/*` |
| CTA "Open App Dashboard"    | → `/login` ("Sign In")                            | Visitors need to authenticate first                                 |
| CTA "Try the demo"          | → `/register` ("Get Started")                     | Primary conversion funnel                                           |
| Pricing CTAs                | → `/register`                                     | Registration flow for both tiers                                    |
| Footer "Open Web Dashboard" | → `/dashboard`                                    | For existing users                                                  |
| Footer product links        | → `/dashboard/pantry`, etc.                       | Deep-link to real features                                          |
| File structure              | `web/src/components/landing/` folder              | Modular, no pollution of existing code                              |
| TypeScript                  | Add proper interfaces                             | Original was untyped JS                                             |

---

## Implementation Checklist

- [x] **1. Create `web/src/components/landing/Badge.tsx`**
  - Typed `BadgeProps` with `color` and `children`
  - Extracted from original `landingpage.tsx` lines 55-65

- [x] **2. Create `web/src/components/landing/HeroAnimation.tsx`**
  - `"use client"` directive (uses `useState`, `useEffect`)
  - Extracted from original `landingpage.tsx` lines 68-315
  - All CSS keyframe animations preserved
  - Two alternating scenarios: "The Grocery Run" / "The Monthly Audit"

- [x] **3. Create `web/src/components/landing/MarketingLanding.tsx`**
  - `"use client"` directive (uses `useState`)
  - Extracted from original `landingpage.tsx` lines ~745-1460 (MarketingLanding component)
  - Replace all `onLaunchApp` callbacks with Next.js `<Link>` components
  - Map CTAs to `/login`, `/register`, `/dashboard` as designed above
  - Footer product links deep-link to real dashboard subroutes
  - Import HeroAnimation and Badge from sibling files

- [x] **4. Update `web/src/app/page.tsx`**
  - Remove the `redirect("/dashboard")` logic
  - Import and render `MarketingLanding`
  - Keep it as a thin wrapper (~5 lines)

- [x] **5. Verify no build errors**
  - Ran error check — only CSS lint warnings (inline styles), no compile errors
  - Existing routes untouched

- [x] **6. Update this checklist**
  - All items complete ✅

---

## Files Changed

| File                                              | Action                  | Lines |
| ------------------------------------------------- | ----------------------- | ----- |
| `web/src/components/landing/Badge.tsx`            | Created                 | ~20   |
| `web/src/components/landing/HeroAnimation.tsx`    | Created                 | ~250  |
| `web/src/components/landing/MarketingLanding.tsx` | Created                 | ~550  |
| `web/src/app/page.tsx`                            | Modified (7 → ~5 lines) | ~5    |

## Files NOT Changed (Zero Disruption)

- `web/src/app/layout.tsx` — untouched
- `web/src/app/providers.tsx` — untouched
- `web/src/app/login/page.tsx` — untouched
- `web/src/app/register/page.tsx` — untouched
- `web/src/app/dashboard/*` — untouched
- `web/src/lib/api.ts` — untouched
- `web/src/store/authStore.ts` — untouched
- All backend files — untouched
- All mobile files — untouched
