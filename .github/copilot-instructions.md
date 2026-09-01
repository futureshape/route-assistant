# Route Assistant Project - LLM Instructions

## Project Overview
This is a full-stack web application that helps cyclists explore routes and find Points of Interest (POIs) along cycling routes using RideWithGPS integration and Google Maps.

## Architecture
- **Workers with Static Assets**: Cloudflare Worker handles `/api/*` and `/auth/*`; everything else is served as static CDN assets (React SPA)
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Cloudflare Worker with Hono HTTP router
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Sessions**: Cloudflare KV (replaces express-session; 30-day TTL)
- **Authentication**: RideWithGPS OAuth integration
- **Maps**: Google Maps JavaScript API for route visualization and POI search
- **Modular Design**: Feature-based component architecture for better maintainability

## File Structure
```
/
├── wrangler.toml             # Cloudflare Worker config (D1, KV, assets)
├── migrations/
│   └── 0001_initial.sql      # D1 schema
├── components.json           # shadcn/ui configuration
├── package.json              # dependencies and scripts
├── .dev.vars                 # local secrets (gitignored; copy from .dev.vars.example)
├── .dev.vars.example         # secrets template
├── public/                   # Static assets served directly
├── src/
│   ├── worker/               # Cloudflare Worker backend
│   │   ├── index.ts          # Hono app entry point
│   │   ├── types.ts          # Env, SessionData, DbUser, AppEnv types
│   │   ├── lib/
│   │   │   ├── poi-type-mapping.ts  # Google/OSM → RWGPS type mapping
│   │   │   ├── utils.ts             # polyline helpers, crypto, etc.
│   │   │   └── polyline.d.ts        # @mapbox/polyline type declaration
│   │   ├── services/
│   │   │   ├── user.ts       # Async D1 user service
│   │   │   └── email.ts      # Mailersend REST API email service
│   │   ├── middleware/
│   │   │   ├── session.ts    # KV-backed session middleware
│   │   │   ├── csrf.ts       # CSRF token validation middleware
│   │   │   └── auth.ts       # requireAuth, requireAccess, requireAdmin
│   │   └── routes/
│   │       ├── auth.ts       # /auth/ridewithgps, /auth/test
│   │       └── api/
│   │           ├── session.ts # GET /api/session, POST /api/logout, GET /api/csrf-token
│   │           ├── user.ts    # POST /api/user/email, GET /api/verify-email
│   │           ├── routes.ts  # GET /api/routes, GET /api/route/:id, PATCH .../pois
│   │           ├── poi.ts     # POST /api/poi-search/*, POST /api/poi-from-place-id
│   │           └── admin.ts   # GET /api/admin/users, PATCH /api/admin/users/:id
│   ├── App.tsx              # Main application orchestrator
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles with CSS variables
│   ├── features/            # Feature-based component organization
│   │   ├── routes/          # Route management components
│   │   ├── map/             # Map visualization components
│   │   ├── poi/             # POI search and management
│   │   └── elevation/       # Elevation profile functionality
│   ├── components/
│   │   ├── AuthHeader.tsx   # Authentication UI component
│   │   ├── IntroScreen.tsx  # Welcome/help dialog
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Shared frontend utilities and services
│   ├── store/               # Zustand store
│   └── types/               # Shared TypeScript types
└── tailwind.config.js       # Tailwind CSS configuration
```

## Key Technologies & Dependencies
- **React**: Frontend framework with TypeScript
- **Vite** + **@cloudflare/vite-plugin**: Build tool; dev server runs Worker + React together
- **Cloudflare Workers**: Serverless backend (replaces Express.js)
- **Hono**: Lightweight HTTP router for Workers (replaces Express)
- **Cloudflare D1**: SQLite-compatible database (replaces better-sqlite3)
- **Cloudflare KV**: Session storage (replaces express-session)
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built accessible React components
- **Radix UI**: Headless UI primitives (used by shadcn/ui)
- **lucide-react**: Icon library
- **Google Maps API**: Map visualization and geocoding via @vis.gl/react-google-maps
- **RideWithGPS API**: Route data and user authentication
- **Recharts**: Elevation profile chart visualization
- **POI Providers**: Modular system for different POI data sources

## Development Guidelines

