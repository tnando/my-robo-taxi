# MyRoboTaxi Screen Inventory (v2)

This document catalogs every screen in the MyRoboTaxi UI mockup app. All screens have been redesigned to match the Tesla Robotaxi design language: near-black backgrounds, gold accent color, generous whitespace, and a premium minimal aesthetic.

**Mockup location:** `ui-mocks/`
**Run locally:** `cd ui-mocks && npm run dev`
**Build:** `cd ui-mocks && npm run build`

---

## Screen List

### 1. Sign In

| Property | Value |
|---|---|
| Route | `/` |
| File | `src/pages/SignIn.tsx` |
| Flow | Owner Onboarding, Viewer Onboarding |
| Nav | No bottom nav |
| Status | Complete |

**Description:** Minimal dark sign-in screen with social-only auth (Google + Apple). Centered layout with abundant vertical spacing.

- MyRoboTaxi logo (hexagonal line art in gold) with branded wordmark ("My**Robo**Taxi" with gold accent)
- "Sign in to continue" in light gray
- Two outline-style auth buttons: Google, Apple -- dark background with subtle border
- Account creation happens automatically on first OAuth sign-in
- All auth buttons navigate to `/home` in the mockup

---

### 2. Sign Up (Redirect)

| Property | Value |
|---|---|
| Route | `/signup` |
| File | `src/pages/SignUp.tsx` |
| Flow | Redirect to Sign In |
| Nav | No bottom nav |
| Status | Complete |

**Description:** Redirects to `/signin` (Sign In). With social-only auth, there is no separate sign-up flow — account creation happens automatically on first OAuth sign-in via Google or Apple.

---

### 3. Live Map / Home

| Property | Value |
|---|---|
| Route | `/home` |
| File | `src/pages/Home.tsx` |
| Flow | Live Vehicle Tracking |
| Nav | Bottom nav visible (Map tab active) |
| Status | Complete |

**Description:** The primary screen of the app. Full-screen interactive Mapbox dark map, edge to edge, with the vehicle visible immediately. The bottom sheet has two distinct layouts depending on whether the vehicle is actively driving.

**Map layer:**
- Real interactive Mapbox GL JS map (dark-v11 style), centered on Austin, TX
- Gold vehicle marker (circle with heading arrow SVG) with pulse glow animation
- **Route rendering when driving:** Two-tone gold route line -- dim completed portion (opacity 0.3), bright remaining portion (opacity 0.9), green start dot, gold end dot
- Auto-fit to route bounds on load via `mapboxgl.LngLatBounds`
- Compass direction labels (N/E/S/W) overlaid on map edges as subtle white text
- Vehicle switching via tap-only dot indicators near top (NOT swipe -- swipe conflicts with map panning); active dot is gold and wider, inactive dots are muted
- Zoom-to-fit button (bottom-right) appears when a route is active

**Bottom sheet overlay** with two snap states (touch-drag with snap logic, NOT a toggle bar):
- **Peek (260px) -- Driving state:** Vehicle name, StatusBadge, "Heading to {destination}" in gold, glowing trip progress bar (gold fill with glow + pulsing leading-edge dot) with diamond stop markers on the track, origin/destination labels below the bar, stats row: ETA / Speed / Battery (three columns separated by dividers)
- **Peek (260px) -- Non-driving state:** Vehicle name, StatusBadge, status message (e.g. "Parked at ..."), location name, battery percentage + thin battery bar
- **Half (50vh) -- Driving state:** Everything from peek + start/destination details (location name + address), stops list (charging stops shown with bolt icon, waypoints with dot), divider, vehicle info (year, model, color, license plate), odometer + FSD today, interior/exterior temps, last updated timestamp
- **Half (50vh) -- Non-driving state:** Everything from peek + location address, odometer + FSD today + heading, divider, vehicle info (year, model, color, license plate), interior/exterior temps, estimated range, full battery bar with percentage, last updated timestamp

There is no "Full" state. The sheet snaps between peek and half based on drag distance relative to the midpoint.

---

### 4. Empty State

| Property | Value |
|---|---|
| Route | `/home/empty` |
| File | `src/pages/HomeEmpty.tsx` |
| Flow | New user, no vehicles linked |
| Nav | No bottom nav |
| Status | Complete |

