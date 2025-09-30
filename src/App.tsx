import { useEffect, useRef } from 'react'
import { Mountain, HelpCircle } from 'lucide-react'
import { getCookie } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { POIProvider, POISearchParams } from '@/lib/poi-providers'
import { getEnabledProviders } from '@/lib/provider-registry'
import { AuthHeader } from '@/components/AuthHeader'
import { IntroScreen } from '@/components/IntroScreen'
import { RouteSelector, RouteSwitchDialog } from '@/features/routes'
import { MapContainer } from '@/features/map'
import { ElevationChart } from '@/features/elevation'
import { POISearch, POISummary } from '@/features/poi'
import { useAuth, useRoutes, usePOI, useMap, useElevation, useUI } from '@/store/selectors'

// Extend window interface for TypeScript
declare global {
  interface Window {
    lastFetchedEncodedPolyline: string;
  }
}

// Mapping of RideWithGPS POI types to human-readable names
const POI_TYPE_NAMES: Record<string, string> = {
  camping: 'Camping',
  lodging: 'Lodging',
  parking: 'Parking',
  food: 'Food',
  viewpoint: 'Viewpoint',
  restroom: 'Restroom',
  generic: 'Generic',
  aid_station: 'Aid Station',
  bar: 'Bar',
  bike_shop: 'Bike Shop',
  bike_parking: 'Bike Parking',
  convenience_store: 'Convenience Store',
  first_aid: 'First Aid',
  hospital: 'Hospital',
  rest_stop: 'Rest Stop',
  trailhead: 'Trailhead',
  geocache: 'Geocache',
  water: 'Water',
  control: 'Control',
  winery: 'Winery',
  start: 'Start',
  stop: 'Stop',
  finish: 'Finish',
  atm: 'ATM',
  caution: 'Caution',
  coffee: 'Coffee',
  ferry: 'Ferry',
  gas: 'Gas Station',
  library: 'Library',
  monument: 'Monument',
  park: 'Park',
  segment_start: 'Segment Start',
  segment_end: 'Segment End',
  shopping: 'Shopping',
  shower: 'Shower',
  summit: 'Summit',
  swimming: 'Swimming',
  transit: 'Transit Center',
  bikeshare: 'Bike Share'
};

