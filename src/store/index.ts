import { create } from 'zustand'
import type {
  Route,
  POI,
  MarkerStates,
  MapPosition,
  ElevationPoint,
  RouteSwitchDialogState,
  POIProvider,
} from './types'
import type { SessionUser } from '@/types/user'

// Auth state slice
interface AuthState {
  authenticated: boolean
  user: SessionUser | null
  setAuthenticated: (authenticated: boolean) => void
  setUser: (user: SessionUser | null) => void
}

// Routes state slice
interface RoutesState {
  routes: Route[]
  routesLoading: boolean
  selectedRouteId: number | null
  routePath: MapPosition[]
  routeColor: string
  routeFullyLoaded: boolean
  setRoutes: (routes: Route[]) => void
  setRoutesLoading: (loading: boolean) => void
  setSelectedRouteId: (id: number | null) => void
  setRoutePath: (path: MapPosition[]) => void
  setRouteColor: (color: string) => void
  setRouteFullyLoaded: (loaded: boolean) => void
  // Compound actions
  loadRoutes: (routes: Route[]) => void
  selectRoute: (id: number) => void
  clearRouteSelection: () => void
}

// POI/Markers state slice
interface POIState {
  markers: POI[]
  markerStates: MarkerStates
  selectedMarker: POI | null
  poiProviders: POIProvider[]
  setMarkers: (markers: POI[] | ((prev: POI[]) => POI[])) => void
  setMarkerStates: (states: MarkerStates | ((prev: MarkerStates) => MarkerStates)) => void
  setSelectedMarker: (marker: POI | null) => void
  setPOIProviders: (providers: POIProvider[]) => void
  updateMarkerState: (markerKey: string, newState: 'suggested' | 'selected' | 'existing') => void
  updatePOI: (markerKey: string, updatedPOI: Partial<POI>) => void
  // Compound actions
  clearAllPOIs: () => void
  clearSuggestedPOIs: () => void
  addExistingPOIs: (pois: POI[], getMarkerKey: (poi: POI) => string) => void
}

// Map state slice
interface MapState {
  mapCenter: MapPosition
  mapZoom: number
  chartHoverPosition: MapPosition | null
  googleMapsApiKey: string
  googleMapsApiKeyLoaded: boolean
  setMapCenter: (center: MapPosition) => void
  setMapZoom: (zoom: number) => void
  setChartHoverPosition: (position: MapPosition | null) => void
  setGoogleMapsApiKey: (key: string) => void
  setGoogleMapsApiKeyLoaded: (loaded: boolean) => void
}

// Elevation state slice
interface ElevationState {
  elevationData: ElevationPoint[]
  hoveredPointIndex: number | null
  setElevationData: (data: ElevationPoint[]) => void
  setHoveredPointIndex: (index: number | null) => void
}

// UI state slice (dialogs, selectors, etc.)
interface UIState {
  open: boolean // Route selector popover
  value: string // Route selector value
  routeSwitchDialog: RouteSwitchDialogState
  showIntroScreen: boolean
  showElevation: boolean
  activeAccordionItem: string
  loadingProviderId: string | null // Track which POI provider is currently searching
  setOpen: (open: boolean) => void
  setValue: (value: string) => void
  setRouteSwitchDialog: (dialog: RouteSwitchDialogState) => void
  setShowIntroScreen: (show: boolean) => void
  setShowElevation: (show: boolean) => void
  setActiveAccordionItem: (item: string) => void
  setLoadingProviderId: (id: string | null) => void
}

// Combined store type with reset functionality
type AppStore = AuthState & RoutesState & POIState & MapState & ElevationState & UIState & {
  resetUserData: () => void
}