### Component Structure
- Use shadcn/ui components when possible
- Import paths use `@/` alias for `src/` directory
- CSS variables defined in `src/index.css` for theming
- Components should be TypeScript with proper type annotations
- **Feature-based organization**: Components grouped by feature in `src/features/`
- **Single responsibility**: Each component handles one specific concern
- **Props interface**: All components have clear TypeScript prop interfaces
- **Index files**: Use `index.ts` files for clean feature exports

### API Patterns
- REST endpoints under `/api/` prefix
- Session-based authentication using Cloudflare KV sessions
- Routes: `/api/session`, `/api/routes`, `/api/route/:id`, `/api/poi-search/*`
- **POI Integration**: PATCH `/api/route/:id/pois` for adding POIs to routes
- **Pagination**: Route fetching supports pagination for large datasets
- **Worker code lives in `src/worker/`**: Never mix Worker and frontend code
- **D1 queries are async**: All user service calls return Promises; always `await` them

### Styling Conventions
- Use Tailwind utility classes
- CSS variables for theme colors (supports light/dark mode)
- shadcn/ui provides consistent component styling
- Sidebar uses specific CSS variables: `--sidebar-*`

### State Management
- React built-in hooks (useState, useEffect)
- Local component state for UI interactions
- Session state managed via API calls
- **Props-based communication**: Parent components pass state and callbacks to features
- **Loading states**: Components show loading indicators during async operations

### UI Development
- **Always use shadcn/ui components** when available - never create custom versions
- **Follow shadcn/ui patterns** for consistent styling and behavior
- **Use Lucide icons** from `lucide-react` package for all icon needs
- **Avoid inline SVGs** - check Lucide library first before creating custom icons
- **Loading indicators**: Use `<Loader2 className="animate-spin" />` pattern for spinners
- **Button states**: Follow shadcn/ui button patterns for loading, disabled, and variant states
- **API call buttons**: All buttons that trigger API calls with potential delays MUST show a loading indicator (spinner) and disable the button during the operation
- **Form components**: Use shadcn/ui form components (Input, Select, Checkbox, etc.)
- **Consistent spacing**: Use Tailwind spacing utilities consistently with shadcn/ui
- **Color system**: Use CSS variables and shadcn/ui color tokens
- **Responsive design**: Follow Tailwind responsive patterns
- **Alert Dialogs**: NEVER use browser native `alert()` - always use the custom `useAlert()` hook from `@/hooks/use-alert-dialog`
  - Use `showAlert(message, title)` for general notifications
  - Use `showError(message)` for error messages
  - Use `showSuccess(message)` for success confirmations
  - All methods support optional secondary actions via options object:
    - `secondaryActionLabel`: Label for the secondary button (e.g., "View in RideWithGPS")
    - `onSecondaryAction`: Callback function for the secondary button
  - Example with secondary action: `showSuccess('POIs sent!', { secondaryActionLabel: 'View Route', onSecondaryAction: () => window.open(url) })`
  - The `AlertDialogProvider` component is already included in App.tsx
  - These dialogs are accessible, styled with shadcn/ui, and provide better UX than native alerts

### Authentication Flow
1. User clicks "Sign in with RideWithGPS"
2. Redirects to RideWithGPS OAuth
3. Backend exchanges code for access token
4. Frontend checks `/api/session` for auth status
5. New users provide email address (if not already set)
6. Email verification email sent automatically
7. Users must verify email before accessing routes
8. Authenticated and verified users can access routes via `/api/routes`

**Access Control**: Users need both approved status (`beta` or `active`) AND verified email to access the app. Admins always have access regardless of email verification.

## Feature Architecture

### Route Management (`src/features/routes/`)
- **RouteSelector**: Dropdown with search functionality for route selection
- **RouteSwitchDialog**: Confirmation dialog when switching routes with unsaved POIs
- Handles route loading states and user feedback

### Map Visualization (`src/features/map/`)
- **MapContainer**: Main Google Maps wrapper with bounds management
- **RoutePolyline**: Renders route paths with configurable styling
- **POIMarkers**: Displays POI markers with state-based icons (suggested/selected/existing)
- **POIInfoWindow**: Interactive popup showing POI details and actions

### POI Management (`src/features/poi/`)
- **POISearch**: Provider-based search interface with accordion layout
- **POISummary**: Shows selected POI count and "Send to RideWithGPS" action
- Supports multiple POI providers (Google Maps, Mock, etc.)

