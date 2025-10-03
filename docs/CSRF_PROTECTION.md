# CSRF Protection Implementation

## Overview
Cross-Site Request Forgery (CSRF) protection has been implemented to prevent malicious websites from making unauthorized requests to the Route Assistant API on behalf of authenticated users.

## Implementation Details

### Backend (server.js)
- **Package**: Uses `csrf-csrf` (modern replacement for deprecated `csurf`)
- **Configuration**: Double-submit cookie pattern with signed tokens
- **Session Integration**: Uses Express session IDs for token binding
- **Cookie Settings**: 
  - Development: `x-csrf-token` (HTTP allowed)
  - Production: `__Host-psifi.x-csrf-token` (HTTPS only, secure)
- **Protected Methods**: All POST, PUT, PATCH, DELETE requests
- **Token Endpoint**: `GET /api/csrf-token` provides fresh tokens
- **Dependencies**: Requires `cookie-parser` and `express-session` middleware

### Protected Endpoints
All state-changing endpoints now require CSRF tokens:
- `PATCH /api/route/:id/pois` - Route POI management
- `POST /api/user/email` - User email updates  
- `PATCH /api/admin/users/:rwgpsUserId` - Admin user management
- `POST /api/logout` - User logout
- `POST /api/poi-search/*` - All POI search endpoints
- `POST /api/poi-from-place-id` - Place ID to POI conversion

### Frontend (src/lib/csrf.ts)
- **Utility Functions**: Automatic token fetching and header injection
- **Auto-retry**: Handles token expiration with automatic refresh
- **fetchWithCSRFRetry**: Drop-in replacement for fetch() with CSRF support
- **Error Handling**: Graceful fallback if CSRF token unavailable

### Updated Components
All components making state-changing requests now use CSRF-protected fetch:
- `App.tsx` - Logout and POI management
- `AuthHeader.tsx` - Logout functionality  
- `EmailCollectionDialog.tsx` - Email submission
- POI Providers - All search and conversion requests

## Security Benefits
1. **CSRF Attack Prevention**: Malicious sites cannot forge requests
2. **Token Validation**: Server validates both cookie and header tokens
3. **Automatic Refresh**: Expired tokens are automatically renewed
4. **Secure Cookies**: Production uses `__Host-` prefix for enhanced security

## Development vs Production
- **Development**: Uses HTTP-compatible cookies for local testing
- **Production**: Enforces HTTPS-only cookies with `__Host-` prefix
- **Environment Variables**: 
  - `CSRF_SECRET` (optional, falls back to `SESSION_SECRET`)
  - `NODE_ENV=production` enables secure cookie settings

## Usage
Frontend developers should use `fetchWithCSRFRetry()` for all state-changing requests:

```typescript
import { fetchWithCSRFRetry } from '@/lib/csrf';

// Automatically includes CSRF token for POST/PUT/PATCH/DELETE
const response = await fetchWithCSRFRetry('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## Error Handling
- **403 Forbidden**: May indicate invalid CSRF token, automatically retried
- **Token Fetch Failure**: Logged but request continues (server handles rejection)
- **Network Issues**: Standard fetch error handling applies