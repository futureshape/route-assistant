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
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });
    await page.waitForTimeout(3000);

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
});
