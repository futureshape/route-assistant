# E2E Testing

This directory contains end-to-end tests for the Route Assistant application using Playwright.

## Setup

1. Install dependencies (already done if you ran `npm install`):
   ```bash
   npm install
   ```

2. **Get a real RideWithGPS OAuth token**:
   - Sign in to the Route Assistant app normally (http://localhost:3001)
   - After authentication, check your session/cookies for the `access_token`
   - Alternatively, check the browser's developer tools → Application → Cookies
   - Copy the access token value

3. Set up your `.env.test` file with the test token:
   ```bash
   # Edit .env.test and add your token:
   TEST_OAUTH_TOKEN=<paste-your-real-oauth-token-here>
   ```
   
   **Important**: This must be a **real, valid OAuth token** from RideWithGPS. The tests will use this token to:
   - Authenticate as a real user
   - Fetch real routes from your RideWithGPS account
   - Make actual API calls (within test limits)

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Test Structure

```
tests/e2e/
├── setup/
│   └── auth.setup.ts         # Authentication setup (runs before all tests)
└── authentication.spec.ts    # Basic authentication test
```

## Authentication

Tests use a bypass authentication mechanism enabled by `TEST_MODE=true`. Instead of going through the OAuth flow, tests provide a **real RideWithGPS OAuth token** via the Authorization header.

### How it works:

1. **Real Token**: You provide a valid OAuth token from your RideWithGPS account in `TEST_OAUTH_TOKEN`
2. **Backend Bypass**: When `TEST_MODE=true`, the server checks for `Authorization: Bearer <token>` header
3. **User Fetch**: Server uses the token to fetch real user data from RideWithGPS API
4. **Session Creation**: Creates a real session with your actual user data
5. **Real API Calls**: All subsequent requests use the real token to fetch actual routes and data
6. **State Persistence**: Playwright saves the authenticated state and reuses it across tests

### Getting Your OAuth Token:

1. Start the app: `npm run dev`
2. Sign in with RideWithGPS normally
3. Open browser DevTools → Application → Cookies (or Storage)
4. Find the session cookie and extract the access_token
5. Add to `.env`: `TEST_OAUTH_TOKEN=<your-token>`

**Note**: OAuth tokens may expire. If tests start failing with auth errors, you may need to refresh your token.

## Writing Tests

All tests should:
- Be in `*.spec.ts` files in this directory
- Use `test.use()` to set the Authorization header (see `authentication.spec.ts` for example)
- Include descriptive test names
- Use proper assertions with meaningful error messages
- Use `data-testid` attributes for unambiguous element selection
- Clean up any state they modify

Example:
```typescript
import { test, expect } from '@playwright/test';

test.use({
  extraHTTPHeaders: {
    'Authorization': `Bearer ${process.env.TEST_OAUTH_TOKEN || ''}`,
  },
});

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('my-element')).toBeVisible();
  });
});
```

### Using Test IDs

For reliable element selection, prefer `data-testid` attributes:

```tsx
// In your component:
<div data-testid="user-name">{user.name}</div>

// In your test:
await page.getByTestId('user-name')
```

## CI/CD Integration

Tests are configured to run in GitHub Actions (see `playwright.config.ts`):
- Retry failed tests twice on CI
- Generate HTML reports
- Use GitHub reporter for integration
- Run serially (workers: 1) to avoid conflicts

## Troubleshooting

### Tests fail with "Test User not found"
- Ensure `TEST_MODE=true` is set in your environment
- Verify you're using a **real OAuth token** in `TEST_OAUTH_TOKEN`
- Check that the token hasn't expired (tokens typically last 60 days)
- Verify the token works by testing in the app manually

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check that the dev server starts successfully
- Ensure Google Maps API key is valid (if testing map features)

### Authentication issues
- Delete `tests/e2e/.auth/user.json` to regenerate auth state
- Get a fresh OAuth token from the app
- Check server logs for test authentication bypass messages
- Verify Authorization header is being sent (check Network tab in debug mode)

### "No routes found"
- Ensure the RideWithGPS account has at least one route
- Check that the OAuth token has `read` scope
- Verify the account isn't rate-limited by RideWithGPS API