### Elevation Profile (`src/features/elevation/`)
- **ElevationChart**: Interactive Recharts-based elevation visualization
- Chart-to-map synchronization for hover interactions
- Collapsible interface with smooth animations

## POI Provider System
- **Modular architecture**: Easy to add new POI data sources
- **Provider interface**: Standardized POI search and result format
- **Registry system**: Dynamic provider loading and configuration
- **Google Maps integration**: Primary POI provider with Places API
- **Type mapping**: Automatic conversion from Google Places types to RideWithGPS POI categories

### Common Patterns
- Use `cn()` utility for conditional classnames
- shadcn/ui components follow compound component pattern
- API responses follow `{ success: boolean, data?: any, error?: string }` structure
- Error handling via alerts (consider upgrading to toast notifications)
- **Feature imports**: Import from feature index files (e.g., `@/features/routes`)
- **Component composition**: Features receive props and callbacks from App.tsx
- **Type safety**: All components have proper TypeScript interfaces
## Important Notes
- **Worker + Assets**: Worker handles `/api/*` and `/auth/*`; static assets handle everything else
- **shadcn/ui**: Always use official shadcn components, don't create custom versions
- **Import aliases**: Use `@/` for imports, not relative paths
- **Width matching**: Popover components should match trigger width using `--radix-popover-trigger-width`
- **Route selection**: Use route names for search, route IDs for unique identification
- **Maps integration**: Google Maps loads via script tag with callback
- **Feature structure**: Follow the established pattern when adding new features
- **Component size**: Keep components focused and under ~200 lines when possible
- **No Node.js APIs in Worker**: Use Web APIs (`fetch`, `crypto.randomUUID()`, `URL`, etc.)
- **Session mutations**: Mutate `c.get('session')` directly; the session middleware auto-saves after each request
- **D1 migrations**: Add new `.sql` files to `migrations/` and run `npm run d1:migrate` (local) or `npm run d1:migrate:remote` (production)

## Environment Variables

Local development: set in `.dev.vars` (gitignored; copy from `.dev.vars.example`)  
Production: set via `wrangler secret put <NAME>`

- `RWGPS_CLIENT_ID`: RideWithGPS OAuth client ID
- `RWGPS_CLIENT_SECRET`: RideWithGPS OAuth client secret
- `GOOGLE_API_KEY`: Google Maps JavaScript + Places API key
- `BASE_URL`: Public URL for email verification links (e.g. `https://your-worker.workers.dev`)
- `MAILERSEND_API_KEY`: Optional — email notifications
- `MAILERSEND_FROM_EMAIL`, `MAILERSEND_FROM_NAME`: Optional — email sender
- `MAILERSEND_VERIFICATION_TEMPLATE_ID`: Optional — email template ID
- `MAILERSEND_BETA_ACCESS_TEMPLATE_ID`: Optional — email template ID
- `TEST_OAUTH_TOKEN`: Local dev only — real RWGPS token for E2E tests (in `.dev.vars`)
- `TEST_MODE`: Set to `"true"` in `wrangler.toml [vars]` for local dev; absent in production

## Development Commands
- `npm run dev`: Start development server (Cloudflare Vite plugin — Worker + React on port 3001)
- `npm run build`: Build Worker + React app for production
- `npm run deploy`: Build and deploy to Cloudflare Workers
- `npm run d1:migrate`: Apply D1 migrations locally
- `npm run d1:migrate:remote`: Apply D1 migrations to production
- `npm run preview`: Preview production build locally

### Testing Commands
- `npm run test:e2e`: Run E2E tests (headless)
- `npm run test:e2e:bootstrap-auth`: Run only Playwright setup chain needed for authenticated state (`create-route` -> `auth`)
- `npm run test:e2e:cleanup`: Run only Playwright cleanup project to delete test route(s)
- `npm run test:e2e:ui`: Run E2E tests with Playwright UI
- `npm run test:e2e:headed`: Run E2E tests with visible browser
- `npm run test:e2e:debug`: Run E2E tests in debug mode
- `npm run test:e2e:video`: Run E2E tests with video recording
- `npm run test:e2e:report`: View HTML test report

