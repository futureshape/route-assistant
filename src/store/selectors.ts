import { useAppStore } from './index'

// Selector hooks for optimized re-renders
// These only re-render when their specific slice of state changes

// Individual selectors (most efficient - no object recreation)
export const useAuthenticated = () => useAppStore((state) => state.authenticated)
export const useSetAuthenticated = () => useAppStore((state) => state.setAuthenticated)
export const useUser = () => useAppStore((state) => state.user)
export const useSetUser = () => useAppStore((state) => state.setUser)

// Combined selectors using custom equality check to prevent object recreation issues
export const useAuth = () => {
  // Use individual selectors to avoid object recreation
  const authenticated = useAuthenticated()
  const setAuthenticated = useSetAuthenticated()
  const user = useUser()
  const setUser = useSetUser()
  
  // Return stable object - React will handle the equality check
  return { authenticated, setAuthenticated, user, setUser }
}

// Individual route selectors
export const useRoutesData = () => useAppStore((state) => state.routes)
export const useRoutesLoading = () => useAppStore((state) => state.routesLoading)
export const useSelectedRouteId = () => useAppStore((state) => state.selectedRouteId)
export const useRoutePath = () => useAppStore((state) => state.routePath)
export const useRouteColor = () => useAppStore((state) => state.routeColor)
export const useRouteFullyLoaded = () => useAppStore((state) => state.routeFullyLoaded)
export const useSetRoutes = () => useAppStore((state) => state.setRoutes)
export const useSetRoutesLoading = () => useAppStore((state) => state.setRoutesLoading)
export const useSetRoutePath = () => useAppStore((state) => state.setRoutePath)
export const useSetRouteColor = () => useAppStore((state) => state.setRouteColor)
export const useSetRouteFullyLoaded = () => useAppStore((state) => state.setRouteFullyLoaded)
export const useLoadRoutes = () => useAppStore((state) => state.loadRoutes)
export const useSelectRoute = () => useAppStore((state) => state.selectRoute)
export const useClearRouteSelection = () => useAppStore((state) => state.clearRouteSelection)

export const useRoutes = () => {
  const routes = useRoutesData()
  const routesLoading = useRoutesLoading()
  const selectedRouteId = useSelectedRouteId()
  const routePath = useRoutePath()
  const routeColor = useRouteColor()
  const routeFullyLoaded = useRouteFullyLoaded()
  const setRoutes = useSetRoutes()
  const setRoutesLoading = useSetRoutesLoading()
  const setRoutePath = useSetRoutePath()
  const setRouteColor = useSetRouteColor()
  const setRouteFullyLoaded = useSetRouteFullyLoaded()
  const loadRoutes = useLoadRoutes()
  const selectRoute = useSelectRoute()
  const clearRouteSelection = useClearRouteSelection()
  
  return {
    routes,
    routesLoading,
    selectedRouteId,
    routePath,
    routeColor,
    routeFullyLoaded,
    setRoutes,
    setRoutesLoading,
    setRoutePath,
    setRouteColor,
    setRouteFullyLoaded,
    loadRoutes,
    selectRoute,
    clearRouteSelection,
  }
}

// Individual POI selectors
export const useMarkers = () => useAppStore((state) => state.markers)
export const useMarkerStates = () => useAppStore((state) => state.markerStates)
export const useSelectedMarker = () => useAppStore((state) => state.selectedMarker)
export const usePOIProviders = () => useAppStore((state) => state.poiProviders)
export const useSetMarkers = () => useAppStore((state) => state.setMarkers)
export const useSetMarkerStates = () => useAppStore((state) => state.setMarkerStates)
export const useSetSelectedMarker = () => useAppStore((state) => state.setSelectedMarker)
export const useSetPOIProviders = () => useAppStore((state) => state.setPOIProviders)
export const useUpdateMarkerState = () => useAppStore((state) => state.updateMarkerState)
export const useUpdatePOI = () => useAppStore((state) => state.updatePOI)
export const useClearAllPOIs = () => useAppStore((state) => state.clearAllPOIs)
export const useClearSuggestedPOIs = () => useAppStore((state) => state.clearSuggestedPOIs)
export const useAddExistingPOIs = () => useAppStore((state) => state.addExistingPOIs)

export const usePOI = () => {
  const markers = useMarkers()
  const markerStates = useMarkerStates()
  const selectedMarker = useSelectedMarker()
  const poiProviders = usePOIProviders()
  const setMarkers = useSetMarkers()
  const setMarkerStates = useSetMarkerStates()
  const setSelectedMarker = useSetSelectedMarker()
  const setPOIProviders = useSetPOIProviders()
  const updateMarkerState = useUpdateMarkerState()
  const updatePOI = useUpdatePOI()
  const clearAllPOIs = useClearAllPOIs()
  const clearSuggestedPOIs = useClearSuggestedPOIs()
  const addExistingPOIs = useAddExistingPOIs()
  
  return {
    markers,
    markerStates,
    selectedMarker,
    poiProviders,
    setMarkers,
    setMarkerStates,
    setSelectedMarker,
    setPOIProviders,
    updateMarkerState,
    updatePOI,
    clearAllPOIs,
    clearSuggestedPOIs,
    addExistingPOIs,
  }
}

