# Route Assistant Project - LLM Instructions

## Project Overview
This is a full-stack web application that helps cyclists explore routes and find Points of Interest (POIs) along cycling routes using RideWithGPS integration and Google Maps.

## Architecture
- **Single-server setup**: Express.js backend serves both API endpoints and the React frontend
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Express.js with session-based OAuth authentication
- **Authentication**: RideWithGPS OAuth integration
- **Maps**: Google Maps JavaScript API for route visualization and POI search
- **Modular Design**: Feature-based component architecture for better maintainability

## File Structure
```
/
├── server.js                 # Main Express server (serves both API and frontend)
├── poi-type-mapping.js       # Google Places to RideWithGPS POI type mapping
├── components.json           # shadcn/ui configuration
├── package.json              # Node.js dependencies and scripts
├── public/                   # Static assets served by Express
├── src/                      # React frontend source
│   ├── App.tsx              # Main application orchestrator (680 lines)
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles with CSS variables
│   ├── features/            # Feature-based component organization
│   │   ├── routes/          # Route management components
│   │   │   ├── RouteSelector.tsx      # Route dropdown with search
│   │   │   ├── RouteSwitchDialog.tsx  # Route switching confirmation
│   │   │   └── index.ts               # Feature exports
│   │   ├── map/             # Map visualization components
│   │   │   ├── MapContainer.tsx       # Main map wrapper
│   │   │   ├── RoutePolyline.tsx      # Route path rendering
│   │   │   ├── POIMarkers.tsx         # POI marker display
│   │   │   ├── POIInfoWindow.tsx      # POI detail popup
│   │   │   └── index.ts               # Feature exports
│   │   ├── poi/             # POI search and management
│   │   │   ├── POISearch.tsx          # Provider-based POI search
│   │   │   ├── POISummary.tsx         # Selected POIs summary
│   │   │   └── index.ts               # Feature exports
│   │   └── elevation/       # Elevation profile functionality
│   │       ├── ElevationChart.tsx     # Interactive elevation chart
│   │       └── index.ts               # Feature exports
│   ├── components/
│   │   ├── AuthHeader.tsx   # Authentication UI component
│   │   ├── IntroScreen.tsx  # Welcome/help dialog
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   │   └── use-mobile.tsx   # Mobile detection hook
│   └── lib/                 # Shared utilities and services
│       ├── utils.ts         # Utility functions (cn classname helper)
│       ├── poi-providers.ts # POI provider interface definitions
│       ├── provider-registry.ts # POI provider registration
│       ├── google-maps-provider.tsx # Google Maps POI provider
│       └── mock-provider.tsx        # Mock POI provider for testing
└── tailwind.config.js       # Tailwind CSS configuration
```

## Key Technologies & Dependencies
- **React**: Frontend framework with TypeScript
- **Vite**: Build tool and dev server
- **Express.js**: Backend server
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
- Session-based authentication using Express sessions
- Routes: `/api/session`, `/api/routes`, `/api/route/:id`, `/api/search-along-route`
- **POI Integration**: PATCH `/api/route/:id/pois` for adding POIs to routes
- **Pagination**: Route fetching supports pagination for large datasets

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

### Authentication Flow
1. User clicks "Sign in with RideWithGPS"
2. Redirects to RideWithGPS OAuth
3. Backend exchanges code for access token
4. Frontend checks `/api/session` for auth status
5. Authenticated users can access routes via `/api/routes`

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
- **Single server**: Don't create separate frontend/backend - server.js handles both
- **shadcn/ui**: Always use official shadcn components, don't create custom versions
- **Import aliases**: Use `@/` for imports, not relative paths
- **Width matching**: Popover components should match trigger width using `--radix-popover-trigger-width`
- **Route selection**: Use route names for search, route IDs for unique identification
- **Maps integration**: Google Maps loads via script tag with callback
- **Feature structure**: Follow the established pattern when adding new features
- **Component size**: Keep components focused and under ~200 lines when possible

## Environment Variables
- `RIDEWITHGPS_CLIENT_ID`: RideWithGPS OAuth client ID
- `RIDEWITHGPS_CLIENT_SECRET`: RideWithGPS OAuth client secret
- `GOOGLE_MAPS_API_KEY`: Google Maps JavaScript API key
- `SESSION_SECRET`: Express session secret

## Development Commands
- `npm run dev`: Start development server (Vite + Express)
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## Debugging Tips
- Check browser console for Google Maps API errors
- Verify environment variables are set
- Check Network tab for API request/response issues
- Use React DevTools for component state inspection

## Future Considerations
- Add toast notifications instead of alerts
- Implement proper error boundaries
- Add loading states for better UX
- Consider adding route sharing functionality
- Add offline support for cached routes
- **Refactoring completed**: App.tsx successfully refactored from 1,153 to 680 lines
- **Next phase**: Consider extracting custom hooks and adding context providers
- **Testing**: Add unit tests for individual feature components
