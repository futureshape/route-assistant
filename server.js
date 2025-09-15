require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const polyline = require('@mapbox/polyline');
const qs = require('qs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const fs = require('fs');
const clientRoot = __dirname;
const clientDist = path.join(__dirname, 'dist');
let viteServer = null; // in dev, populated with Vite middleware

// Places API FieldMask to request specific fields (do not use env var per user request)
// API reference: https://developers.google.com/maps/documentation/places/web-service/nearby-search
// Include coordinates so the frontend can render markers
const GOOGLE_PLACES_FIELDMASK = 'places.displayName,places.googleMapsUri,places.location';

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
    const r = await axios.get('https://ridewithgps.com/api/v1/routes.json', {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' },
      params: { per_page: 50 }
    });
    res.json(r.data);
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
    const r = await axios.get(`https://ridewithgps.com/api/v1/routes/${id}.json`, {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' }
    });
    const data = r.data;

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

    return res.json(data);
  } catch (err) {
  logAxiosError('Failed to fetch route', err);
  return res.status(500).send({ error: 'Failed to fetch route' });
  }
});

// Get route track points with elevation data
app.get('/api/route/:id/elevation', async (req, res) => {
  if (!req.session.rwgps || !req.session.rwgps.access_token) return res.status(401).send({ error: 'Not authenticated' });
  try {
    const id = req.params.id;
    const r = await axios.get(`https://ridewithgps.com/api/v1/routes/${id}.json`, {
      headers: { Authorization: `Bearer ${req.session.rwgps.access_token}`, Accept: 'application/json' }
    });
    const data = r.data;
    
    if (!data || !data.route || !Array.isArray(data.route.track_points)) {
      return res.json({ elevationData: [] });
    }
    
    // Extract elevation data from track points
    const elevationData = data.route.track_points.map((point, index) => ({
      distance: point.d || 0, // Distance in meters
      elevation: point.e || 0, // Elevation in meters
      index
    })).filter(point => point.distance !== undefined && point.elevation !== undefined);
    
    res.json({ elevationData });
  } catch (err) {
    logAxiosError('Failed to fetch route elevation', err);
    res.status(500).send({ error: 'Failed to fetch route elevation' });
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

// Search Along Route proxy using Places Web Service (Text Search New)
// Expects JSON: { textQuery: string, encodedPolyline: string, routingOrigin?: { latitude, longitude } }
app.post('/api/search-along-route', async (req, res) => {
  const { textQuery, encodedPolyline, routingOrigin } = req.body || {};
  if (!textQuery || !encodedPolyline) return res.status(400).send({ error: 'textQuery and encodedPolyline required' });
  try {
    // Debug: log incoming request payload
    console.info('[Places] Incoming search request:', { textQuery, encodedPolylineSnippet: (encodedPolyline || '').slice(0,50) + '...', routingOrigin });
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
    console.debug('[Places] Sending request to Google:', { url, headers: maskedHeaders, body: { ...body, searchAlongRouteParameters: { polyline: { encodedPolyline: (encodedPolyline||'').slice(0,50) + '...' } } } });

    const r = await axios.post(url, body, { headers });

    // Log response status and small snippet for debugging
    const respSnippet = r && r.data ? JSON.stringify(r.data).slice(0,2000) : `(no body)`;
    console.info('[Places] Google response status=', r.status, 'snippet=', respSnippet.substring(0,1000));
    res.json(r.data);
  } catch (err) {
  logAxiosError('Search along route error', err);
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
