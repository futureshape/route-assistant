# Using the Zustand Store - Quick Start Guide

## Basic Usage

### Importing the Store
```tsx
import { useAppStore } from '@/store'
```

### Accessing State
```tsx
function MyComponent() {
  // Get individual state values
  const authenticated = useAppStore((state) => state.authenticated)
  const routes = useAppStore((state) => state.routes)
  const markers = useAppStore((state) => state.markers)
  
  return <div>...</div>
}
```

### Accessing Actions
```tsx
function MyComponent() {
  // Get setter functions
  const setAuthenticated = useAppStore((state) => state.setAuthenticated)
  const setRoutes = useAppStore((state) => state.setRoutes)
  const updateMarkerState = useAppStore((state) => state.updateMarkerState)
  
  // Use them
  const handleLogin = () => {
    setAuthenticated(true)
  }
  
  return <button onClick={handleLogin}>Login</button>
}
```

## Optimized Usage with Selectors

For better performance, use the selector hooks from `/src/store/selectors.ts`:

```tsx
import { useAuth, useRoutes, usePOI, useMap, useElevation, useUI } from '@/store/selectors'

function MyComponent() {
  // Get all auth state and actions at once
  const { authenticated, setAuthenticated } = useAuth()
  
  // Get all route state and actions
  const { routes, selectedRouteId, setRoutes, setSelectedRouteId } = useRoutes()
  
  // Component only re-renders when auth or routes state changes
  return <div>...</div>
}
```

## Available State Slices

### Auth State
```tsx
const { authenticated, setAuthenticated } = useAuth()
```

### Routes State
```tsx
const {
  routes,
  routesLoading,
  selectedRouteId,
  routePath,
  routeColor,
  routeFullyLoaded,
  setRoutes,
  setRoutesLoading,
  setSelectedRouteId,
  setRoutePath,
  setRouteColor,
  setRouteFullyLoaded,
} = useRoutes()
```

### POI State
```tsx
const {
  markers,
  markerStates,
  selectedMarker,
  poiProviders,
  setMarkers,
  setMarkerStates,
  setSelectedMarker,
  setPOIProviders,
  updateMarkerState,
} = usePOI()
```

### Map State
```tsx
const {
  mapCenter,
  mapZoom,
  chartHoverPosition,
  googleMapsApiKey,
  googleMapsApiKeyLoaded,
  setMapCenter,
  setMapZoom,
  setChartHoverPosition,
  setGoogleMapsApiKey,
  setGoogleMapsApiKeyLoaded,
} = useMap()
```

### Elevation State
```tsx
const {
  elevationData,
  showElevation,
  setElevationData,
  setShowElevation,
} = useElevation()
```

### UI State
```tsx
const {
  open,
  value,
  routeSwitchDialog,
  showIntroScreen,
  activeAccordionItem,
  setOpen,
  setValue,
  setRouteSwitchDialog,
  setShowIntroScreen,
  setActiveAccordionItem,
} = useUI()
```

## Common Patterns

### 1. Reading Multiple State Values
```tsx
// Option 1: Individual selectors (may cause more re-renders)
const routes = useAppStore((state) => state.routes)
const selectedRouteId = useAppStore((state) => state.selectedRouteId)

// Option 2: Grouped selector (better performance)
const { routes, selectedRouteId } = useRoutes()

// Option 3: Custom selector (most optimized)
const routeData = useAppStore((state) => ({
  routes: state.routes,
  selectedRouteId: state.selectedRouteId,
}))
```

### 2. Updating State
```tsx
function MyComponent() {
  const setMarkers = useAppStore((state) => state.setMarkers)
  
  // Update with new value
  setMarkers(newMarkers)
  
  // Update based on previous value (like useState)
  setMarkers((prev) => [...prev, newMarker])
}
```

### 3. Derived State
```tsx
// Compute derived values from state
const selectedCount = useAppStore((state) => 
  Object.values(state.markerStates).filter(s => s === 'selected').length
)

const currentRouteName = useAppStore((state) => {
  if (!state.selectedRouteId) return ''
  const route = state.routes.find(r => r.id.toString() === state.selectedRouteId)
  return route?.name || 'Unknown Route'
})
```

