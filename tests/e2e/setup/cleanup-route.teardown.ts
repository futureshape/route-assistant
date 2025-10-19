import { test as teardown, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route Cleanup Teardown for E2E Tests
 * 
 * This teardown file runs after all tests complete (successful or failed)
 * and deletes the test route from RideWithGPS to avoid accumulation of test routes.
 */

const routeIdFile = path.join(__dirname, '..', '.auth', 'test-route-id.txt');
const routeNameFile = path.join(__dirname, '..', '.auth', 'test-route-name.txt');

teardown('delete test route', async ({ request }) => {
  // Check if route ID file exists
  if (!fs.existsSync(routeIdFile)) {
    console.log('⚠ No route ID file found, skipping cleanup');
    return;
  }

  // Read the route ID
  const routeId = fs.readFileSync(routeIdFile, 'utf-8').trim();
  if (!routeId) {
    console.log('⚠ Route ID file is empty, skipping cleanup');
    return;
  }

  console.log(`Cleaning up test route with ID: ${routeId}`);

  // Get the test OAuth token from environment
  const oauthToken = process.env.TEST_OAUTH_TOKEN;
  if (!oauthToken) {
    console.log('⚠ TEST_OAUTH_TOKEN not set, skipping cleanup');
    return;
  }

  try {
    // DELETE the route from RideWithGPS API
    const response = await request.delete(`https://ridewithgps.com/routes/${routeId}.json`, {
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
      },
    });

    if (response.ok()) {
      console.log(`✓ Test route deleted successfully (ID: ${routeId})`);
      
      // Clean up the saved files
      if (fs.existsSync(routeIdFile)) {
        fs.unlinkSync(routeIdFile);
      }
      if (fs.existsSync(routeNameFile)) {
        fs.unlinkSync(routeNameFile);
      }
      console.log(`✓ Cleanup files removed`);
    } else {
      const responseText = await response.text();
      console.log(`⚠ Failed to delete test route (status ${response.status()}): ${responseText}`);
    }
  } catch (error) {
    console.log(`⚠ Error during route cleanup: ${error}`);
  }
});
