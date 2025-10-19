import { test as setup } from '@playwright/test';

/**
 * Authentication Setup for E2E Tests
 * 
 * This setup file runs before all tests and simulates OAuth authentication
 * by navigating to the /auth/test endpoint (only available in TEST_MODE).
 * This creates a real session just like normal OAuth would.
 */

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to test auth endpoint which simulates OAuth callback
  await page.goto('/auth/test');

  // Wait for redirect to home page and authentication to complete
  await page.waitForSelector('text=Your Routes', { timeout: 10000 });

  console.log('✓ Test authentication completed successfully');

  // Save the authenticated state (session cookies)
  await page.context().storageState({ path: authFile });
});
