import { useAppStore } from './index'

// Selector hooks for optimized re-renders
// These only re-render when their specific slice of state changes

export const useAuth = () => useAppStore((state) => ({
  authenticated: state.authenticated,
  setAuthenticated: state.setAuthenticated,
}))

export const useRoutes = () => useAppStore((state) => ({
  routes: state.routes,
  routesLoading: state.routesLoading,
  selectedRouteId: state.selectedRouteId,
  routePath: state.routePath,
  routeColor: state.routeColor,
  routeFullyLoaded: state.routeFullyLoaded,
  setRoutes: state.setRoutes,
  setRoutesLoading: state.setRoutesLoading,
  setSelectedRouteId: state.setSelectedRouteId,
  setRoutePath: state.setRoutePath,
  setRouteColor: state.setRouteColor,
  setRouteFullyLoaded: state.setRouteFullyLoaded,
  loadRoutes: state.loadRoutes,
  selectRoute: state.selectRoute,
  clearRouteSelection: state.clearRouteSelection,
}))

export const usePOI = () => useAppStore((state) => ({
  markers: state.markers,
  markerStates: state.markerStates,
  selectedMarker: state.selectedMarker,
  poiProviders: state.poiProviders,
  setMarkers: state.setMarkers,
  setMarkerStates: state.setMarkerStates,
  setSelectedMarker: state.setSelectedMarker,
  setPOIProviders: state.setPOIProviders,
  updateMarkerState: state.updateMarkerState,
  clearAllPOIs: state.clearAllPOIs,
  clearSuggestedPOIs: state.clearSuggestedPOIs,
  addExistingPOIs: state.addExistingPOIs,
}))

export const useMap = () => useAppStore((state) => ({
  mapCenter: state.mapCenter,
  mapZoom: state.mapZoom,
  chartHoverPosition: state.chartHoverPosition,
  googleMapsApiKey: state.googleMapsApiKey,
  googleMapsApiKeyLoaded: state.googleMapsApiKeyLoaded,
  setMapCenter: state.setMapCenter,
  setMapZoom: state.setMapZoom,
  setChartHoverPosition: state.setChartHoverPosition,
  setGoogleMapsApiKey: state.setGoogleMapsApiKey,
  setGoogleMapsApiKeyLoaded: state.setGoogleMapsApiKeyLoaded,
}))

export const useElevation = () => useAppStore((state) => ({
  elevationData: state.elevationData,
  showElevation: state.showElevation,
  setElevationData: state.setElevationData,
  setShowElevation: state.setShowElevation,
}))

export const useUI = () => useAppStore((state) => ({
  open: state.open,
  value: state.value,
  routeSwitchDialog: state.routeSwitchDialog,
  showIntroScreen: state.showIntroScreen,
  activeAccordionItem: state.activeAccordionItem,
  setOpen: state.setOpen,
  setValue: state.setValue,
  setRouteSwitchDialog: state.setRouteSwitchDialog,
  setShowIntroScreen: state.setShowIntroScreen,
  setActiveAccordionItem: state.setActiveAccordionItem,
}))