**Description:** Premium-looking onboarding screen when user has no vehicles.

- Dark background with subtle gold gradient glow
- Line-art car icon in gold
- "Welcome to MyRoboTaxi" heading (large, white)
- "Get started by adding your Tesla or joining a friend's car" (gray subtext)
- Two stacked buttons:
  - "Add Your Tesla" -- gold filled CTA
  - "Enter Invite Code" -- outline button
- Intentional and polished, not an error state

---

### 5. Drive History

| Property | Value |
|---|---|
| Route | `/drives` |
| File | `src/pages/DriveHistory.tsx` |
| Flow | Drive Summary (list view) |
| Nav | Bottom nav visible (Drives tab active) |
| Status | Complete |

**Description:** Clean list of completed drives for the current vehicle.

- "Drives" heading with vehicle name subtitle
- Active drive banner (green pulse, links to live map) when vehicle is driving
- Sort controls: Date (default), Distance, Duration -- subtle filter chips
- Drives grouped by date: "Today", "Yesterday", or formatted date
- Each drive card:
  - Route: Start location arrow End location
  - Time range
  - Stats: distance, duration, FSD miles (gold badge), charge change
  - Dark surface background with subtle border

---

### 6. Drive Summary

| Property | Value |
|---|---|
| Route | `/drives/:driveId` |
| File | `src/pages/DriveSummary.tsx` |
| Flow | Drive Summary (detail view) |
| Nav | Bottom nav visible (Drives tab active) |
| Status | Complete |

**Description:** Detailed view of a single drive. Designed as a shareable artifact.

- Back button + title + date
- **Hero map:** Real Mapbox GL JS map (dark-v11, non-interactive) with gold route line rendered via MapPlaceholder (`showRoute=true`, `routeCoordinates`, `showVehicleMarker=false`), green start dot, gold end dot
- **Location labels:** Start and end with connecting vertical line
- **Stats grid (2-column):** Distance, Duration, FSD Miles (gold), Battery, Avg Speed, Max Speed
- **Speed sparkline:** Thin gold line chart with gradient fill
- **FSD section:** Percentage, miles, interventions + gold progress bar
- **Share button:** Gold outline CTA at bottom

---

### 7. Invite Management (Share)

| Property | Value |
|---|---|
| Route | `/invites` |
| File | `src/pages/Invites.tsx` |
| Flow | Invite Management |
| Nav | Bottom nav visible (Share tab active) |
| Status | Complete |

**Description:** Streamlined invite management screen.

- "Share Your Tesla" heading
- Email input + "Send Invite" gold button (single row)
- **Viewers section:** Avatar circle + name + online status (green dot) + permission level + subtle revoke text button
- **Pending section:** Avatar + name + email + resend/cancel text buttons
- No boxy cards -- clean list with minimal chrome

---

### 8. Settings

| Property | Value |
|---|---|
| Route | `/settings` |
| File | `src/pages/Settings.tsx` |
| Flow | Settings and Account |
| Nav | Bottom nav visible (Settings tab active) |
| Status | Complete |

**Description:** Minimal settings screen. No cards -- just clean sections with generous spacing.

- **Profile:** Name and email (plain text, no card)
- **Tesla Account:** Green dot + "Linked to Thomas's Model Y" (one line)
- **Notifications:** Four toggle switches (gold when on)
  - Drive started, Drive completed, Charging complete, Viewer joined
- **Sign Out:** Subtle text link (not a button, not red)
- **Version:** Muted text at bottom ("MyRoboTaxi v1.0")

---

### 9. Anonymous Shared Viewer

| Property | Value |
|---|---|
| Route | `/shared/:token` |
| File | `src/pages/SharedViewer.tsx` |
| Flow | Viewer Onboarding (anonymous path) |
| Nav | No bottom nav |
| Status | Complete |

**Description:** Simplified live view for invited viewers.

