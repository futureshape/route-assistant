# Route Assistant Project - LLM Instructions

## Project Overview
This is a full-stack web application that helps cyclists explore routes and find Points of Interest (POIs) along cycling routes using RideWithGPS integration and Google Maps.

## Architecture
- **Single-server setup**: Express.js backend serves both API endpoints and the React frontend
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Express.js with session-based OAuth authentication
- **Authentication**: RideWithGPS OAuth integration
- **Maps**: Google Maps JavaScript API for route visualization and POI search

## File Structure
```
/
├── server.js                 # Main Express server (serves both API and frontend)
├── components.json           # shadcn/ui configuration
├── package.json              # Node.js dependencies and scripts
├── public/                   # Static assets served by Express
├── src/                      # React frontend source
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles with CSS variables
│   ├── components/
│   │   ├── AuthHeader.tsx   # Authentication UI component
│   │   └── ui/              # shadcn/ui components
│   └── lib/
│       └── utils.ts         # Utility functions (cn classname helper)
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
- **Google Maps API**: Map visualization and geocoding
- **RideWithGPS API**: Route data and user authentication

## Development Guidelines

### Component Structure
- Use shadcn/ui components when possible
- Import paths use `@/` alias for `src/` directory
- CSS variables defined in `src/index.css` for theming
- Components should be TypeScript with proper type annotations

### API Patterns
- REST endpoints under `/api/` prefix
- Session-based authentication using Express sessions
- Routes: `/api/session`, `/api/routes`, `/api/route/:id`, `/api/search-along-route`

### Styling Conventions
- Use Tailwind utility classes
- CSS variables for theme colors (supports light/dark mode)
- shadcn/ui provides consistent component styling
- Sidebar uses specific CSS variables: `--sidebar-*`

### State Management
- React built-in hooks (useState, useEffect)
- Local component state for UI interactions
- Session state managed via API calls

### Authentication Flow
1. User clicks "Sign in with RideWithGPS"
2. Redirects to RideWithGPS OAuth
3. Backend exchanges code for access token
4. Frontend checks `/api/session` for auth status
5. Authenticated users can access routes via `/api/routes`

### Common Patterns
- Use `cn()` utility for conditional classnames
- shadcn/ui components follow compound component pattern
- API responses follow `{ success: boolean, data?: any, error?: string }` structure
- Error handling via alerts (consider upgrading to toast notifications)

## Important Notes
- **Single server**: Don't create separate frontend/backend - server.js handles both
- **shadcn/ui**: Always use official shadcn components, don't create custom versions
- **Import aliases**: Use `@/` for imports, not relative paths
- **Width matching**: Popover components should match trigger width using `--radix-popover-trigger-width`
- **Route selection**: Use route names for search, route IDs for unique identification
- **Maps integration**: Google Maps loads via script tag with callback

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
