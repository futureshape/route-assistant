import { test, expect } from '@playwright/test';

// Configure test to use authentication with real OAuth token
test.use({
  extraHTTPHeaders: {
    'Authorization': `Bearer ${process.env.TEST_OAUTH_TOKEN || ''}`,
  },
});

test.describe('Authentication', () => {
  test('user can authenticate and see their name', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for authentication to complete
    await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });

    // Get the user name
    const userName = await page.getByTestId('user-name').textContent();

    // Verify the user name is not empty
    expect(userName).toBeTruthy();
    expect(userName?.trim().length).toBeGreaterThan(0);

    console.log(`✓ Successfully authenticated as: ${userName}`);
  });
});
