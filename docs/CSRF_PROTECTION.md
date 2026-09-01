# CSRF Protection Implementation

## Overview
Cross-Site Request Forgery (CSRF) protection prevents malicious websites from making unauthorized requests to the Route Assistant API on behalf of authenticated users.

## Implementation Details

### Backend (Worker — `src/worker/middleware/csrf.ts`)
- **Pattern**: Synchronizer token stored in the KV session
- **Validation**: Token in `X-CSRF-Token` request header compared against session token
- **Protected Methods**: All POST, PUT, PATCH, DELETE requests to `/api/*` and `/auth/*`
- **Token Endpoint**: `GET /api/csrf-token` returns the session token (generates one if absent)
- **Dependencies**: Requires the session middleware to run first (token stored in session)

### Session Integration
The CSRF token is stored as `session.csrfToken` in the KV-backed session. It is generated lazily on the first call to `GET /api/csrf-token` and persists for the lifetime of the session.

### Protected Endpoints
All state-changing endpoints require a valid CSRF token:
- `PATCH /api/route/:id/pois`
- `POST /api/user/email`
- `POST /api/logout`
- `POST /api/resend-verification`
- `POST /api/poi-search/*`
- `POST /api/poi-from-place-id`
- `PATCH /api/admin/users/:rwgpsUserId`

### Frontend (`src/lib/csrf.ts`)
Unchanged from previous implementation:
- **`fetchWithCSRFRetry`**: Drop-in fetch replacement with automatic token injection and retry
- **`X-CSRF-Token`** header is sent with all state-changing requests
- Clears cached token on 403 and retries once with a fresh token

## Security Notes

- The token is tied to the user's KV session, not to any cookie (double-submit pattern is not used)
- Token does not rotate per-request (stable for the session lifetime)
- Session cookie is `HttpOnly; Secure; SameSite=Lax` — not accessible to JavaScript
- Cloudflare handles TLS termination; all traffic in production is HTTPS

## Usage

Frontend developers should use `fetchWithCSRFRetry()` for all state-changing requests:

```typescript
import { fetchWithCSRFRetry } from '@/lib/csrf';

const response = await fetchWithCSRFRetry('/api/route/123/pois', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pois }),
});
```


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