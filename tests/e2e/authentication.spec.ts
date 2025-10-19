import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Authentication and Route Management', () => {
  let sharedPage: Page;
  let testRouteName = '';

  test.beforeAll(async ({ browser }) => {
    // Create a single page context that will be shared across all tests
    const context = await browser.newContext({ storageState: 'tests/e2e/.auth/user.json' });
    sharedPage = await context.newPage();

    // Read the unique test route name created by the setup
    const routeNameFile = path.join(__dirname, '.auth', 'test-route-name.txt');
    if (fs.existsSync(routeNameFile)) {
      testRouteName = fs.readFileSync(routeNameFile, 'utf-8').trim();
      console.log(`Using test route: ${testRouteName}`);
    } else {
      throw new Error('Test route name file not found. Route creation setup may have failed.');
    }
  });

  test.afterAll(async () => {
    await sharedPage?.close();
  });

  test('user can authenticate and routes are fetched', async () => {
    const apiRequests: string[] = [];
    
    // Set up listener BEFORE navigation to catch all requests
    sharedPage.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await sharedPage.goto('/');
    await sharedPage.waitForSelector('[data-testid="user-name"]', { timeout: 10000 });
    const userName = await sharedPage.getByTestId('user-name').textContent();
    expect(userName).toBeTruthy();
    expect(userName?.trim().length).toBeGreaterThan(0);
    console.log(`✓ Successfully authenticated as: ${userName}`);
    
    // Close the intro dialog if it appears (do this once for all subsequent tests)
    const introDialog = sharedPage.getByRole('dialog');
    if (await introDialog.isVisible().catch(() => false)) {
      await sharedPage.getByRole('button', { name: 'OK' }).click();
      await introDialog.waitFor({ state: 'hidden', timeout: 2000 });
      console.log(`✓ Closed intro dialog`);
    }

    // Wait for route selector to be ready (routes loaded)
    await sharedPage.waitForSelector('[data-testid="route-selector-button"]:not([disabled])', { timeout: 10000 });
    const loadingSpinner = sharedPage.getByTestId('route-selector-loading');
    if (await loadingSpinner.isVisible().catch(() => false)) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Verify API calls
    const sessionCalls = apiRequests.filter(r => r.includes('/api/session'));
    expect(sessionCalls.length).toBeGreaterThan(0);
    console.log(`✓ /api/session called: ${sessionCalls[0]}`);

    const routesCalls = apiRequests.filter(r => r.includes('/api/routes'));
    expect(routesCalls.length).toBeGreaterThan(0);
    console.log(`✓ /api/routes called: ${routesCalls[0]}`);
    
    // Routes API should return 200 (success)
    expect(routesCalls[0]).toContain('200');

    console.log(`✓ Routes loaded successfully`);
  });

  test('route selector combobox can open and contains a [TEST] route', async () => {
    // Routes are already loaded from previous test
    // Click the route selector button to open the combobox
    await sharedPage.getByTestId('route-selector-button').click();
    console.log(`✓ Route selector combobox opened`);

    // Wait for the popover to be visible
    await sharedPage.waitForSelector('[data-testid="route-selector-popover"]', { timeout: 5000 });
    console.log(`✓ Route selector popover is visible`);

    // Find all route options and check for our unique test route
    const routeOptions = await sharedPage.locator('[data-testid^="route-option-"]').all();
    console.log(`✓ Found ${routeOptions.length} route options`);
    expect(routeOptions.length).toBeGreaterThan(0);

    // Check if our unique test route exists
    let foundTestRoute = false;
    for (const option of routeOptions) {
      const routeName = await option.getAttribute('data-route-name');
      if (routeName === testRouteName) {
        foundTestRoute = true;
        break;
      }
    }

    expect(foundTestRoute).toBe(true);
    console.log(`✓ Found test route: ${testRouteName}`);
    
    // Close the popover (click outside or press Escape)
    await sharedPage.keyboard.press('Escape');
    await sharedPage.waitForSelector('[data-testid="route-selector-popover"]', { state: 'hidden', timeout: 2000 });
    console.log(`✓ Closed route selector`);
  });

  test('selecting a [TEST] route shows the route line on the map', async () => {
    // Map overlay should be visible initially (no route selected)
    const mapOverlay = sharedPage.getByTestId('map-overlay');
    await expect(mapOverlay).toBeVisible();
    console.log(`✓ Map overlay visible (no route selected)`);

    // Open the route selector (routes already loaded)
    await sharedPage.getByTestId('route-selector-button').click();
    await sharedPage.waitForSelector('[data-testid="route-selector-popover"]', { timeout: 5000 });
    console.log(`✓ Route selector opened`);

    // Find and click our unique test route
    const routeOptions = await sharedPage.locator('[data-testid^="route-option-"]').all();
    let testRouteFound = false;
    
    for (const option of routeOptions) {
      const routeName = await option.getAttribute('data-route-name');
      if (routeName === testRouteName) {
        await option.click();
        testRouteFound = true;
        console.log(`✓ Selected route: ${routeName}`);
        break;
      }
    }
    
    expect(testRouteFound).toBe(true);

    // Wait for the route to load (overlay should disappear)
    await mapOverlay.waitFor({ state: 'hidden', timeout: 10000 });
    console.log(`✓ Map overlay hidden (route loaded)`);

    // Verify that the route data is loaded on the map
    const mapContainer = sharedPage.getByTestId('map-container');
    await expect(mapContainer).toHaveAttribute('data-route-loaded', 'true');
    console.log(`✓ Route data loaded on map`);
    
    // Get the number of route points loaded
    const routePoints = await mapContainer.getAttribute('data-route-points');
    const pointCount = parseInt(routePoints || '0');
    expect(pointCount).toBeGreaterThan(0);
    console.log(`✓ Route polyline rendered with ${pointCount} points`);

    // Verify the route name is shown in the selector button
    const selectorButton = sharedPage.getByTestId('route-selector-button');
    const buttonText = await selectorButton.textContent();
    expect(buttonText).toContain(testRouteName);
    console.log(`✓ Selected route name displayed in selector`);
  });

  test('searching for POIs returns results from Google', async () => {
    // Route is already loaded from previous test
    // Open the Google Maps POI provider accordion
    const googleProviderTrigger = sharedPage.getByTestId('poi-provider-trigger-google');
    await googleProviderTrigger.click();
    await sharedPage.waitForSelector('[data-testid="poi-provider-content-google"]', { timeout: 5000 });
    console.log(`✓ Opened Google Maps POI provider`);

    // Get initial POI count
    const mapContainer = sharedPage.getByTestId('map-container');
    const initialPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    console.log(`✓ Initial POI count: ${initialPoiCount}`);

    // Enter search query
    const searchInput = sharedPage.getByTestId('google-poi-search-input');
    await searchInput.fill('coffee');
    console.log(`✓ Entered search query: coffee`);

    // Click search button
    const searchButton = sharedPage.getByTestId('google-poi-search-button');
    await searchButton.click();
    console.log(`✓ Clicked search button`);

    // Wait for search to complete (button should not be in loading state)
    await sharedPage.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="google-poi-search-button"]');
        return btn && !btn.textContent?.includes('Searching');
      },
      { timeout: 15000 }
    );
    console.log(`✓ Search completed`);

    // Verify POIs were added
    const finalPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    expect(finalPoiCount).toBeGreaterThan(initialPoiCount);
    const poisAdded = finalPoiCount - initialPoiCount;
    console.log(`✓ POIs added: ${poisAdded} (total: ${finalPoiCount})`);
    expect(poisAdded).toBeGreaterThan(0);
  });

  test('clearing all suggested POIs removes them from the map', async () => {
    // Get current POI count (should have coffee POIs from previous test)
    const mapContainer = sharedPage.getByTestId('map-container');
    const initialPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    expect(initialPoiCount).toBeGreaterThan(0);
    console.log(`✓ Initial POI count: ${initialPoiCount}`);

    // Find and click the "Clear all suggested POIs" button
    const clearButton = sharedPage.getByTestId('clear-suggested-pois-button');
    await expect(clearButton).toBeEnabled();
    await clearButton.click();
    console.log(`✓ Clicked clear suggested POIs button`);

    // Verify POIs were cleared (should only have existing POIs from the route now)
    const finalPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    expect(finalPoiCount).toBeLessThan(initialPoiCount);
    const poisRemoved = initialPoiCount - finalPoiCount;
    console.log(`✓ POIs removed: ${poisRemoved} (remaining: ${finalPoiCount})`);
    
    // Button should now be disabled (no suggested POIs left)
    await expect(clearButton).toBeDisabled();
    console.log(`✓ Clear button disabled (no suggested POIs)`);
  });

  test('searching OSM for fuel stations and toilets returns results', async () => {
    // OSM provider should already be available (route is loaded)
    // Open the OpenStreetMap POI provider accordion
    const osmProviderTrigger = sharedPage.getByTestId('poi-provider-trigger-osm');
    await osmProviderTrigger.click();
    await sharedPage.waitForSelector('[data-testid="poi-provider-content-osm"]', { timeout: 5000 });
    console.log(`✓ Opened OpenStreetMap POI provider`);

    // Get initial POI count
    const mapContainer = sharedPage.getByTestId('map-container');
    const initialPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    console.log(`✓ Initial POI count: ${initialPoiCount}`);

    // Open the POI types combobox
    await sharedPage.getByTestId('osm-poi-types-button').click();
    await sharedPage.waitForSelector('[data-testid="osm-poi-types-popover"]', { timeout: 5000 });
    console.log(`✓ Opened OSM POI types selector`);

    // Select "Fuel Station" (amenity=fuel)
    const fuelOption = sharedPage.getByTestId('osm-poi-type-amenity=fuel');
    await fuelOption.click();
    console.log(`✓ Selected Fuel Station`);

    // Verify the tag is shown as selected
    await sharedPage.waitForSelector('[data-testid="osm-selected-tag-amenity=fuel"]', { timeout: 2000 });
    console.log(`✓ Fuel Station tag displayed`);

    // Open the combobox again to select Toilets
    await sharedPage.getByTestId('osm-poi-types-button').click();
    await sharedPage.waitForSelector('[data-testid="osm-poi-types-popover"]', { timeout: 5000 });
    console.log(`✓ Reopened OSM POI types selector`);

    // Select "Toilets" (amenity=toilets)
    const toiletsOption = sharedPage.getByTestId('osm-poi-type-amenity=toilets');
    await toiletsOption.click();
    console.log(`✓ Selected Toilets`);

    // Verify the tag is shown as selected
    await sharedPage.waitForSelector('[data-testid="osm-selected-tag-amenity=toilets"]', { timeout: 2000 });
    console.log(`✓ Toilets tag displayed`);

    // Click search button
    const searchButton = sharedPage.getByTestId('osm-poi-search-button');
    await expect(searchButton).toBeEnabled();
    await searchButton.click();
    console.log(`✓ Clicked search button`);

    // Wait for search to complete (button should not be in loading state)
    await sharedPage.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="osm-poi-search-button"]');
        return btn && !btn.textContent?.includes('Searching');
      },
      { timeout: 15000 }
    );
    console.log(`✓ Search completed`);

    // Verify POIs were added
    const finalPoiCount = parseInt(await mapContainer.getAttribute('data-poi-count') || '0');
    expect(finalPoiCount).toBeGreaterThan(initialPoiCount);
    const poisAdded = finalPoiCount - initialPoiCount;
    console.log(`✓ POIs added: ${poisAdded} (total: ${finalPoiCount})`);
    expect(poisAdded).toBeGreaterThan(0);
  });

  test('clicking a random marker and changing its name to a unique test ID', async () => {
    // Get all markers via test helper
    const markers = await sharedPage.evaluate(() => {
      return (window as any).__testGetMarkers();
    });
    
    console.log(`✓ Found ${markers.length} total markers on map`);
    expect(markers.length).toBeGreaterThan(0);

    // Filter to only suggested markers (those we can edit)
    const suggestedMarkers = markers.filter((m: any) => m.state === 'suggested');
    console.log(`✓ Found ${suggestedMarkers.length} suggested markers`);
    expect(suggestedMarkers.length).toBeGreaterThan(0);

    // Pick a random suggested marker
    const randomIndex = Math.floor(Math.random() * suggestedMarkers.length);
    const selectedMarker = suggestedMarkers[randomIndex];
    console.log(`✓ Selected random marker #${randomIndex}: ${selectedMarker.name}`);

    // Click the marker programmatically
    const clicked = await sharedPage.evaluate((markerKey: string) => {
      return (window as any).__testClickMarkerByKey(markerKey);
    }, selectedMarker.key);
    
    expect(clicked).toBe(true);
    console.log(`✓ Clicked marker programmatically`);

    // Wait for info window to appear
    const infoWindow = sharedPage.getByTestId('poi-info-window');
    await expect(infoWindow).toBeVisible({ timeout: 5000 });
    
    // Verify we're looking at the right marker
    const infoWindowPoiKey = await infoWindow.getAttribute('data-poi-key');
    expect(infoWindowPoiKey).toBe(selectedMarker.key);
    console.log(`✓ Info window opened for correct marker`);

    // Generate a unique test ID
    const uniqueTestId = `TEST-POI-${Date.now()}`;
    console.log(`✓ Generated unique test ID: ${uniqueTestId}`);

    // Change the POI name to the unique test ID
    const nameInput = sharedPage.getByTestId('poi-name-input');
    await expect(nameInput).toBeVisible();
    await nameInput.clear();
    await nameInput.fill(uniqueTestId);
    console.log(`✓ Changed POI name to: ${uniqueTestId}`);

    // Verify the name was updated in the input
    await expect(nameInput).toHaveValue(uniqueTestId);

    // Click Keep to select this POI
    await sharedPage.getByTestId('poi-keep-button').click();
    console.log(`✓ Clicked Keep button to select POI`);

    // Close the info window
    await sharedPage.keyboard.press('Escape');
    await expect(infoWindow).not.toBeVisible();
    console.log(`✓ Closed info window`);

    // Verify the marker is now in selected state
    const mapContainer = sharedPage.getByTestId('map-container');
    const selectedCount = await mapContainer.getAttribute('data-selected-count');
    expect(parseInt(selectedCount || '0')).toBeGreaterThan(0);
    console.log(`✓ Selected POI count: ${selectedCount}`);

    // Store the test ID for potential future tests
    testRouteName = uniqueTestId; // Reuse existing variable to store test ID
    console.log(`✓ Test completed: POI renamed and selected`);
  });
});

