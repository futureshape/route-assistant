import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can authenticate and see their name', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });
    const userName = await page.getByTestId('user-name').textContent();
    expect(userName).toBeTruthy();
    expect(userName?.trim().length).toBeGreaterThan(0);
    console.log(`✓ Successfully authenticated as: ${userName}`);
  });

  test('routes are fetched from API after authentication', async ({ page }) => {
    const apiRequests: string[] = [];
    
    // Set up listener BEFORE navigation to catch all requests
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });
    
    // Wait for route selector to be ready (routes loaded)
    await page.waitForSelector('[data-testid="route-selector-button"]:not([disabled])', { timeout: 10000 });

    const sessionCalls = apiRequests.filter(r => r.includes('/api/session'));
    expect(sessionCalls.length).toBeGreaterThan(0);
    console.log(`✓ /api/session called: ${sessionCalls[0]}`);

    const routesCalls = apiRequests.filter(r => r.includes('/api/routes'));
    expect(routesCalls.length).toBeGreaterThan(0);
    console.log(`✓ /api/routes called: ${routesCalls[0]}`);
    
    // Routes API should return 200 (success)
    expect(routesCalls[0]).toContain('200');

    console.log(`✓ All authentication and route fetching working correctly`);
  });

  test('route selector combobox can open and contains a [TEST] route', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });
    
    // Close the intro dialog if it appears
    const introDialog = page.getByRole('dialog');
    if (await introDialog.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'OK' }).click();
      await introDialog.waitFor({ state: 'hidden', timeout: 2000 });
      console.log(`✓ Closed intro dialog`);
    }
    
    // Wait for routes to load (loading spinner should disappear)
    await page.waitForSelector('[data-testid="route-selector-button"]:not([disabled])', { timeout: 10000 });
    const loadingSpinner = page.getByTestId('route-selector-loading');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
    console.log(`✓ Routes loaded successfully`);

    // Click the route selector button to open the combobox
    await page.getByTestId('route-selector-button').click();
    console.log(`✓ Route selector combobox opened`);

    // Wait for the popover to be visible
    await page.waitForSelector('[data-testid="route-selector-popover"]', { timeout: 5000 });
    console.log(`✓ Route selector popover is visible`);

    // Find all route options and check for [TEST] in the name
    const routeOptions = await page.locator('[data-testid^="route-option-"]').all();
    console.log(`✓ Found ${routeOptions.length} route options`);
    expect(routeOptions.length).toBeGreaterThan(0);

    // Check if any route contains [TEST] in its name
    let foundTestRoute = false;
    let testRouteName = '';
    for (const option of routeOptions) {
      const routeName = await option.getAttribute('data-route-name');
      if (routeName && routeName.includes('[TEST]')) {
        foundTestRoute = true;
        testRouteName = routeName;
        break;
      }
    }

    expect(foundTestRoute).toBe(true);
    console.log(`✓ Found route with [TEST] in name: ${testRouteName}`);
  });
});