// Individual map selectors
export const useMapCenter = () => useAppStore((state) => state.mapCenter)
export const useMapZoom = () => useAppStore((state) => state.mapZoom)
export const useChartHoverPosition = () => useAppStore((state) => state.chartHoverPosition)
export const useGoogleMapsApiKey = () => useAppStore((state) => state.googleMapsApiKey)
export const useGoogleMapsApiKeyLoaded = () => useAppStore((state) => state.googleMapsApiKeyLoaded)
export const useSetMapCenter = () => useAppStore((state) => state.setMapCenter)
export const useSetMapZoom = () => useAppStore((state) => state.setMapZoom)
export const useSetChartHoverPosition = () => useAppStore((state) => state.setChartHoverPosition)
export const useSetGoogleMapsApiKey = () => useAppStore((state) => state.setGoogleMapsApiKey)
export const useSetGoogleMapsApiKeyLoaded = () => useAppStore((state) => state.setGoogleMapsApiKeyLoaded)

export const useMap = () => {
  const mapCenter = useMapCenter()
  const mapZoom = useMapZoom()
  const chartHoverPosition = useChartHoverPosition()
  const googleMapsApiKey = useGoogleMapsApiKey()
  const googleMapsApiKeyLoaded = useGoogleMapsApiKeyLoaded()
  const setMapCenter = useSetMapCenter()
  const setMapZoom = useSetMapZoom()
  const setChartHoverPosition = useSetChartHoverPosition()
  const setGoogleMapsApiKey = useSetGoogleMapsApiKey()
  const setGoogleMapsApiKeyLoaded = useSetGoogleMapsApiKeyLoaded()
  
  return {
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
  }
}

// Individual elevation selectors
export const useElevationData = () => useAppStore((state) => state.elevationData)
export const useShowElevation = () => useAppStore((state) => state.showElevation)
export const useSetElevationData = () => useAppStore((state) => state.setElevationData)
export const useSetShowElevation = () => useAppStore((state) => state.setShowElevation)

export const useElevation = () => {
  const elevationData = useElevationData()
  const showElevation = useShowElevation()
  const setElevationData = useSetElevationData()
  const setShowElevation = useSetShowElevation()
  
  return {
    elevationData,
    showElevation,
    setElevationData,
    setShowElevation,
  }
}

// Individual UI selectors
export const useOpen = () => useAppStore((state) => state.open)
export const useValue = () => useAppStore((state) => state.value)
export const useRouteSwitchDialog = () => useAppStore((state) => state.routeSwitchDialog)
export const useShowIntroScreen = () => useAppStore((state) => state.showIntroScreen)
export const useActiveAccordionItem = () => useAppStore((state) => state.activeAccordionItem)
export const useLoadingProviderId = () => useAppStore((state) => state.loadingProviderId)
export const useSendingPOIs = () => useAppStore((state) => state.sendingPOIs)
export const useSetOpen = () => useAppStore((state) => state.setOpen)
export const useSetValue = () => useAppStore((state) => state.setValue)
export const useSetRouteSwitchDialog = () => useAppStore((state) => state.setRouteSwitchDialog)
export const useSetShowIntroScreen = () => useAppStore((state) => state.setShowIntroScreen)
export const useSetActiveAccordionItem = () => useAppStore((state) => state.setActiveAccordionItem)
export const useSetLoadingProviderId = () => useAppStore((state) => state.setLoadingProviderId)
export const useSetSendingPOIs = () => useAppStore((state) => state.setSendingPOIs)

export const useUI = () => {
  const open = useOpen()
  const value = useValue()
  const routeSwitchDialog = useRouteSwitchDialog()
  const showIntroScreen = useShowIntroScreen()
  const activeAccordionItem = useActiveAccordionItem()
  const loadingProviderId = useLoadingProviderId()
  const sendingPOIs = useSendingPOIs()
  const setOpen = useSetOpen()
  const setValue = useSetValue()
  const setRouteSwitchDialog = useSetRouteSwitchDialog()
  const setShowIntroScreen = useSetShowIntroScreen()
  const setActiveAccordionItem = useSetActiveAccordionItem()
  const setLoadingProviderId = useSetLoadingProviderId()
  const setSendingPOIs = useSetSendingPOIs()
  
  return {
    open,
    value,
    routeSwitchDialog,
    showIntroScreen,
    activeAccordionItem,
    loadingProviderId,
    sendingPOIs,
    setOpen,
    setValue,
    setRouteSwitchDialog,
    setShowIntroScreen,
    setActiveAccordionItem,
    setLoadingProviderId,
    setSendingPOIs,
  }
}

// Store reset selector
export const useResetStore = () => useAppStore((state) => state.resetUserData)