### Agent Runbook: Logged-In UI Validation and Screenshots
- If asked to launch the app and validate or screenshot logged-in features, bootstrap auth first.
- Run `npm run test:e2e:bootstrap-auth` before taking screenshots or checking authenticated UI states.
- After screenshot/validation tasks are complete, run `npm run test:e2e:cleanup` to remove created test routes.
- This uses Playwright project dependencies in `playwright.config.ts` to run setup in order: `create-route` then `auth`.
- The auth setup calls `/auth/test` (available only when `TEST_MODE=true` in `wrangler.toml [vars]`) and stores authenticated state in `tests/e2e/.auth/user.json`.
- Ensure `TEST_OAUTH_TOKEN` is set in `.dev.vars` when running E2E tests.

## Testing

### E2E Testing
The project uses **Playwright** for end-to-end testing with real RideWithGPS OAuth authentication.

**Key Features**:
- Real OAuth token authentication (no mocking)
- **Automatic test route creation**: Each test run creates a unique route in RideWithGPS
- **Automatic cleanup**: Test routes are deleted after all tests complete
- Local D1 state persists across runs (in `.wrangler/state/v3/d1/`)
- Sequential test execution with shared page context
- Video recording support
- 11 comprehensive tests (2 setup + 8 tests + 1 teardown) covering complete user journey

**Test Coverage**:
- Unique route creation in RideWithGPS (setup)
- Authentication and session management
- Route loading and selection
- Google Maps POI search
- OpenStreetMap POI search
- POI marker interactions (programmatic clicking)
- POI state management (suggested → selected)
- Automatic route cleanup (teardown)

**Documentation**: See `tests/e2e/IMPLEMENTATION_SUMMARY.md` for complete implementation details, test architecture, and usage guide.

**Adding Test IDs**: When creating new interactive components, add `data-testid` attributes for E2E testing:
```tsx
<Button data-testid="my-button-action">Click Me</Button>
```

**Marker Testing**: Google Maps markers require special handling. Use test helper functions:
- `__testGetMarkers()` - Get all markers with metadata
- `__testClickMarkerByKey(key)` - Click marker programmatically
- `__testClickMarkerByName(name)` - Click marker by POI name
- `__testClickMarkerByIndex(index)` - Click marker by array index

See `tests/e2e/MARKER_TESTING_PROPOSAL.md` for technical details.

## Debugging Tips
- Check browser console for Google Maps API errors
- Verify environment variables are set
- Check Network tab for API request/response issues
- Use React DevTools for component state inspection
- For E2E test failures: Run `npm run test:e2e:ui` for interactive debugging

## Future Considerations
- Add toast notifications instead of alerts
- Implement proper error boundaries
- Add loading states for better UX
- Consider adding route sharing functionality
- Add offline support for cached routes
- **Refactoring completed**: App.tsx successfully refactored from 1,153 to 680 lines
- **Next phase**: Consider extracting custom hooks and adding context providers

## Testing Status
- **E2E Testing**: ✅ Comprehensive Playwright implementation complete (11 tests, ~14.4s)
  - Automatic unique route creation before each test run
  - Automatic route cleanup after all tests (successful or failed)
  - Sequential execution with shared page context
  - Real OAuth authentication, persistent test database
  - Full user journey coverage: route creation → authentication → route selection → POI search → marker interactions → send to RideWithGPS → persistence verification → cleanup
  - See `tests/e2e/IMPLEMENTATION_SUMMARY.md` for details
- **Unit Testing**: Not yet implemented
- **Integration Testing**: Not yet implemented

## Documentation Guidelines

### README Updates
- **Update top-level README.md** when adding new major functionality or features
- Keep the main README focused on user-facing features, setup, and high-level architecture
- Major functionality includes: new POI providers, authentication methods, map features, route management capabilities

### Technical Documentation
- **Create or update technical docs in `docs/`** for architectural changes
- All technical documentation must go in the `docs/` folder, never create top-level documentation files
- Update `docs/STORE_USAGE_GUIDE.md` when state management patterns change
- Create new docs in `docs/` for significant architectural decisions or new development patterns
- Update `docs/README.md` when adding new documentation files

### Architecture Documentation
- This file (`.github/copilot-instructions.md`) should be updated for:
  - Changes to the overall project structure
  - New development patterns or conventions
  - Changes to the technology stack
  - Updates to API patterns or authentication flows
  - New feature architecture patterns

### Documentation Rules
- **Never create documentation files in the project root** (except README.md)
- All technical docs go in `docs/` folder
- Keep documentation focused and avoid redundancy
- Reference existing docs rather than duplicating information
- Remove outdated documentation when functionality changes
