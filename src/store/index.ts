import { create } from 'zustand'
import type {
  Route,
  POI,
  MarkerStates,
  MapPosition,
  ElevationDataPoint,
  RouteSwitchDialogState,
  POIProvider,
} from './types'

// Auth state slice
interface AuthState {
  authenticated: boolean
  setAuthenticated: (authenticated: boolean) => void
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
  elevationData: ElevationDataPoint[]
  showElevation: boolean
  setElevationData: (data: ElevationDataPoint[]) => void
  setShowElevation: (show: boolean) => void
}

// UI state slice (dialogs, selectors, etc.)
interface UIState {
  open: boolean // Route selector popover
  value: string // Route selector value
  routeSwitchDialog: RouteSwitchDialogState
  showIntroScreen: boolean
  activeAccordionItem: string
  setOpen: (open: boolean) => void
  setValue: (value: string) => void
  setRouteSwitchDialog: (dialog: RouteSwitchDialogState) => void
  setShowIntroScreen: (show: boolean) => void
  setActiveAccordionItem: (item: string) => void
}

// Combined store type
type AppStore = AuthState & RoutesState & POIState & MapState & ElevationState & UIState

// Create the store
export const useAppStore = create<AppStore>((set, get) => ({
  // Auth state
  authenticated: false,
  setAuthenticated: (authenticated) => set({ authenticated }),

  // Routes state
  routes: [],
  routesLoading: false,
  selectedRouteId: null,
  routePath: [],
  routeColor: '#fa6400',
  routeFullyLoaded: false,
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

  // POI/Markers state
  markers: [],
  markerStates: {},
  selectedMarker: null,
  poiProviders: [],
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
    set({
      markers: newMarkers,
      markerStates: newMarkerStates,
      selectedMarker: null,
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

  // Map state
  mapCenter: { lat: 39.5, lng: -98.35 },
  mapZoom: 4,
  chartHoverPosition: null,
  googleMapsApiKey: '',
  googleMapsApiKeyLoaded: false,
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setChartHoverPosition: (chartHoverPosition) => set({ chartHoverPosition }),
  setGoogleMapsApiKey: (googleMapsApiKey) => set({ googleMapsApiKey }),
  setGoogleMapsApiKeyLoaded: (googleMapsApiKeyLoaded) => set({ googleMapsApiKeyLoaded }),

  // Elevation state
  elevationData: [],
  showElevation: false,
  setElevationData: (elevationData) => set({ elevationData }),
  setShowElevation: (showElevation) => set({ showElevation }),

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
  activeAccordionItem: '',
  setOpen: (open) => set({ open }),
  setValue: (value) => set({ value }),
  setRouteSwitchDialog: (routeSwitchDialog) => set({ routeSwitchDialog }),
  setShowIntroScreen: (showIntroScreen) => set({ showIntroScreen }),
  setActiveAccordionItem: (activeAccordionItem) => set({ activeAccordionItem }),
}))
