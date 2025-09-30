# Route Assistant

A full-stack web application that helps cyclists explore routes and discover Points of Interest (POIs) along cycling routes using RideWithGPS integration and Google Maps.

## Features

### Route Management
- **RideWithGPS Integration**: Secure OAuth authentication with RideWithGPS
- **Route Selection**: Browse and select from your personal cycling routes
- **Route Visualization**: Interactive Google Maps display with route polylines
- **Elevation Profiles**: Interactive elevation charts with map synchronization

### Point of Interest Discovery
- **Multiple POI Providers**: Modular system supporting Google Places and extensible to other providers
- **Smart Search**: Search for specific POI types (restaurants, bike shops, lodging, etc.) along your route
- **Native POI Integration**: Click on native Google Maps POI markers to add them to your route
- **POI Management**: Add, review, and organize POIs before sending to RideWithGPS
- **Automatic Type Mapping**: Intelligent conversion from Google Places types to RideWithGPS POI categories

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Real-time Updates**: Live map interactions and instant POI discovery
- **Route Switching**: Smart confirmation dialogs when switching routes with unsaved changes

## Quick Start

### Prerequisites
- Node.js 16+ 
- RideWithGPS account and OAuth application
- Google Cloud Platform account with Maps and Places APIs enabled

### Installation
1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
   ```
   RWGPS_CLIENT_ID=your_ridewithgps_client_id
   RWGPS_CLIENT_SECRET=your_ridewithgps_client_secret
   GOOGLE_API_KEY=your_google_maps_api_key
   SESSION_SECRET=your_session_secret
   ```
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Open http://localhost:3001

### Production Deployment
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Ensure environment variables are configured in your hosting environment

## API Requirements

### Google Cloud Platform
Your Google API key must have the following APIs enabled:
- **Maps JavaScript API**: For interactive map display
- **Places API**: For POI search and place details

### RideWithGPS OAuth
Create an OAuth application in your RideWithGPS account with:
- **Redirect URI**: `https://yourdomain.com/auth/ridewithgps/callback` (or `http://localhost:3001/auth/ridewithgps/callback` for development)
- **Scopes**: Route read/write permissions

## Architecture

This application uses a **single-server architecture** where Express.js serves both the API endpoints and the React frontend. The frontend is built with Vite and served statically in production, with development mode providing hot module reloading.

### Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, Google Maps JavaScript API
- **Backend**: Node.js, Express.js, session-based authentication
- **State Management**: Zustand for client-side state
- **Build Tools**: Vite for frontend bundling and development server

## Documentation

- **`docs/`**: Technical documentation for developers
- **`.github/copilot-instructions.md`**: Complete architecture and development guidelines

## Contributing

This project follows feature-based component architecture with modular POI providers. See the technical documentation for detailed development guidelines and coding standards.
