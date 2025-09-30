require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const polyline = require('@mapbox/polyline');
const qs = require('qs');
const path = require('path');
const { getRideWithGPSTypeId } = require('./poi-type-mapping');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const fs = require('fs');
const clientRoot = __dirname;
const clientDist = path.join(__dirname, 'dist');
let viteServer = null; // in dev, populated with Vite middleware

// Places API FieldMask to request specific fields (do not use env var per user request)
// API reference: https://developers.google.com/maps/documentation/places/web-service/nearby-search
// Include coordinates so the frontend can render markers
// Include editorialSummary for description field
const GOOGLE_PLACES_FIELDMASK = 'places.displayName,places.googleMapsUri,places.location,places.primaryType,places.editorialSummary';

// Strict helper: convert route.track_points -> [[lat,lng],...]
// Per user instruction, do NOT use heuristics. Only consider `route.track_points` if present.
function coordsFromTrackPoints(route){
  const out = [];
  if (!route || !Array.isArray(route.track_points)) return out;
  for (const p of route.track_points){
    // RWGPS track_points use x = longitude, y = latitude
    const lat = p.y;
    const lon = p.x;
    if (lat == null || lon == null) continue;
    const nlat = parseFloat(lat);
    const nlon = parseFloat(lon);
    if (Number.isFinite(nlat) && Number.isFinite(nlon)) out.push([nlat, nlon]);
  }
  return out;
}

function logAxiosError(label, err){
  const resp = err?.response;
  if (resp){
    const status = resp.status;
    const type = resp.headers && resp.headers['content-type'];
    let snippet = '';
    try{
      if (type && type.includes('application/json')) snippet = JSON.stringify(resp.data).slice(0,1000);
      else if (typeof resp.data === 'string') snippet = resp.data.replace(/\s+/g,' ').slice(0,500);
      else snippet = String(resp.data).slice(0,500);
    }catch(e){ snippet = String(resp.data).slice(0,200); }
    console.error(`${label} - status=${status} content-type=${type} snippet=${snippet}`);
  } else {
    console.error(label, err && err.message ? err.message : err);
  }
}

if (!process.env.RWGPS_CLIENT_ID || !process.env.RWGPS_CLIENT_SECRET || !process.env.GOOGLE_API_KEY) {
  console.warn('Missing env vars. See .env.example');
}

// POI Provider Configuration
const ENABLED_POI_PROVIDERS = (process.env.ENABLED_POI_PROVIDERS || 'google').split(',').map(p => p.trim());
console.log('Enabled POI providers:', ENABLED_POI_PROVIDERS);

// In production serve built client; in dev Vite middleware will be attached later
app.use(express.static(clientDist, { index: false }));
// Note: public static files will be served after Vite middleware in dev mode
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

// RideWithGPS OAuth endpoints
app.get('/auth/ridewithgps', (req, res) => {
  const redirectUri = process.env.RWGPS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/ridewithgps/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.RWGPS_CLIENT_ID,
    redirect_uri: redirectUri,
  }).toString();
  res.redirect(`https://ridewithgps.com/oauth/authorize?${params}`);
});

