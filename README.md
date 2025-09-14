# Route Assistant (minimal demo)

This is a minimal demo app that shows how to sign in with RideWithGPS, list routes, display a route on Google Maps, and search POIs along the route using Google Places.

Environment variables (see `.env.example`):
- RWGPS_CLIENT_ID
- RWGPS_CLIENT_SECRET
- RWGPS_REDIRECT_URI (optional)
- GOOGLE_API_KEY
- SESSION_SECRET (optional)

To run locally:
1. Copy `.env.example` to `.env` and fill values.
2. npm install
3. npm start

Open http://localhost:3000

Notes:
- This is a minimal, insecure demo meant for development only.
- The app stores OAuth tokens in server session memory.
- Google Maps API key must have Maps JavaScript API and Places API enabled.

Server-side Search Along Route

- The app includes a server-side proxy endpoint `POST /api/search-along-route` which calls the Places Web Service `places:searchText` with an encoded polyline to efficiently search along a route. This requires the Google API key to be authorized for web service calls.

