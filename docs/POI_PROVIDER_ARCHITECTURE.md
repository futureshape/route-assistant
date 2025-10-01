# POI Provider Architecture

This document describes the architecture and design patterns for Point of Interest (POI) providers in the Route Assistant application, including the proper separation of responsibilities between frontend and backend components.

## Overview

The POI provider system is designed as a modular architecture that allows easy integration of different POI data sources (Google Places, OpenStreetMap, etc.) while maintaining consistency in the user interface and data handling.

## Architecture Principles

### 1. **Backend Handles Data Processing**
- All external API calls to POI services
- Data transformation and normalization
- Type mapping from provider-specific types to RideWithGPS POI types
- Geographic filtering and search logic
- Error handling and validation

### 2. **Frontend Handles User Interface**
- Search form components specific to each provider
- Provider registration and availability checking
- UI state management
- Display of search results and user interactions

### 3. **Standardized Data Flow**
- All providers return identical POI data structures
- Consistent API endpoints (`/api/poi-search/{provider-id}`)
- Uniform error handling and response formats

## Component Structure

### Backend Components

#### 1. **API Endpoints** (`server.js`)
Location: `/api/poi-search/{provider-id}`

**Responsibilities:**
- Receive search requests from frontend providers
- Make external API calls to POI services
- Transform provider-specific data to standard POI format
- Apply geographic filtering (route-based or bounds-based)
- Return standardized POI response

**Standard Request Format:**
```javascript
{
  textQuery: string,           // Search query or provider-specific parameters
  encodedPolyline?: string,    // Route path for route-based searches
  mapBounds?: {                // Map bounds for area-based searches
    north: number,
    south: number,
    east: number,
    west: number
  },
  routingOrigin?: {            // Optional routing context
    latitude: number,
    longitude: number
  }
}
```

**Standard Response Format:**
```javascript
{
  places: [                    // Array of standardized POI objects
    {
      name: string,            // POI name
      lat: number,            // Latitude
      lng: number,            // Longitude
      poi_type_name: string,   // RideWithGPS POI type (mapped by backend)
      description?: string,    // Optional description
      url?: string,           // Optional website/info URL
      provider: string        // Provider ID ('google', 'osm', etc.)
    }
  ]
}
```

#### 2. **Type Mapping** (`poi-type-mapping.js`)
**Responsibilities:**
- Map provider-specific POI types to RideWithGPS POI types
- Provide consistent type IDs for RideWithGPS API integration
- Maintain single source of truth for type mappings

**Functions:**
- `mapGoogleTypeToRideWithGPS(googleType)` - Google Places → RideWithGPS
- `mapOSMAmenityToRideWithGPS(osmAmenity)` - OSM amenity → RideWithGPS
- `getRideWithGPSTypeId(typeName)` - Get numeric ID for POI type

### Frontend Components

#### 1. **Provider Interface** (`src/lib/poi-providers.ts`)
**Defines:**
- `POIProvider` interface that all providers must implement
- `POISearchParams` and `POIResult` type definitions
- `POISearchFormProps` for search form components

**Provider Interface:**
```typescript
interface POIProvider {
  id: string                   // Unique identifier ('google', 'osm', etc.)
  name: string                // Display name for UI
  description: string         // User-friendly description
  searchPOIs(params: POISearchParams): Promise<POIResult[]>
  getSearchFormComponent(): React.ComponentType<POISearchFormProps>
  isEnabled(context?: any): boolean
}
```

#### 2. **Provider Implementations** (`src/lib/{provider}-provider.tsx`)
**Responsibilities:**
- Implement `POIProvider` interface
- Provide provider-specific search form UI
- Make API calls to backend endpoints
- Handle provider-specific errors and edge cases
- Check availability/enabled status

**Structure:**
```typescript
// Search form component (provider-specific UI)
const ProviderSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled }) => {
  // Provider-specific search interface
  // Calls onSearch() with appropriate POISearchParams
}

// Provider implementation
export class ProviderName implements POIProvider {
  id = 'provider-id'
  name = 'Provider Display Name'
  description = 'What this provider searches'
  
  isEnabled(context?) { /* availability logic */ }
  
  async searchPOIs(params) {
    // Call backend API endpoint
    // Return standardized POI results
  }
  
  getSearchFormComponent() {
    return ProviderSearchForm
  }
}
```

#### 3. **Provider Registry** (`src/lib/provider-registry.ts`)
**Responsibilities:**
- Register available POI providers
- Enable/disable providers based on configuration
- Provide provider instances to the application

## Data Flow

### 1. **Search Request Flow**
```
User Input → Provider Search Form → Provider.searchPOIs() → 
Backend API Endpoint → External POI Service → 
Type Mapping → Standardized Response → Frontend Display
```

### 2. **Type Mapping Flow**
```
External Service Response → Backend Type Mapping Function → 
RideWithGPS POI Type → Frontend (no additional mapping needed)
```

## Implementation Guidelines

### Adding a New POI Provider

#### Backend Implementation

1. **Add type mapping to `poi-type-mapping.js`:**
```javascript
const NEW_TO_RIDEWITHGPS_MAPPING = {
  'provider_type_1': 'food',
  'provider_type_2': 'lodging',
  // ... more mappings
}

function mapNewProviderToRideWithGPS(providerType) {
  const normalized = providerType.toLowerCase()
  return NEW_TO_RIDEWITHGPS_MAPPING[normalized] || 'generic'
}

module.exports = {
  // ... existing exports
  mapNewProviderToRideWithGPS
}
```