app.get('/auth/ridewithgps/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const redirectUri = process.env.RWGPS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/ridewithgps/callback`;
    // First attempt: client credentials in POST body
    let tokenRes;
    try{
      tokenRes = await axios.post('https://ridewithgps.com/oauth/token', qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.RWGPS_CLIENT_ID,
        client_secret: process.env.RWGPS_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch(e){
      // swallow and try fallback below
      logAxiosError('Token exchange initial attempt failed', e);
    }

    // If no access_token returned, try with HTTP Basic auth (some providers require this)
    if (!tokenRes || !tokenRes.data || !tokenRes.data.access_token){
      try{
        const basic = Buffer.from(`${process.env.RWGPS_CLIENT_ID}:${process.env.RWGPS_CLIENT_SECRET}`).toString('base64');
        tokenRes = await axios.post('https://ridewithgps.com/oauth/token', qs.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${basic}` }
        });
      } catch(e){
        logAxiosError('Token exchange fallback (Basic auth) failed', e);
      }
    }

    if (!tokenRes || !tokenRes.data || !tokenRes.data.access_token){
      console.error('Token exchange did not return access_token; check client_id/secret and redirect URI');
      return res.status(500).send('OAuth token exchange failed: missing access token');
    }

    // Log successful token exchange (with FULL token for debugging)
    const token = tokenRes.data.access_token;
    console.log(`[OAuth] Token exchange successful. FULL Access token: ${token}`);
    console.log(`[OAuth] Token data keys:`, Object.keys(tokenRes.data));
    if (tokenRes.data.expires_in) {
      console.log(`[OAuth] Token expires in: ${tokenRes.data.expires_in} seconds`);
    }

    // store tokens in session (do not log token values)
    req.session.rwgps = tokenRes.data;
    res.redirect('/');
  } catch (err) {
    // Better error logging: show status and a small sanitized snippet
    const resp = err?.response;
    if (resp) {
      const status = resp.status;
      const type = resp.headers && resp.headers['content-type'];
      let snippet = '';
      try {
        if (type && type.includes('application/json')) snippet = JSON.stringify(resp.data).slice(0, 1000);
        else if (typeof resp.data === 'string') snippet = resp.data.replace(/\s+/g,' ').slice(0, 500);
        else snippet = String(resp.data).slice(0, 500);
      } catch (e) { snippet = String(resp.data).slice(0, 200); }
      console.error(`OAuth token exchange failed: status=${status} content-type=${type} snippet=${snippet}`);
    } else {
      console.error('OAuth token exchange error', err.message);
    }
    res.status(500).send('OAuth token exchange failed; check server logs for details');
  }
});

// Proxy to list routes
app.get('/api/routes', async (req, res) => {
  // Safe session debug: log whether session exists and whether access_token present (do not log token values)
  console.log('Session rwgps present=', !!req.session.rwgps, 'has_access_token=', !!(req.session.rwgps && req.session.rwgps.access_token));
  if (!req.session.rwgps || !req.session.rwgps.access_token) return res.status(401).send({ error: 'Not authenticated' });
  try {
    // Fetch all pages of routes using pagination
    let allRoutes = [];
    let page = 1;
    let hasMorePages = true;
    const perPage = 20; // I think RideWithGPS max is 20
    const maxPages = 100; // Safety limit to prevent infinite loops
    
    while (hasMorePages && page <= maxPages) {
      const r = await axios.get('https://ridewithgps.com/api/v1/routes.json', {
        headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' },
        params: { per_page: perPage, page: page }
      });
      
      const routes = r.data.routes || [];
      allRoutes = allRoutes.concat(routes);
      
      // Check if there are more pages
      // RideWithGPS API returns results_count and we can determine if there are more pages
      // by checking if we got a full page of results
      if (routes.length < perPage) {
        hasMorePages = false;
      } else {
        page++;
      }
      
      console.log(`Fetched page ${page - 1}, got ${routes.length} routes, total so far: ${allRoutes.length}`);
    }
    
    console.log(`Finished fetching all routes, total: ${allRoutes.length}`);
    res.json({ routes: allRoutes });
  } catch (err) {
  logAxiosError('Failed to fetch routes', err);
  res.status(500).send({ error: 'Failed to fetch routes' });
  }
});

// Proxy to fetch route details (including polyline or track points)
app.get('/api/route/:id', async (req, res) => {
  if (!req.session.rwgps || !req.session.rwgps.access_token) return res.status(401).send({ error: 'Not authenticated' });
  try {
    const id = req.params.id;
    
    // Fetch route with API version 3 to get POIs in extras format
    const r = await axios.get(`https://ridewithgps.com/routes/${id}.json`, {
      headers: { 
        Authorization: `Bearer ${req.session.rwgps.access_token}`, 
        Accept: 'application/json',
        'x-rwgps-api-version': '3'
      }
    });
    const data = r.data;

    // Extract existing POIs from the "extras" array format
    const existingPOIs = [];
    if (data.extras && Array.isArray(data.extras)) {
      for (const extra of data.extras) {
        if (extra.type === 'point_of_interest' && extra.point_of_interest) {
          // Add POI with "existing" type for frontend display
          const poi = {
            ...extra.point_of_interest,
            poiSource: 'existing' // Mark as existing POI
          };
          existingPOIs.push(poi);
        }
      }
    }

    // If the route lacks an encoded polyline, build one strictly from route.track_points
    try {
      if (data && data.route && !data.route.encoded_polyline) {
        const coords = coordsFromTrackPoints(data.route);
        if (coords.length > 0) {
          data.route.encoded_polyline = polyline.encode(coords);
        }
      }
    } catch (e) {
      console.warn('Failed to build polyline from route.track_points', e && e.message);
    }

    // Add enhanced elevation data with coordinates for chart-map synchronization
    let elevationData = [];
    if (data && data.route && Array.isArray(data.route.track_points)) {
      elevationData = data.route.track_points.map((point, index) => ({
        distance: point.d || 0, // Distance in meters
        elevation: point.e || 0, // Elevation in meters
        lat: point.y || 0, // Latitude (RWGPS uses y for latitude)
        lng: point.x || 0, // Longitude (RWGPS uses x for longitude)
        index
      })).filter(point => 
        point.distance !== undefined && 
        point.elevation !== undefined &&
        point.lat !== 0 &&
        point.lng !== 0
      );
    }

    // Add elevation data and existing POIs to the response
    const response = {
      ...data,
      elevationData,
      existingPOIs // Include existing POIs for frontend display
    };

    return res.json(response);
  } catch (err) {
  logAxiosError('Failed to fetch route', err);
  return res.status(500).send({ error: 'Failed to fetch route' });
  }
});

// PATCH route with POIs to RideWithGPS
app.patch('/api/route/:id/pois', async (req, res) => {
  if (!req.session.rwgps || !req.session.rwgps.access_token) return res.status(401).send({ error: 'Not authenticated' });
  
  const routeId = req.params.id;
  const { pois } = req.body;
  
  console.log(`[PATCH POIs] Starting PATCH for route ${routeId} with ${pois?.length || 0} POIs`);
  
  if (!pois || !Array.isArray(pois)) {
    console.log('[PATCH POIs] Error: Invalid POIs data');
    return res.status(400).send({ error: 'POIs must be an array' });
  }
  
  try {
    // First, get the current route data to fetch existing POIs
    // need 'x-rwgps-api-version': '3' so that we get POIs in the same format that we send them back
    console.log(`[PATCH POIs] Fetching current route data for route ${routeId}`);
    const routeResponse = await axios.get(`https://ridewithgps.com/routes/${routeId}.json`, {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json', 'x-rwgps-api-version': '3' }
    });
    
    const routeData = routeResponse.data;
    console.log(`[PATCH POIs] Retrieved route data: ${routeData.route?.name || 'unnamed'}`);
    // console.log(`[PATCH POIs] Retrieved route data: ${JSON.stringify(routeData, null, 2)}`);
    
    // Get current user ID (we only need this for the POI format)
    console.log('[PATCH POIs] Fetching current user data');
    const userResponse = await axios.get('https://ridewithgps.com/api/v1/users/current.json', {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' }
    });
    
    const currentUserId = userResponse.data.user?.id;
    console.log(`[PATCH POIs] Current user ID: ${currentUserId}`);
    
    if (!currentUserId) {
      console.log('[PATCH POIs] Error: Could not get current user ID');
      return res.status(500).send({ error: 'Could not get current user ID' });
    }
    
    // Extract existing POIs from the "extras" array format (top level, not under route)
    const existingPOIs = [];
    if (routeData.extras && Array.isArray(routeData.extras)) {
      for (const extra of routeData.extras) {
        if (extra.type === 'point_of_interest' && extra.point_of_interest) {
          // Keep the POI object as-is, don't change any keys
          existingPOIs.push(extra.point_of_interest);
        }
      }
    }
    
    console.log(`[PATCH POIs] Existing POIs count: ${existingPOIs.length}`);
    console.log(`[PATCH POIs] Existing POIs JSON:`, JSON.stringify(existingPOIs, null, 2));
    
    // Prepare new POIs for RideWithGPS format
    // Type mapping now happens in the POI provider on the frontend
    const formattedNewPOIs = pois.map(poi => {
      const poiTypeName = poi.poi_type_name || 'generic';
      const poiTypeId = getRideWithGPSTypeId(poiTypeName);
      
      console.log(`[PATCH POIs] Formatting POI "${poi.name}": type "${poiTypeName}" (ID: ${poiTypeId})`);
      
      return {
        lat: poi.lat,
        lng: poi.lng,
        name: poi.name,
        description: poi.description || '',
        url: poi.url || '',
        poi_type: poiTypeId,
        poi_type_name: poiTypeName,
        user_id: currentUserId
      };
    });
    
    console.log(`[PATCH POIs] Formatted new POIs:`, JSON.stringify(formattedNewPOIs, null, 2));
    
    // Merge existing POIs with new ones
    const allPOIs = [...existingPOIs, ...formattedNewPOIs];
    
    // Create PATCH payload with complete POI array
    const patchPayload = {
      route: {
        points_of_interest: allPOIs
      }
    };
    
    console.log(`[PATCH POIs] Sending PATCH request to RideWithGPS for route ${routeId}`);
    console.log(`[PATCH POIs] Total POIs: ${allPOIs.length} (${existingPOIs.length} existing + ${formattedNewPOIs.length} new)`);
    
    // Log the complete PATCH payload for debugging
    console.log(`[PATCH POIs] PATCH PAYLOAD:`, JSON.stringify(patchPayload, null, 2));
    
    // Send PATCH request to RideWithGPS - use the web URL format, not API URL
    const patchUrl = `https://ridewithgps.com/routes/${routeId}.json`;
    console.log(`[PATCH POIs] PATCH URL: ${patchUrl}`);
    
    const patchResponse = await axios.patch(patchUrl, patchPayload, {
      headers: { 
        Authorization: `Bearer ${req.session.rwgps.access_token}`, 
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[PATCH POIs] PATCH request successful: status ${patchResponse.status}`);
    console.log(`[PATCH POIs] Response data:`, JSON.stringify(patchResponse.data).slice(0, 200) + '...');
    
    res.json({ success: true, addedPOIs: formattedNewPOIs.length, totalPOIs: allPOIs.length });
    
  } catch (err) {
    console.error('[PATCH POIs] Error occurred:', err.message);
    logAxiosError('Failed to patch route with POIs', err);
    res.status(500).send({ error: 'Failed to update route with POIs' });
  }
});

// Expose session info for debugging
app.get('/api/session', (req, res) => {
  res.json({ authenticated: !!(req.session.rwgps && req.session.rwgps.access_token) });
});

// Provide Google Maps API key to client
app.get('/api/google-maps-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_API_KEY || '' });
});

// Get enabled POI providers
app.get('/api/poi-providers', (req, res) => {
  res.json({ enabledProviders: ENABLED_POI_PROVIDERS });
});

// Get current user details
app.get('/api/user', async (req, res) => {
  if (!req.session.rwgps || !req.session.rwgps.access_token) return res.status(401).send({ error: 'Not authenticated' });
  try {
    const r = await axios.get('https://ridewithgps.com/api/v1/users/current.json', {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' }
    });
    res.json(r.data);
  } catch (err) {
    logAxiosError('Failed to fetch user details', err);
    res.status(500).send({ error: 'Failed to fetch user details' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).send({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Google Maps POI Search endpoint (moved to subpath)
app.post('/api/poi-search/google-maps', async (req, res) => {
  const { textQuery, encodedPolyline, routingOrigin } = req.body || {};
  if (!textQuery || !encodedPolyline) return res.status(400).send({ error: 'textQuery and encodedPolyline required' });
  try {
    // Debug: log incoming request payload
    console.info('[Google Maps POI] Incoming search request:', { textQuery, encodedPolylineSnippet: (encodedPolyline || '').slice(0,50) + '...', routingOrigin });
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const body = {
      textQuery,
      searchAlongRouteParameters: {
        polyline: { encodedPolyline }
      }
    };
    if (routingOrigin) body.routingParameters = { origin: routingOrigin };
    // Prepare headers, mask API key for logging
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_API_KEY || '',
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELDMASK
    };
    const maskedHeaders = { ...headers, 'X-Goog-Api-Key': headers['X-Goog-Api-Key'] ? '***REDACTED***' : '' };
    console.debug('[Google Maps POI] Sending request to Google:', { url, headers: maskedHeaders, body: { ...body, searchAlongRouteParameters: { polyline: { encodedPolyline: (encodedPolyline||'').slice(0,50) + '...' } } } });

    const r = await axios.post(url, body, { headers });

    // Log response status and small snippet for debugging
    const respSnippet = r && r.data ? JSON.stringify(r.data).slice(0,2000) : `(no body)`;
    console.info('[Google Maps POI] Google response status=', r.status, 'snippet=', respSnippet.substring(0,1000));
    res.json(r.data);
  } catch (err) {
  logAxiosError('Google Maps POI search error', err);
  // Return error details to client for debugging (sanitized)
  const resp = err?.response;
  if (resp) {
    const status = resp.status;
    const type = resp.headers && resp.headers['content-type'];
    let snippet = '';
    try { snippet = (type && type.includes('application/json')) ? JSON.stringify(resp.data).slice(0,1000) : String(resp.data).slice(0,500); } catch(e){ snippet = String(resp.data).slice(0,200); }
    return res.status(500).send({ error: 'Search failed', details: { status, type, snippet } });
  }
  return res.status(500).send({ error: 'Search failed', details: { message: err && err.message ? err.message : String(err) } });
  }
});

// Mock POI Provider endpoint (moved to subpath)
app.post('/api/poi-search/mock', async (req, res) => {
  const { textQuery, mapBounds } = req.body || {};
  if (!textQuery) return res.status(400).send({ error: 'textQuery required' });
  
  try {
    console.info('[Mock POI] Incoming search request:', { textQuery, mapBounds });
    
    // Calculate center of the provided map bounds, or use a default center
    let centerLat = 39.5;
    let centerLng = -98.35;
    
    if (mapBounds && mapBounds.north && mapBounds.south && mapBounds.east && mapBounds.west) {
      centerLat = (mapBounds.north + mapBounds.south) / 2;
      centerLng = (mapBounds.east + mapBounds.west) / 2;
    }
    
    // Create a mock POI at the center with the search query as the name
    const mockPOI = {
      displayName: { text: `Mock: ${textQuery}` },
      location: {
        latitude: centerLat,
        longitude: centerLng
      },
      primaryType: 'establishment',
      uri: null // Mock provider doesn't have URIs
    };
    
    // Return in the same format as Google Places API
    const response = {
      places: [mockPOI]
    };
    
    console.info('[Mock POI] Generated mock POI:', mockPOI);
    res.json(response);
  } catch (err) {
    console.error('Mock POI search error:', err);
    res.status(500).send({ error: 'Mock POI search failed', details: { message: err && err.message ? err.message : String(err) } });
  }
});

// Serve index.html with injected Google API key so frontend gets the correct key at runtime
app.get('/', async (req, res, next) => {
  try{
    const key = process.env.GOOGLE_API_KEY || '';
    // Dev: use Vite to transform index.html for HMR and plugins
    if (!isProd && viteServer){
      const indexPath = path.join(__dirname, 'index.html');
      let html = fs.readFileSync(indexPath, 'utf8');
      // Let Vite perform its transforms first (it may rewrite or inject scripts).
      html = await viteServer.transformIndexHtml(req.originalUrl || '/', html);
  // Inject the Google API key last so transforms won't undo the replacement.
  // Use a global replacement so any Vite-inserted content that contains the
  // placeholder doesn't consume the first match and leave others intact.
  html = html.replace(/__GOOGLE_API_KEY__/g, key);
      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    }
    // Prod: serve prebuilt client or fallback to public
    let p = path.join(__dirname, 'dist', 'index.html');
    if (!fs.existsSync(p)) {
      p = path.join(__dirname, 'index.html');
    }
    let html = fs.readFileSync(p, 'utf8');
  // Replace all occurrences in production build as well.
  html = html.replace(/__GOOGLE_API_KEY__/g, key);
    return res.send(html);
  }catch(e){ next(e); }
});

// Start server; in dev attach Vite middleware for a single unified server
async function start(){
  if (!isProd){
    try{
      const vitePath = require.resolve('vite', { paths: [__dirname] });
      const vite = require(vitePath);
      viteServer = await vite.createServer({
        root: __dirname,
        server: { middlewareMode: true },
        appType: 'custom'
      });
      app.use(viteServer.middlewares);
      console.log('Vite dev middleware attached');
    }catch(err){
      console.warn('Vite not available; falling back to static serving. To enable unified dev server, install vite in client and run with NODE_ENV!=production. Error:', err && err.message);
    }
  }
  
  // Serve public static files AFTER Vite middleware to ensure they take precedence
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} (${isProd ? 'prod' : 'dev'})`));
}

start();
