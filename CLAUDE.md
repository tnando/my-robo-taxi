# MyRoboTaxi — Project Rules

## Project Overview

MyRoboTaxi is a Tesla vehicle tracking web app (Next.js 14+, TypeScript, Tailwind CSS v4, Mapbox GL JS). The owner links their Tesla account and shares live vehicle status, location, and drive history with friends and family.

## Critical Documents (Read Before Writing Code)

1. **Frontend Architecture:** `docs/design/frontend-architecture.md` — project structure, component design, feature modules, state management, testing strategy, code quality rules
2. **Frontend Agent Instructions:** `agents/frontend-agent.md` — mock reference, design tokens, Mapbox integration guide, known gotchas
3. **Design System:** `docs/design/design-system.md` — color tokens, typography, spacing, component specs
4. **Screen Inventory:** `docs/design/screen-inventory.md` — all screens with routes and component breakdowns
5. **UI Mocks:** `ui-mocks/` — canonical design spec (Vite + React + Tailwind). Every pixel is intentional.

## Architecture Rules (Enforced)

### Project Structure

```
src/
  app/           → Routes, layouts, metadata ONLY. No business logic.
  components/    → Shared UI primitives (ui/, map/, layout/)
  features/      → Self-contained domain modules (vehicles/, drives/, invites/, settings/, auth/)
  hooks/         → Shared utility hooks (no business logic)
  lib/           → Pure utilities, API clients, constants (no React code)
  types/         → Shared TypeScript interfaces
```

### The Import Rule (Most Important Constraint)

Features NEVER import from other features. Cross-feature composition happens exclusively in `app/` pages.

```
features/vehicles/ CAN import from → components/, hooks/, lib/, types/
features/vehicles/ CANNOT import from → features/drives/, features/invites/, etc.
```

### Feature Module Pattern

Each feature directory contains:
- `components/` — feature-specific components
- `hooks/` — feature-specific hooks
- `api/` — server actions or API call functions
- `types.ts` — feature-specific types
- `index.ts` — public API barrel file (only export what other parts of the app need)

### Component Rules

- **Single Responsibility:** Every component does exactly one thing
- **File size limit:** No file over 200 lines (excluding imports and type definitions). Decompose if exceeded.
- **Props limit:** If a component takes more than 5 props, decompose or group into a domain object
- **Named exports only.** No default exports.
- **All component props must have an explicit named interface** (not inline)
- **No `any` types.** Use `unknown` and narrow with type guards.

### Styling

- **Tailwind classes only.** No inline `style={{}}` except for truly dynamic values (computed positions, progress bar widths)
- **No CSS-in-JS.** No styled-components, no emotion, no CSS modules.
- Design tokens are defined in `ui-mocks/src/index.css` — replicate in Tailwind config

### State Management

| Category | Where |
|---|---|
| Server state | React Server Components + SWR for client revalidation |
| Client state | `useState` / `useReducer` in nearest common ancestor |
| URL state | `searchParams` via `useSearchParams()` |
| Real-time state | WebSocket → custom hook → React state |
| Form state | `react-hook-form` |

### Mapbox GL JS

- Dynamic import with `ssr: false` (Mapbox depends on `window`/`document`)
- `mapLoaded` MUST be `useState`, NOT `useRef` (effects depend on it)
- Tailwind v4 CSS overrides are MANDATORY (see `agents/frontend-agent.md`)
- Import `mapbox-gl/dist/mapbox-gl.css`
- Token via `NEXT_PUBLIC_MAPBOX_TOKEN` in `lib/mapbox.ts`

### Testing

- **Vitest + React Testing Library** for unit/integration tests
- **Playwright** for E2E tests
- Tests mirror `src/` structure in `__tests__/`
- Every component and hook must be testable in isolation
- No hard dependencies on global singletons — inject via props or context

### Imports

- Use path aliases: `@/components/...`, `@/features/...`, `@/lib/...`, `@/types/...`
- Group imports: React/Next.js → external libraries → internal modules (blank line between groups)

## Commit Strategy

Commit after completing each logical unit of work. A logical unit is one of:

1. A single component (with its props interface and any helper functions)
2. A single hook
3. A single feature module's scaffolding (directory + index.ts + types.ts)
4. A page route wired up to its feature components
5. A test file covering a component or hook
6. A configuration change (Tailwind config, ESLint, tsconfig)

### Commit Rules

- **Build must pass before committing.** Run `npm run build` (or `next build`) to verify.
- **No broken imports.** Every import must resolve.
- **Commit message format:** Start with a verb in imperative mood. Examples:
  - `Add TripProgressBar component with stop markers and gold glow animation`
  - `Create vehicles feature module with hooks and types`
  - `Wire up /drives/[driveId] page to DriveSummaryScreen`
  - `Add unit tests for useDriveSort hook`
- **Never commit secrets** (.env, tokens, credentials)
- **Never commit node_modules, .next, or build artifacts**

## Pull Request Requirements

Every PR **must** include screenshots of all affected screens committed to the repo.

### Linking Media in PR Descriptions (Private Repo)

Since this repo is private, relative paths and `raw.githubusercontent.com` URLs do NOT work in PR descriptions. Use full blob URLs with `?raw=true`:

```markdown
![Sign In](https://github.com/tnando/my-robo-taxi/blob/<branch>/docs/screenshots/01-signin.png?raw=true)
```

The pattern is: `https://github.com/tnando/my-robo-taxi/blob/<branch>/<path>?raw=true`

Replace `<branch>` with the PR branch name (e.g., `feature/frontend-ui`).

## What NOT to Do

- Do NOT put business logic in `app/` pages — pages are thin orchestrators
- Do NOT put feature-specific components in `components/` — they go in `features/[feature]/components/`
- Do NOT use global state libraries (Redux, Zustand) — use colocated state
- Do NOT modify database schema or API routes — that is the Backend Agent's job
- Do NOT use default exports
- Do NOT use `any` types
- Do NOT exceed 200 lines per file
- Do NOT import across feature boundaries
