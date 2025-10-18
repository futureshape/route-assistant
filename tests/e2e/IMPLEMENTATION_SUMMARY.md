# E2E Testing Implementation Summary

This document summarizes the E2E testing implementation for Route Assistant.

## What Was Implemented

### 1. Test Infrastructure
- **Playwright** installed and configured for E2E testing
- Test directory structure: `tests/e2e/`
- Configuration file: `playwright.config.ts`
- Support for Chromium browser (Firefox and WebKit commented out but available)

### 2. Authentication Strategy
**Real OAuth Token Approach**:
- Tests use a real RideWithGPS OAuth token from a test account
- Backend middleware (`TEST_MODE`) intercepts requests with Authorization header
- Server fetches real user data from RideWithGPS API using the token
- User is created/fetched in local database
- Session is established with real user credentials
- All API calls work normally with actual RideWithGPS data

**Why This Approach**:
- ✅ Tests with real data (actual routes, POIs, user info)
- ✅ No need to mock RideWithGPS API responses
- ✅ Catches real API integration issues
- ✅ Simple to set up - just need one valid token
- ✅ Tests run against production-like conditions

### 3. Files Created/Modified

#### New Files:
- `playwright.config.ts` - Playwright configuration
- `tests/e2e/setup/auth.setup.ts` - Authentication setup (runs before tests)
- `tests/e2e/route-selection.spec.ts` - Basic route selection tests
- `tests/e2e/README.md` - Test documentation
- `tests/e2e/GETTING_OAUTH_TOKEN.md` - Guide for obtaining OAuth token
- `.env.test` - Test environment configuration template

#### Modified Files:
- `server.js` - Added TEST_MODE middleware for auth bypass
- `.env.example` - Added TEST_MODE and TEST_OAUTH_TOKEN variables
- `.gitignore` - Added test artifacts directories
- `package.json` - Added test scripts (test:e2e, test:e2e:ui, etc.)

### 4. Test Scripts

```bash
npm run test:e2e          # Run all tests (headless)
npm run test:e2e:ui       # Run with Playwright UI (interactive)
npm run test:e2e:headed   # Run with visible browser
npm run test:e2e:debug    # Run in debug mode
```

### 5. Tests Implemented

**Basic Authentication Test Suite** (`authentication.spec.ts`):
1. **User can authenticate and see their name**
   - Navigates to the application
   - Waits for user name to appear (via `data-testid="user-name"`)
   - Verifies the name is not empty
   - Logs authenticated user name

**Future Tests** (not yet implemented):
- Route selection and loading
- POI search and addition
- Elevation chart interactions
- Error handling scenarios

## How It Works

### Authentication Flow

```
1. Test starts → Playwright config sets TEST_MODE=true
2. Auth setup runs → Sets Authorization header with real token
3. Request hits backend → TEST_MODE middleware intercepts
4. Server validates token → Matches TEST_OAUTH_TOKEN env var
5. Server fetches user → Calls RideWithGPS API /user.json
6. User added to DB → Creates/updates user in local database
7. Session created → req.session populated with real data
8. Tests run normally → All API calls work with real token
```

### Test Execution Flow

```
1. Setup Project → Runs auth.setup.ts once
   - Validates TEST_OAUTH_TOKEN is set
   - Sets Authorization header
   - Navigates to app
   - Waits for authentication
   - Saves auth state to .auth/user.json

2. Test Projects → Each test reuses saved auth state
   - Chromium tests run with authenticated session
   - No re-authentication needed per test
   - Fast parallel execution
```

## Setup Requirements

### For Developers

1. **Get OAuth Token**:
   - Sign in to app locally
   - Extract token from browser/session (see GETTING_OAUTH_TOKEN.md)
   
2. **Configure Environment**:
   ```bash
   # Add to .env
   TEST_MODE=true
   TEST_OAUTH_TOKEN=your-real-token-here
   ```

3. **Run Tests**:
   ```bash
   npm run test:e2e
   ```

### For CI/CD

1. **GitHub Secrets**:
   - Add `TEST_OAUTH_TOKEN` as repository secret
   - Token should be from dedicated test account
   
2. **Workflow** (future):
   ```yaml
   - name: Run E2E Tests
     env:
       TEST_MODE: true
       TEST_OAUTH_TOKEN: ${{ secrets.TEST_OAUTH_TOKEN }}
     run: npm run test:e2e
   ```

## Current Test Coverage

### ✅ Implemented
- Authentication flow with real OAuth token
- User name display verification
- Test ID-based element selection

### 🚧 Not Yet Implemented  
- Route selection and loading
- POI search and addition
- POI markers on map
- Route switching with unsaved changes
- Sending POIs to RideWithGPS
- Elevation chart interactions
- Error handling scenarios
- Mobile viewport tests
- Firefox/WebKit browser tests

## Known Limitations

1. **Token Expiration**: OAuth tokens expire after ~60 days. Need to refresh periodically.
2. **Test Data Dependency**: Tests depend on the test account having at least one route.
3. **API Rate Limits**: Using real API means tests count toward rate limits.
4. **Google Maps API**: Tests require valid GOOGLE_MAPS_API_KEY for map features.
5. **Single Browser**: Currently only configured for Chromium.

## Future Enhancements

### Short Term
- Add POI search and addition tests
- Test error scenarios (no routes, API failures)
- Add visual regression testing
- Test mobile viewports

### Medium Term
- Mock external services (Google Maps, RideWithGPS) for faster tests
- Add CI/CD integration
- Enable Firefox and WebKit browsers
- Add performance monitoring

### Long Term
- Generate test reports
- Add accessibility testing
- Create test data fixtures
- Implement test database seeding
- Add screenshot comparisons

## Maintenance Notes

### When OAuth Token Expires
1. Sign in to app with test account
2. Extract new token (see GETTING_OAUTH_TOKEN.md)
3. Update .env: `TEST_OAUTH_TOKEN=new-token`
4. Update CI/CD secret if applicable

### Adding New Tests
1. Create `.spec.ts` file in `tests/e2e/`
2. Import test framework: `import { test, expect } from '@playwright/test'`
3. Set auth header: `test.use({ extraHTTPHeaders: { 'Authorization': ... } })`
4. Write tests using Playwright selectors
5. Run with `npm run test:e2e` or `npm run test:e2e:ui`

### Debugging Failed Tests
1. Run with UI: `npm run test:e2e:ui`
2. Check screenshots: `test-results/*/test-failed-*.png`
3. Watch videos: `test-results/*/video.webm`
4. Read error context: `test-results/*/error-context.md`
5. Use debug mode: `npm run test:e2e:debug`

## Documentation

- `tests/e2e/README.md` - Main test documentation
- `tests/e2e/GETTING_OAUTH_TOKEN.md` - OAuth token guide
- `playwright.config.ts` - Configuration reference
- This file - Implementation overview

## Branch Info

- **Branch**: `feature/e2e-testing`
- **Status**: ✅ Basic implementation complete
- **Next Steps**: Get real OAuth token and verify tests pass