// Create the store
export const useAppStore = create<AppStore>((set, get) => ({
  // Auth state
  authenticated: false,
  user: null,

  // Routes state
  routes: [],
  routesLoading: false,
  selectedRouteId: null,
  routePath: [],
  routeColor: '#fa6400',
  routeFullyLoaded: false,

  // POI/Markers state
  markers: [],
  markerStates: {},
  selectedMarker: null,
  poiProviders: [],

  // Map state
  mapCenter: { lat: 39.5, lng: -98.35 },
  mapZoom: 4,
  chartHoverPosition: null,
  googleMapsApiKey: '',
  googleMapsApiKeyLoaded: false,

  // Elevation state
  elevationData: [],
  hoveredPointIndex: null,

  // UI state
  open: false,
  value: '',
  routeSwitchDialog: {
    show: false,
    newRoute: null,
    currentRouteName: '',
    selectedCount: 0,
  },
  showIntroScreen: false,
  showElevation: false,
  activeAccordionItem: '',
  loadingProviderId: null,

  // Actions
  setAuthenticated: (authenticated) => set({ authenticated }),
  setUser: (user) => set({ user }),

  // Routes actions
  setRoutes: (routes) => set({ routes }),
  setRoutesLoading: (routesLoading) => set({ routesLoading }),
  setSelectedRouteId: (selectedRouteId) => set({ selectedRouteId }),
  setRoutePath: (routePath) => set({ routePath }),
  setRouteColor: (routeColor) => set({ routeColor }),
  setRouteFullyLoaded: (routeFullyLoaded) => set({ routeFullyLoaded }),
  // Compound actions
  loadRoutes: (routes) => set({ routes, routesLoading: false }),
  selectRoute: (id) => set({ selectedRouteId: id, routeFullyLoaded: false }),
  clearRouteSelection: () => set({ 
    selectedRouteId: null, 
    routePath: [], 
    routeFullyLoaded: false 
  }),

  // POI/Markers actions
  setMarkers: (markers) =>
    set((state) => ({
      markers: typeof markers === 'function' ? markers(state.markers) : markers,
    })),
  setMarkerStates: (markerStates) =>
    set((state) => ({
      markerStates: typeof markerStates === 'function' ? markerStates(state.markerStates) : markerStates,
    })),
  setSelectedMarker: (selectedMarker) => set({ selectedMarker }),
  setPOIProviders: (poiProviders) => set({ poiProviders }),
  updateMarkerState: (markerKey, newState) => {
    const state = get()
    // Don't allow changing state of existing POIs
    if (state.markerStates[markerKey] === 'existing') {
      return
    }
    set({
      markerStates: {
        ...state.markerStates,
        [markerKey]: newState,
      },
    })
  },
  updatePOI: (markerKey, updatedPOI) => {
    const state = get()
    // Find and update the POI
    const updatedMarkers = state.markers.map((poi) => {
      const key = `${poi.name}_${poi.lat}_${poi.lng}`
      if (key === markerKey) {
        return { ...poi, ...updatedPOI }
      }
      return poi
    })
    
    // Update selectedMarker if it's the one being updated
    const updatedSelectedMarker = state.selectedMarker 
      ? `${state.selectedMarker.name}_${state.selectedMarker.lat}_${state.selectedMarker.lng}` === markerKey
        ? { ...state.selectedMarker, ...updatedPOI }
        : state.selectedMarker
      : null
    
    set({
      markers: updatedMarkers,
      selectedMarker: updatedSelectedMarker,
    })
  },
  // Compound actions
  clearAllPOIs: () => set({
    markers: [],
    markerStates: {},
    selectedMarker: null,
  }),
  clearSuggestedPOIs: () => {
    const state = get()
    const newMarkers = state.markers.filter(poi => {
      const markerKey = `${poi.name}_${poi.lat}_${poi.lng}`
      const markerState = state.markerStates[markerKey]
      return markerState === 'existing' || markerState === 'selected'
    })
    const newMarkerStates: MarkerStates = {}
    Object.entries(state.markerStates).forEach(([key, markerState]) => {
      if (markerState === 'existing' || markerState === 'selected') {
        newMarkerStates[key] = markerState
      }
    })
    
    // Only clear selectedMarker if it was a suggested POI
    let newSelectedMarker = state.selectedMarker
    if (state.selectedMarker) {
      const selectedKey = `${state.selectedMarker.name}_${state.selectedMarker.lat}_${state.selectedMarker.lng}`
      const selectedState = state.markerStates[selectedKey]
      if (selectedState === 'suggested') {
        newSelectedMarker = null
      }
    }
    
    set({
      markers: newMarkers,
      markerStates: newMarkerStates,
      selectedMarker: newSelectedMarker,
    })
  },
  addExistingPOIs: (pois, getMarkerKey) => {
    const state = get()
    const existingMarkerStates: MarkerStates = {}
    pois.forEach((poi) => {
      const markerKey = getMarkerKey(poi)
      existingMarkerStates[markerKey] = 'existing'
    })
    set({
      markers: [...state.markers, ...pois],
      markerStates: { ...state.markerStates, ...existingMarkerStates },
    })
  },

  // Map actions
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setChartHoverPosition: (chartHoverPosition) => set({ chartHoverPosition }),
  setGoogleMapsApiKey: (googleMapsApiKey) => set({ googleMapsApiKey }),
  setGoogleMapsApiKeyLoaded: (googleMapsApiKeyLoaded) => set({ googleMapsApiKeyLoaded }),

  // Elevation actions
  setElevationData: (elevationData) => set({ elevationData }),
  setHoveredPointIndex: (hoveredPointIndex) => set({ hoveredPointIndex }),

  // UI actions
  setOpen: (open) => set({ open }),
  setValue: (value) => set({ value }),
  setRouteSwitchDialog: (routeSwitchDialog) => set({ routeSwitchDialog }),
  setShowIntroScreen: (showIntroScreen) => set({ showIntroScreen }),
  setShowElevation: (showElevation) => set({ showElevation }),
  setActiveAccordionItem: (activeAccordionItem) => set({ activeAccordionItem }),
  setLoadingProviderId: (loadingProviderId) => set({ loadingProviderId }),

  // Reset function to clear only user-specific data (preserve app-level state)
  resetUserData: () => set({
    // Clear auth state
    authenticated: false,
    user: null,
    
    // Clear route data
    routes: [],
    routesLoading: false,
    selectedRouteId: null,
    routePath: [],
    routeFullyLoaded: false,
    
    // Clear POI data
    markers: [],
    markerStates: {},
    selectedMarker: null,
    
    // Clear elevation data
    elevationData: [],
    hoveredPointIndex: null,
    chartHoverPosition: null,
    
    // Clear UI state
    open: false,
    value: '',
    routeSwitchDialog: {
      show: false,
      newRoute: null,
      currentRouteName: '',
      selectedCount: 0,
    },
    showElevation: false,
    activeAccordionItem: '',
    loadingProviderId: null,
    
    // Preserve app-level state:
    // - googleMapsApiKey & googleMapsApiKeyLoaded (app configuration)
    // - poiProviders (app configuration)
    // - mapCenter & mapZoom (user preference)
    // - routeColor (theme setting)
    // - showIntroScreen (user preference)
  }),
}))
