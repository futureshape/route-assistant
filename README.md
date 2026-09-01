# Route Assistant

A full-stack web application that helps cyclists explore routes and discover Points of Interest (POIs) along cycling routes using RideWithGPS integration and Google Maps.

## Features

### Route Management
- **RideWithGPS Integration**: Secure OAuth authentication with RideWithGPS
- **Route Selection**: Browse and select from your personal cycling routes
- **Route Visualization**: Interactive Google Maps display with route polylines
- **Elevation Profiles**: Interactive elevation charts with map synchronization

### Point of Interest Discovery
- **Multiple POI Providers**: Modular system supporting Google Places, OpenStreetMap, and extensible to other providers
- **OSM Integration**: Free, community-maintained POI data via Overpass API with 22 cycling-relevant amenity types
- **Smart Search**: Search for specific POI types (restaurants, bike shops, lodging, etc.) along your route
- **Native POI Integration**: Click on native Google Maps POI markers to add them to your route
- **POI Management**: Add, review, and organize POIs before sending to RideWithGPS
- **Automatic Type Mapping**: Intelligent conversion from Google Places and OSM types to RideWithGPS POI categories

### User Experience
- **User Authentication**: Secure RideWithGPS OAuth with beta access control
- **Email Collection**: Capture user emails for service updates and communications
- **Email Notifications**: Automated email verification and beta access notifications via Mailersend
- **Waitlist System**: Queue new users for approval during beta phase
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Real-time Updates**: Live map interactions and instant POI discovery
- **Route Switching**: Smart confirmation dialogs when switching routes with unsaved changes

## Quick Start

### Prerequisites
- Node.js 18+
- RideWithGPS account and OAuth application
- Google Cloud Platform account with Maps and Places APIs enabled
- Cloudflare account (free tier is sufficient)

### Installation
1. Clone the repository
2. `npm install`
3. Copy `.dev.vars.example` to `.dev.vars` and fill in your credentials:
   ```
   RWGPS_CLIENT_ID=your_ridewithgps_client_id
   RWGPS_CLIENT_SECRET=your_ridewithgps_client_secret
   GOOGLE_API_KEY=your_google_maps_api_key
   BASE_URL=http://localhost:3001
   
   # Optional: Configure Mailersend for email notifications
   MAILERSEND_API_KEY=your_mailersend_api_key
   MAILERSEND_VERIFICATION_TEMPLATE_ID=your_verification_template_id
   MAILERSEND_BETA_ACCESS_TEMPLATE_ID=your_beta_access_template_id

   # E2E test authentication token
   TEST_OAUTH_TOKEN=your_test_oauth_token
   ```
4. Apply the local D1 database schema: `npm run d1:migrate`
5. Start development server: `npm run dev`
6. Open http://localhost:3001

### Production Deployment
1. Set Cloudflare secrets: `wrangler secret put RWGPS_CLIENT_ID` (repeat for each secret)
2. Apply the remote D1 schema: `npm run d1:migrate:remote`
3. Build and deploy: `npm run deploy`

## API Requirements

### Google Cloud Platform
Your Google API key must have the following APIs enabled:
- **Maps JavaScript API**: For interactive map display
- **Places API**: For POI search and place details

### OpenStreetMap
The OSM POI provider uses the public Overpass API at `https://overpass-api.de/api/interpreter`:
- **No API Key Required**: Free to use with reasonable rate limits
- **See**: [docs/OSM_PROVIDER.md](docs/OSM_PROVIDER.md) for detailed usage and configuration

### RideWithGPS OAuth
Create an OAuth application in your RideWithGPS account with:
- **Redirect URI**: `https://yourdomain.com/auth/ridewithgps/callback` (or `http://localhost:3001/auth/ridewithgps/callback` for development)
- **Scopes**: Route read/write permissions

### Mailersend (Optional)
For email notifications and verification:
- **Email Verification**: Sent when users provide their email address with a verification link
  - Users click the link to verify email ownership
  - Verification status tracked in database
- **Beta Access Notifications**: Sent when users are approved from waitlist to beta/active status
- **Setup**: Create email templates in Mailersend dashboard and configure template IDs in environment variables
- **Template Variables**:
  - Verification email: `user_name`, `user_email`, `verification_url`
  - Beta access email: `user_name`, `user_email`, `access_level`
- **Note**: Email notifications are optional - the app will function normally without Mailersend configured

## Architecture

This application uses **Cloudflare Workers** with static assets serving — a single deployment unit where `/api/*` and `/auth/*` requests are handled by the Worker, and everything else is served as static files from the Vite-built React app.

### Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, Google Maps JavaScript API
- **Backend**: Cloudflare Workers, Hono (HTTP router)
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Sessions**: Cloudflare KV (replaces server-side express-session)
- **State Management**: Zustand for client-side state
- **Build Tools**: Vite with `@cloudflare/vite-plugin`

## User Management

### Beta Access Control

During the beta phase, Route Assistant uses a waitlist system:

1. **First Sign-In**: Users authenticate with RideWithGPS and provide their email address
2. **Waitlist**: New users are placed on a waitlist by default
3. **Approval**: Admins can approve users to grant beta access
4. **Access Granted**: Approved users can access all features

### Admin Operations

Admins manage users via `wrangler d1 execute`:

```bash
# List all users
wrangler d1 execute route-assistant-db --command "SELECT id, rwgps_user_id, email, email_verified, status, role, created_at FROM users ORDER BY created_at DESC"

# Approve a user (set status to beta)
wrangler d1 execute route-assistant-db --command "UPDATE users SET status='beta' WHERE rwgps_user_id=12345"

# Grant admin role
wrangler d1 execute route-assistant-db --command "UPDATE users SET role='admin' WHERE rwgps_user_id=12345"

# Manually verify email
wrangler d1 execute route-assistant-db --command "UPDATE users SET email_verified=1 WHERE rwgps_user_id=12345"
```

Add `--remote` to run against the production D1 database.

### User Statuses

- **`waitlist`**: User signed up but awaiting approval
- **`beta`**: Beta tester with full access
- **`active`**: Regular active user (for future use)
- **`inactive`**: Account disabled

## Documentation

- **`docs/`**: Technical documentation for developers
- **`.github/copilot-instructions.md`**: Complete architecture and development guidelines

## Contributing

This project follows feature-based component architecture with modular POI providers. See the technical documentation for detailed development guidelines and coding standards.
