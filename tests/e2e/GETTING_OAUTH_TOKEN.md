# How to Get Your RideWithGPS OAuth Token for E2E Tests

The E2E tests require a real RideWithGPS OAuth token to authenticate and test with actual data.

## Steps to Get Your Token

### Method 1: From Browser DevTools (Recommended)

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Sign in with RideWithGPS**:
   - Navigate to http://localhost:3001
   - Click "Sign in with RideWithGPS"
   - Complete the OAuth flow

3. **Open Browser DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Go to the **Console** tab

4. **Get the token from the session**:
   ```javascript
   // In the browser console, run:
   fetch('/api/session')
     .then(r => r.json())
     .then(data => console.log('Your OAuth token:', data.user ? 'Token is in session' : 'Not authenticated'))
   ```

5. **Alternative - Check Network Tab**:
   - Go to DevTools → **Network** tab
   - Refresh the page
   - Find any request to `/api/routes` or similar
   - Look at the request (not response) in the backend logs

6. **Backend Method - Check Server Logs**:
   - After signing in, check your terminal running `npm run dev`
   - The token is used in API requests - you can temporarily log it
   - Add a console.log in `server.js` at line ~352 in the `/api/routes` endpoint:
     ```javascript
     console.log('Access token:', req.session.rwgps.access_token);
     ```
   - Make any API call (like selecting a route)
   - Copy the token from the server logs
   - **Remember to remove the console.log after!**

### Method 2: Direct Database Method

If you have access to the session store:

1. Sign in to the app
2. Check the session cookie value
3. Decode the session (sessions are typically stored as encrypted/signed cookies)

## Add Token to Your Environment

Once you have the token, add it to your `.env.test` file:

```bash
# Edit .env.test (already exists in the project)
TEST_OAUTH_TOKEN=your-actual-token-here
```

**Note**: The `.env.test` file is loaded automatically by Playwright when running tests.

## Verify the Token Works

Test that your token is valid:

```bash
# This should return your user info
curl -H "Authorization: Bearer YOUR_TOKEN" https://ridewithgps.com/api/v1/users/current.json
```

## Token Expiration

- OAuth tokens typically expire after **60 days**
- If your tests start failing with auth errors, get a fresh token
- Consider creating a dedicated test account for E2E tests

## Security Notes

- **Never commit your OAuth token** to version control
- The `.env` file is in `.gitignore` to prevent accidental commits
- Use a test account, not your personal account
- Tokens have read access to your RideWithGPS data

## Troubleshooting

### "Token not found" or "Not authenticated"
- Make sure you completed the OAuth flow
- Verify you're checking the right browser session
- Try signing out and back in to get a fresh token

### "Invalid token" errors in tests
- Token may have expired - get a new one
- Ensure you copied the entire token without spaces
- Verify the token works with the curl command above

### Tests show wrong user
- You may have copied a token from a different account
- Clear the test auth cache: `rm -rf tests/e2e/.auth/`
- Get a fresh token from the correct account