- Full-bleed real interactive Mapbox GL JS map (dark-v11 style) via MapPlaceholder
- **Top banner:** "Watching Thomas's Model Y" with gold accent dot, blurred dark background
- Gold vehicle marker with heading arrow
- **Simplified bottom sheet (two states):**
  - Peek (180px): Vehicle name, status label (colored text), status message, speed (if driving), battery percentage + thin bar
  - Half (340px): + "Sign up for more features" text + gold "Sign up for more" link
- No bottom navigation tabs
- Mockup toggle buttons for peek/half states (for demonstration)

---

## Navigation Architecture

### Bottom Tab Navigation (4 tabs)

| Tab | Icon | Route | Active When |
|---|---|---|---|
| Map | Home | `/home` | Path is `/home` |
| Drives | Clock | `/drives` | Path starts with `/drives` |
| Share | People | `/invites` | Path is `/invites` |
| Settings | Gear | `/settings` | Path is `/settings` |

### Nav Visibility Rules

| Route Pattern | Bottom Nav | Reason |
|---|---|---|
| `/` | Hidden | Auth screen |
| `/signup` | Hidden | Auth screen |
| `/home/empty` | Hidden | Empty state (onboarding) |
| `/shared/*` | Hidden | Anonymous viewer |
| All other routes | Visible | Authenticated experience |

### Navigation Flow Map

```
/ (Sign In — social-only: Google + Apple)
  -> /home (after auth)

/signup (Redirect)
  -> / (redirects to Sign In)

/home (Live Map) [DEFAULT]
  -> tap dot indicators to switch between vehicles

/home/empty (Empty State)
  -> /home (after adding a vehicle or entering invite code)

/drives (Drive History)
  -> /drives/:driveId (tap any drive)
  -> /home (active drive banner)

/drives/:driveId (Drive Summary)
  -> /drives (back navigation)

/invites (Share / Invite Management)
  (self-contained)

/settings (Settings)
  -> / (Sign Out)

/shared/:token (Anonymous Viewer)
  -> /signup (Sign up for more)
```

---

## Shared Components

| Component | File | Used On |
|---|---|---|
| StatusBadge | `src/components/StatusBadge.tsx` | Home, SharedViewer |
| BatteryBar | `src/components/BatteryBar.tsx` | (available for use) |
| MapPlaceholder | `src/components/MapPlaceholder.tsx` | Home, DriveSummary, SharedViewer -- interactive Mapbox GL JS map with optional route rendering (two-tone completed/remaining segments, start/end markers, auto-fit bounds, zoom-to-fit button) and gold vehicle marker with heading arrow + pulse animation |
| BottomNav | `src/components/BottomNav.tsx` | Layout (authenticated screens) |
| Layout | `src/components/Layout.tsx` | App shell (wraps all routes) |

---

## Mock Data

| Entity | Count | File | Details |
|---|---|---|---|
| Vehicles | 2 | `src/data/mockData.ts` | "Midnight Runner" (Model Y, driving), "Pearl" (Model 3, charging) |
| Drives | 6 | `src/data/mockData.ts` | 5 for vehicle v1, 1 for v2. Austin TX locations. Feb 20-22, 2026 |
| Invites | 4 | `src/data/mockData.ts` | 2 accepted (Mom, Alex), 2 pending (Jamie, Dad) |

All data is static and hardcoded. No API calls, no backend, no authentication logic.

---

## Key Design Changes from v1

1. **Dashboard removed.** Home IS the live map (`/home`).
2. **4 bottom tabs** (Map, Drives, Share, Settings) instead of 5.
3. **Real interactive Mapbox GL JS map** (dark-v11) with route rendering instead of SVG grid placeholder.
4. **Gold vehicle marker** with pulse glow instead of status-colored marker.
5. **Tesla Robotaxi color palette** -- near-black backgrounds, gold accent only.
6. **Generous whitespace** throughout all screens -- light font weights, uppercase labels, spacious sections.
7. **Empty state** (`/home/empty`) is a first-class polished screen.
8. **Multi-vehicle tap** via dot indicators (tap-only, not swipe -- swipe conflicts with map panning) instead of a separate dashboard/picker.
9. **Simplified routes** -- `/drives` and `/drives/:driveId` instead of nested `/live/:vehicleId/drives`.
10. **Minimal information density** -- progressive disclosure via bottom sheet states.
