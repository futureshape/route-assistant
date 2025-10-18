import { test as setup } from '@playwright/test';

/**
 * Authentication Setup for E2E Tests
 * 
 * This setup file runs before all tests and configures authentication
 * using the TEST_MODE backend bypass. The token is sent via Authorization header.
 */

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page, context }) => {
  // Get real OAuth token from environment
  const testToken = process.env.TEST_OAUTH_TOKEN;
  
  if (!testToken) {
    throw new Error('TEST_OAUTH_TOKEN environment variable is required for E2E tests. Please set it to a real RideWithGPS OAuth token.');
  }
  
  // Set Authorization header for all requests
  await context.setExtraHTTPHeaders({
    'Authorization': `Bearer ${testToken}`,
  });

  // Navigate to the application
  await page.goto('/');

  // Wait for the authenticated user to appear (check for route selector which appears when logged in)
  await page.waitForSelector('text=Your Routes', { timeout: 10000 });

  // Save the authenticated state (including cookies)
  await page.context().storageState({ path: authFile });
});
