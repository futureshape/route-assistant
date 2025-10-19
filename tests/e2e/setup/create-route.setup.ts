import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route Creation Setup for E2E Tests
 * 
 * This setup file runs before all tests and creates a unique test route
 * in RideWithGPS by POSTing to https://ridewithgps.com/routes.json
 * with the test OAuth token.
 * 
 * The route name is made unique by appending a timestamp to prevent conflicts.
 */

const testRouteFile = path.join(__dirname, '..', 'test-route.json');
const routeNameFile = path.join(__dirname, '..', '.auth', 'test-route-name.txt');
const routeIdFile = path.join(__dirname, '..', '.auth', 'test-route-id.txt');

setup('create unique test route', async ({ request }) => {
  // Read the test route JSON file
  const testRouteData = JSON.parse(fs.readFileSync(testRouteFile, 'utf-8'));

  // Create a unique route name with timestamp
  const timestamp = Date.now();
  const uniqueRouteName = `[E2E-TEST-${timestamp}] Sample Route`;
  
  console.log(`Creating test route: ${uniqueRouteName}`);
  
  // Modify the route name in the JSON payload
  testRouteData.route.name = uniqueRouteName;

  // Get the test OAuth token from environment
  const oauthToken = process.env.TEST_OAUTH_TOKEN;
  if (!oauthToken) {
    throw new Error('TEST_OAUTH_TOKEN environment variable is not set');
  }

  // POST the route to RideWithGPS API
  const response = await request.post('https://ridewithgps.com/routes.json', {
    headers: {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json',
    },
    data: testRouteData,
  });

  // Check that the request succeeded
  expect(response.ok()).toBeTruthy();
  const responseData = await response.json();
  
  const routeId = responseData.route?.id;
  expect(routeId).toBeDefined();
  
  console.log(`✓ Test route created successfully with ID: ${routeId}`);
  console.log(`✓ Route name: ${uniqueRouteName}`);

  // Save the unique route name to a file so tests can use it
  const authDir = path.dirname(routeNameFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(routeNameFile, uniqueRouteName, 'utf-8');
  fs.writeFileSync(routeIdFile, routeId.toString(), 'utf-8');
  
  console.log(`✓ Route name saved to: ${routeNameFile}`);
  console.log(`✓ Route ID saved to: ${routeIdFile}`);
});