### 4. Actions in Store
```tsx
// Some logic is built into the store as actions
function MyComponent() {
  const updateMarkerState = useAppStore((state) => state.updateMarkerState)
  
  // Use the store action
  updateMarkerState('poi-key-123', 'selected')
  
  // The action handles validation internally
  // (e.g., can't change state of existing POIs)
}
```

## Best Practices

### ✅ DO

1. **Use selector hooks for grouped state**
   ```tsx
   const { routes, setRoutes } = useRoutes()
   ```

2. **Create custom selectors for derived state**
   ```tsx
   const selectedMarkerCount = useAppStore((state) => 
     state.markers.filter(m => state.markerStates[getKey(m)] === 'selected').length
   )
   ```

3. **Keep components focused on their slice**
   ```tsx
   // In a POI component, only use POI state
   const { markers, setMarkers } = usePOI()
   ```

### ❌ DON'T

1. **Don't access the entire store unnecessarily**
   ```tsx
   // Bad - causes re-render on any state change
   const store = useAppStore()
   
   // Good - only re-renders when routes change
   const routes = useAppStore((state) => state.routes)
   ```

2. **Don't mutate state directly**
   ```tsx
   // Bad
   const markers = useAppStore((state) => state.markers)
   markers.push(newMarker) // Don't mutate!
   
   // Good
   const setMarkers = useAppStore((state) => state.setMarkers)
   setMarkers((prev) => [...prev, newMarker])
   ```

3. **Don't create unnecessary selectors**
   ```tsx
   // Bad - new object on every render causes re-renders
   const data = useAppStore((state) => ({ ...state }))
   
   // Good - only select what you need
   const authenticated = useAppStore((state) => state.authenticated)
   ```

## TypeScript Support

All state and actions are fully typed:

```tsx
import type { Route, POI, MarkerStates } from '@/store/types'

function MyComponent() {
  // TypeScript knows the types
  const routes: Route[] = useAppStore((state) => state.routes)
  const markers: POI[] = useAppStore((state) => state.markers)
  const states: MarkerStates = useAppStore((state) => state.markerStates)
  
  // Autocomplete works for actions
  const setRoutes = useAppStore((state) => state.setRoutes)
  setRoutes([]) // TypeScript validates this
}
```

## Debugging

### Console Logging
```tsx
// Log state changes
useEffect(() => {
  console.log('Routes changed:', routes)
}, [routes])

// Or use the store directly
console.log('Current state:', useAppStore.getState())
```

### React DevTools
The state is visible in React DevTools under the component using the store.

### Future: Zustand DevTools
To enable Zustand DevTools (see `STATE_MANAGEMENT_MIGRATION.md`):
```tsx
import { devtools } from 'zustand/middleware'

export const useAppStore = create<AppStore>()(
  devtools((set, get) => ({ /* store */ }), { name: 'RouteAssistant' })
)
```

## Migration from Old Code

If you have old code using `useState`, migrate like this:

### Before
```tsx
const [authenticated, setAuthenticated] = useState(false)
const [routes, setRoutes] = useState<any[]>([])
```

### After
```tsx
const authenticated = useAppStore((state) => state.authenticated)
const setAuthenticated = useAppStore((state) => state.setAuthenticated)
const routes = useAppStore((state) => state.routes)
const setRoutes = useAppStore((state) => state.setRoutes)
```

### Or better
```tsx
const { authenticated, setAuthenticated } = useAuth()
const { routes, setRoutes } = useRoutes()
```

## Examples from App.tsx

See `/src/App.tsx` for real-world usage examples of:
- Fetching and setting authentication state
- Loading and displaying routes
- Managing POI markers and states
- Handling map interactions
- Managing UI state (dialogs, popover, etc.)

## Additional Resources

- **Store implementation**: `/src/store/index.ts`
- **Type definitions**: `/src/store/types.ts`
- **Selector hooks**: `/src/store/selectors.ts`
- **Migration guide**: `/STATE_MANAGEMENT_MIGRATION.md`
- **Implementation summary**: `/ZUSTAND_IMPLEMENTATION_SUMMARY.md`
- **Zustand docs**: https://github.com/pmndrs/zustand