export default function App(){
  // Use selector hooks for cleaner, less verbose state access
  const { authenticated, setAuthenticated } = useAuth()
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
    selectRoute,
    clearRouteSelection,
  } = useRoutes()
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
    clearAllPOIs,
    clearSuggestedPOIs,
    addExistingPOIs,
  } = usePOI()
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
  const {
    elevationData,
    showElevation,
    setElevationData,
    setShowElevation,
  } = useElevation()
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

  // Read route color from CSS variable so it can be themed via CSS
  useEffect(() => {
    try {
      const cs = getComputedStyle(document.documentElement)
      const v = cs.getPropertyValue('--route-color')?.trim()
      if (v) setRouteColor(v)
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [setRouteColor])

  const mapInstanceRef = useRef<any>(null)

  // Fetch Google Maps API key on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps-key')
        const data = await response.json()
        setGoogleMapsApiKey(data.apiKey || '')
        setGoogleMapsApiKeyLoaded(true)
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error)
        setGoogleMapsApiKeyLoaded(true)
      }
    }
    fetchApiKey()
  }, [setGoogleMapsApiKey, setGoogleMapsApiKeyLoaded])

  // Load enabled POI providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await getEnabledProviders()
        setPOIProviders(providers)
        console.log('Loaded POI providers:', providers.map(p => p.id))
      } catch (error) {
        console.error('Failed to load POI providers:', error)
      }
    }
    loadProviders()
  }, [setPOIProviders])

  // Check if intro screen should be shown on mount
  useEffect(() => {
    const dismissed = getCookie('intro-screen-dismissed')
    if (!dismissed) {
      setShowIntroScreen(true)
    }
  }, [setShowIntroScreen])

  // Helper: generate unique key for POI
  function getMarkerKey(poi: any) {
    return `${poi.name}_${poi.lat}_${poi.lng}`
  }

  // Helper: get current route name
  function getCurrentRouteName() {
    if (!selectedRouteId) return ''
    const currentRoute = routes.find(r => r.id === selectedRouteId)
    return currentRoute?.name || 'Unknown Route'
  }

  // Helper: handle route switching with confirmation if needed
  async function handleRouteSwitch(newRoute: any) {
    const selectedCount = Object.values(markerStates).filter(state => state === 'selected').length
    
    if (selectedCount > 0 && selectedRouteId) {
      // Show confirmation dialog
      setRouteSwitchDialog({
        show: true,
        newRoute,
        currentRouteName: getCurrentRouteName(),
        selectedCount
      })
    } else {
      // No uncommitted POIs, switch directly
      await showRoute(newRoute.id)
    }
  }

  // Handle route switch dialog actions
  const handleRouteSwitchAction = async (action: 'keep-editing' | 'keep-points' | 'clear-points') => {
    const dialog = routeSwitchDialog
    setRouteSwitchDialog({show: false, newRoute: null, currentRouteName: '', selectedCount: 0})
    
    switch (action) {
      case 'keep-editing':
        // Reset dropdown to current route and stay on current route
        setValue(selectedRouteId?.toString() || '')
        break
        
      case 'keep-points':
        // Switch route but keep the selected POIs (they'll become orphaned but still selected)
        if (dialog.newRoute) {
          await showRoute(dialog.newRoute.id)
        }
        break
        
      case 'clear-points':
        // Clear all markers and switch to new route
        clearAllPOIs()
        if (dialog.newRoute) {
          await showRoute(dialog.newRoute.id)
        }
        break
    }
  }

  // Updated marker click handler for React approach
  const handleMarkerClick = (poi: any) => {
    setSelectedMarker(poi)
  }

  const handleAuthChange = () => {
    // Re-fetch session and routes
    fetchAuthState()
  }

  const fetchAuthState = async () => {
    console.log('[fetchAuthState] Starting authentication check')
    const r = await fetch('/api/session')
    console.log('[fetchAuthState] Session response status:', r.status, r.ok)
    const j = await r.json()
    console.log('[fetchAuthState] Session data:', j)
    setAuthenticated(j.authenticated)
    
    if (j.authenticated) {
      console.log('[fetchAuthState] User is authenticated, fetching routes')
      setRoutesLoading(true)
      const rr = await fetch('/api/routes')
      console.log('[fetchAuthState] Routes response status:', rr.status, rr.ok)
      if (rr.ok) {
        const jj = await rr.json()
        console.log('[fetchAuthState] Routes data received:', jj)
        const routesArray = jj.routes || []
        console.log('[fetchAuthState] Setting routes array:', routesArray.length, 'routes')
        setRoutes(routesArray)
      } else {
        console.error('[fetchAuthState] Failed to fetch routes')
        const routesErrorText = await rr.text()
        console.error('[fetchAuthState] Routes error response:', routesErrorText)
      }
      setRoutesLoading(false)
    } else {
      console.log('[fetchAuthState] User not authenticated, clearing routes')
      setRoutes([])
      setRoutesLoading(false)
    }
  }

  useEffect(() => {
    fetchAuthState()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function showRoute(id: any){
    console.log('[showRoute] Starting with id:', id, 'type:', typeof id)
    
    // Set the selected route ID immediately and reset loaded state
    selectRoute(id)
    
    clearMarkers()
    
    console.log('[showRoute] Fetching route data from /api/route/' + id)
    const r = await fetch(`/api/route/${id}`)
    console.log('[showRoute] Route fetch response status:', r.status, r.ok)
    
    if (!r.ok){ 
      console.error('[showRoute] Failed to load route, status:', r.status)
      const errorText = await r.text()
      console.error('[showRoute] Error response:', errorText)
      alert('Failed to load route'); 
      return 
    }
    
    const j = await r.json()
    console.log('[showRoute] Route data received:', j)
    
    // Process elevation data from the unified response
    if (j.elevationData && j.elevationData.length > 0) {
      console.log('[showRoute] Processing elevation data with coordinates')
      const chartData = j.elevationData.map((point: any, index: number) => ({
        distance: Number((point.distance / 1000).toFixed(2)), // Convert to km
        elevation: Number(point.elevation.toFixed(1)), // Round elevation
        lat: point.lat, // Direct coordinate from backend
        lng: point.lng, // Direct coordinate from backend
        index
      }))
      setElevationData(chartData)
      console.log('[showRoute] Elevation data loaded:', chartData.length, 'points')
    } else {
      setElevationData([])
    }
    
    // Process existing POIs from the route
    if (j.existingPOIs && j.existingPOIs.length > 0) {
      console.log('[showRoute] Processing existing POIs:', j.existingPOIs.length)
      const existingPOIsForMap = j.existingPOIs.map((poi: any) => ({
        name: poi.name || 'Unnamed POI',
        lat: poi.lat,
        lng: poi.lng,
        poi_type_name: poi.poi_type_name || 'generic',
        description: poi.description || '',
        url: poi.url || '',
        poiSource: 'existing'
      }))
      
      // Add existing POIs to markers with their state set to 'existing'
      addExistingPOIs(existingPOIsForMap, getMarkerKey)
      console.log('[showRoute] Existing POIs loaded:', existingPOIsForMap.length)
    }
    
    const enc = j.route && j.route.encoded_polyline
    console.log('[showRoute] Encoded polyline:', enc ? `${enc.slice(0, 50)}...` : 'MISSING')
    
    if (!enc){ 
      console.error('[showRoute] Route has no encoded_polyline')
      alert('Route has no encoded_polyline'); 
      return 
    }
    
    window.lastFetchedEncodedPolyline = enc
    console.log('[showRoute] Decoding polyline...')
    
    // Decode polyline using Google Maps geometry library
    if (window.google && window.google.maps && window.google.maps.geometry) {
      const path = window.google.maps.geometry.encoding.decodePath(enc)
      console.log('[showRoute] Decoded path points:', path.length)
      
      // Convert to React-friendly format
      const routeCoordinates = path.map((point: any) => ({
        lat: point.lat(),
        lng: point.lng()
      }))
      
      setRoutePath(routeCoordinates)
      
      // Fit map bounds to the route after a short delay to ensure map is ready
      setTimeout(() => {
        if (mapInstanceRef.current && routeCoordinates.length > 0) {
          console.log('[showRoute] Fitting bounds for route with', routeCoordinates.length, 'points')
          const bounds = new window.google.maps.LatLngBounds()
          routeCoordinates.forEach(coord => bounds.extend(coord))
          mapInstanceRef.current.fitBounds(bounds, 50)
          
          // Mark route as fully loaded after bounds are set
          setTimeout(() => {
            setRouteFullyLoaded(true)
            console.log('[showRoute] Route fully loaded and displayed')
          }, 100)
        }
      }, 100)
    }
    
    console.log('[showRoute] Completed successfully')
  }

  // Handle chart hover to show position on map
  const handleChartMouseMove = (state: any) => {
    if (state && state.activePayload && state.activePayload[0]) {
      const dataPoint = state.activePayload[0].payload
      
      // The elevation data now includes lat/lng coordinates directly
      if (dataPoint.lat && dataPoint.lng) {
        setChartHoverPosition({ lat: dataPoint.lat, lng: dataPoint.lng })
      }
    }
  }

  const handleChartMouseLeave = () => {
    setChartHoverPosition(null)
  }

  function clearMarkers(){
    // Only clear suggested POI markers - keep existing and selected ones
    clearSuggestedPOIs()
    
    // Intentionally do not clear the route path or elevation state here.
    // The route should remain visible until a different route is selected.
  }

  // Handle POI search using provider system
  async function handlePOISearch(provider: POIProvider, params: POISearchParams) {
    try {
      // Prepare enhanced search parameters based on provider needs
      const enhancedParams = await prepareSearchParams(provider, params);
      
      console.log(`[POI Search] Using provider: ${provider.name}`, enhancedParams);
      const results = await provider.searchPOIs(enhancedParams);
      
      // Generic result handling - display POIs on map
      displayPOIResults(results);
      
      console.log(`[POI Search] Found ${results.length} POIs from ${provider.name}`);
    } catch (error) {
      console.error('POI search failed:', error);
      alert(`POI search failed: ${error}`);
    }
  }

  // Prepare search parameters with context data each provider might need
  async function prepareSearchParams(_provider: POIProvider, params: POISearchParams): Promise<POISearchParams> {
    const enhancedParams = { ...params };
    
    // Add route data if available (for Google Maps provider)
    if (routePath.length > 0) {
      enhancedParams.encodedPolyline = window.lastFetchedEncodedPolyline || undefined;
    }
    
    // Add map bounds if map is available (for Mock provider)
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      if (bounds) {
        enhancedParams.mapBounds = {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng()
        };
      }
    }
    
    return enhancedParams;
  }

  // Generic function to display POI results on the map
  function displayPOIResults(results: any[]) {
    // First remove any existing suggested POIs from previous searches
    setMarkers(prev => prev.filter(poi => {
      const markerKey = getMarkerKey(poi)
      const state = markerStates[markerKey]
      // Keep existing POIs and selected POIs, remove old suggested ones
      return state === 'existing' || state === 'selected'
    }))
    
    // Remove marker states for old suggested POIs
    setMarkerStates(prev => {
      const newStates: {[key: string]: 'suggested' | 'selected' | 'existing'} = {}
      Object.entries(prev).forEach(([key, state]) => {
        if (state === 'existing' || state === 'selected') {
          newStates[key] = state
        }
      })
      return newStates
    })
    
    // Add new search results to markers
    setMarkers(prev => [...prev, ...results])
  }

  async function sendPOIsToRideWithGPS(){
    if (!selectedRouteId) {
      alert('Please select a route first')
      return
    }
    
    // Get selected POIs (exclude existing POIs)
    const selectedPOIs = markers.filter(poi => {
      const markerKey = getMarkerKey(poi)
      const state = markerStates[markerKey]
      return state === 'selected' && poi.poiSource !== 'existing'
    })
    
    if (selectedPOIs.length === 0) {
      alert('No new POIs selected')
      return
    }
    
    try {
      const response = await fetch(`/api/route/${selectedRouteId}/pois`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pois: selectedPOIs })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        alert(`Failed to send POIs to RideWithGPS: ${errorText}`)
        return
      }
      
      alert(`Successfully sent ${selectedPOIs.length} new POI(s) to RideWithGPS!`)
      
      // Reload the route to show updated POIs as "existing"
      console.log('[sendPOIsToRideWithGPS] Reloading route to show updated POIs')
      await showRoute(selectedRouteId)
      
    } catch (error) {
      console.error('Error sending POIs:', error)
      alert('An error occurred while sending POIs to RideWithGPS')
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AuthHeader 
            authenticated={authenticated} 
            onAuthChange={handleAuthChange} 
          />
        </SidebarHeader>
        <SidebarContent>
          {authenticated && (
            <SidebarGroup>
              <SidebarGroupLabel>Your Routes</SidebarGroupLabel>
              <SidebarGroupContent>
                <RouteSelector
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  value={value}
                  open={open}
                  routesLoading={routesLoading}
                  onOpenChange={setOpen}
                  onValueChange={(newValue) => {
                    if (newValue === "" && value !== "") {
                      // Clearing route selection
                      clearRouteSelection()
                      setElevationData([])
                      setShowElevation(false)
                    }
                    setValue(newValue)
                  }}
                  onRouteSelect={handleRouteSwitch}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          
          <SidebarGroup>
            <SidebarGroupLabel>Search POIs along route</SidebarGroupLabel>
            <SidebarGroupContent>
              <POISearch
                poiProviders={poiProviders}
                activeAccordionItem={activeAccordionItem}
                routePath={routePath}
                mapBounds={mapInstanceRef.current?.getBounds()}
                onAccordionChange={setActiveAccordionItem}
                onPOISearch={handlePOISearch}
                onClearMarkers={clearMarkers}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <POISummary
            selectedCount={Object.values(markerStates).filter(state => state === 'selected').length}
            selectedRouteId={selectedRouteId}
            onSendPOIs={sendPOIsToRideWithGPS}
          />
          {selectedRouteId && elevationData.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowElevation(!showElevation)}
              className="ml-auto"
            >
              <Mountain className="h-4 w-4 mr-2" />
              {showElevation ? 'Hide' : 'Show'} Elevation
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIntroScreen(true)}
            className={selectedRouteId && elevationData.length > 0 ? "ml-2" : "ml-auto"}
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex flex-col flex-1">
          <div className="flex-1 relative">
            {googleMapsApiKeyLoaded ? (
              <MapContainer
                googleMapsApiKey={googleMapsApiKey}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                routePath={routePath}
                routeColor={routeColor}
                markers={markers}
                markerStates={markerStates}
                selectedMarker={selectedMarker}
                chartHoverPosition={chartHoverPosition}
                selectedRouteId={selectedRouteId}
                routeFullyLoaded={routeFullyLoaded}
                poiTypeNames={POI_TYPE_NAMES}
                onCameraChange={(center, zoom) => {
                  setMapCenter(center)
                  setMapZoom(zoom)
                }}
                onMarkerClick={handleMarkerClick}
                onCloseInfoWindow={() => setSelectedMarker(null)}
                onUpdateMarkerState={updateMarkerState}
                getMarkerKey={getMarkerKey}
                mapInstanceRef={mapInstanceRef}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600">Loading Google Maps...</p>
                </div>
              </div>
            )}
          </div>
          
          {selectedRouteId && elevationData.length > 0 && (
            <ElevationChart
              elevationData={elevationData}
              showElevation={showElevation}
              routeColor={routeColor}
              onShowElevationChange={setShowElevation}
              onChartMouseMove={handleChartMouseMove}
              onChartMouseLeave={handleChartMouseLeave}
            />
          )}
        </div>
      </SidebarInset>
      <IntroScreen 
        open={showIntroScreen} 
        onOpenChange={setShowIntroScreen} 
      />
      
      {/* Route Switch Confirmation Dialog */}
      <RouteSwitchDialog
        show={routeSwitchDialog.show}
        newRouteName={routeSwitchDialog.newRoute?.name || ''}
        currentRouteName={routeSwitchDialog.currentRouteName}
        selectedCount={routeSwitchDialog.selectedCount}
        onAction={handleRouteSwitchAction}
      />
    </SidebarProvider>
  )
}