2. **Add API endpoint to `server.js`:**
```javascript
const { mapNewProviderToRideWithGPS } = require('./poi-type-mapping')

app.post('/api/poi-search/new-provider', async (req, res) => {
  try {
    // Extract search parameters
    const { textQuery, encodedPolyline, mapBounds } = req.body
    
    // Call external service
    const externalResponse = await callExternalService(params)
    
    // Transform to standard format
    const formattedPOIs = externalResponse.results.map(item => ({
      name: item.name,
      lat: item.latitude,
      lng: item.longitude,
      poi_type_name: mapNewProviderToRideWithGPS(item.category),
      description: item.description || '',
      url: item.website || '',
      provider: 'new-provider'
    }))
    
    // Return standard response
    res.json({ places: formattedPOIs })
  } catch (error) {
    res.status(500).json({ error: 'Search failed' })
  }
})
```

#### Frontend Implementation

1. **Create provider file `src/lib/new-provider.tsx`:**
```typescript
import { POIProvider, POISearchParams, POIResult } from '@/lib/poi-providers'

const NewProviderSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled }) => {
  // Provider-specific UI components
  return (
    <div>
      {/* Custom search interface */}
      <Button onClick={() => onSearch({ textQuery: 'search-params' })}>
        Search
      </Button>
    </div>
  )
}

export class NewProvider implements POIProvider {
  id = 'new-provider'
  name = 'New Provider'
  description = 'Description of what this provider searches'
  
  isEnabled(context?) {
    // Check if provider should be available
    return true
  }
  
  async searchPOIs(params: POISearchParams): Promise<POIResult[]> {
    const response = await fetch('/api/poi-search/new-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      throw new Error('Search failed')
    }
    
    const data = await response.json()
    return data.places || []
  }
  
  getSearchFormComponent() {
    return NewProviderSearchForm
  }
}
```

2. **Register provider in `src/lib/provider-registry.ts`:**
```typescript
import { NewProvider } from './new-provider'

const providers = [
  new GoogleMapsProvider(),
  new OSMProvider(),
  new NewProvider(), // Add new provider
]
```

## Anti-Patterns to Avoid

### ❌ **Frontend Type Mapping**
```typescript
// DON'T DO THIS - mapping should only happen in backend
const poi = {
  poi_type_name: mapProviderTypeToRideWithGPS(rawType) // ❌
}
```

### ❌ **Duplicate Mapping Logic**
```typescript
// DON'T DO THIS - creates maintenance issues
const FRONTEND_MAPPING = { /* duplicate of backend mapping */ } // ❌
```

### ❌ **Non-Standard Response Formats**
```typescript
// DON'T DO THIS - breaks consistency
return rawProviderResponse // ❌ Should be standardized POI objects
```

### ❌ **Missing Error Handling**
```typescript
// DON'T DO THIS - always handle errors properly
const response = await fetch(url) // ❌ No error checking
return response.json() // ❌ No validation
```

## Best Practices

### ✅ **Consistent Error Handling**
```typescript
if (!response.ok) {
  const text = await response.text()
  throw new Error(`Provider search failed: ${text}`)
}
```

### ✅ **Input Validation**
```typescript
if (!textQuery) {
  throw new Error('Provider requires search query')
}
```

### ✅ **Provider Availability Checking**
```typescript
isEnabled(context?: { routePath?: unknown[] }): boolean {
  return !!(context?.routePath && context.routePath.length > 0)
}
```

### ✅ **Standardized Logging**
```javascript
console.info('[Provider] Request:', { params })
console.info('[Provider] Response:', { count: results.length })
```

## Configuration

### Environment Variables
- `ENABLED_POI_PROVIDERS`: Comma-separated list of enabled providers
- Provider-specific API keys and configuration

### Provider Enablement
```javascript
// In server.js
const ENABLED_POI_PROVIDERS = (process.env.ENABLED_POI_PROVIDERS || 'google,osm').split(',')
```

## Testing Considerations

### Backend Testing
- Test type mapping functions with various inputs
- Test API endpoints with mock external services
- Validate response format consistency

### Frontend Testing
- Test provider search forms with various states
- Test error handling and loading states
- Test provider availability logic

## Future Enhancements

### Potential Improvements
1. **Provider Priorities**: Allow ranking of providers by reliability/preference
2. **Caching Layer**: Cache frequent searches to improve performance
3. **Rate Limiting**: Implement rate limiting for external API calls
4. **Provider Health Monitoring**: Track success rates and response times
5. **Dynamic Provider Loading**: Load providers on-demand to reduce bundle size

### Extension Points
- Custom search filters per provider
- Provider-specific result ranking
- Multi-provider result aggregation
- Real-time provider status monitoring

## Conclusion

This architecture ensures:
- **Consistency**: All providers return identical data structures
- **Maintainability**: Single source of truth for type mappings
- **Extensibility**: Easy to add new providers following established patterns
- **Separation of Concerns**: Clear boundaries between frontend UI and backend data processing
- **Type Safety**: Proper TypeScript interfaces throughout the system

When implementing new POI providers, always follow these architectural principles to maintain system consistency and reliability.