import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Mountain, ChevronUp, ChevronDown, HelpCircle, ListTodo, Link } from 'lucide-react'
import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { cn, getCookie } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { POIProvider, POISearchParams } from '@/lib/poi-providers'
import { getEnabledProviders } from '@/lib/provider-registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { AuthHeader } from '@/components/AuthHeader'
import { IntroScreen } from '@/components/IntroScreen'

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
  const [authenticated, setAuthenticated] = useState(false)
  // Read route color from CSS variable so it can be themed via CSS
  const [routeColor, setRouteColor] = useState<string>('#fa6400')

  useEffect(() => {
    try {
      const cs = getComputedStyle(document.documentElement)
      const v = cs.getPropertyValue('--route-color')?.trim()
      if (v) setRouteColor(v)
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [])
  const [routes, setRoutes] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const [markers, setMarkers] = useState<any[]>([])
  const [elevationData, setElevationData] = useState<any[]>([])
  const [showElevation, setShowElevation] = useState(false)
  const [markerStates, setMarkerStates] = useState<{[key: string]: 'suggested' | 'selected' | 'existing'}>({}) // Track marker states by POI name+coordinates
  const markerStatesRef = useRef<{[key: string]: 'suggested' | 'selected' | 'existing'}>({}) // Ref to current marker states
  const [selectedMarker, setSelectedMarker] = useState<any>(null) // For InfoWindow
  const [routeSwitchDialog, setRouteSwitchDialog] = useState<{show: boolean, newRoute: any, currentRouteName: string, selectedCount: number}>({show: false, newRoute: null, currentRouteName: '', selectedCount: 0})
  const [mapCenter, setMapCenter] = useState({lat: 39.5, lng: -98.35})
  const [mapZoom, setMapZoom] = useState(4)
  const [routePath, setRoutePath] = useState<any[]>([])
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('')
  const [googleMapsApiKeyLoaded, setGoogleMapsApiKeyLoaded] = useState<boolean>(false)
  const mapInstanceRef = useRef<any>(null)
  const [chartHoverPosition, setChartHoverPosition] = useState<{lat: number, lng: number} | null>(null)
  const [showIntroScreen, setShowIntroScreen] = useState(false)
  const [routeFullyLoaded, setRouteFullyLoaded] = useState(false)
  const [poiProviders, setPOIProviders] = useState<POIProvider[]>([])
  const [activeAccordionItem, setActiveAccordionItem] = useState<string>('')

  // Keep ref in sync with state
  useEffect(() => {
    markerStatesRef.current = markerStates
  }, [markerStates])

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
  }, [])

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
  }, [])

  // Check if intro screen should be shown on mount
  useEffect(() => {
    const dismissed = getCookie('intro-screen-dismissed')
    if (!dismissed) {
      setShowIntroScreen(true)
    }
  }, [])

  // Chart configuration for elevation profile
  const chartConfig = {
    elevation: {
      label: "Elevation",
  color: "var(--route-color)",
    },
  } satisfies ChartConfig

  // Custom tooltip for elevation chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm text-popover-foreground">{`Distance: ${Number(label).toFixed(1)} km`}</p>
          <p className="text-sm text-muted-foreground">{`Elevation: ${Math.round(data.elevation)} m`}</p>
        </div>
      )
    }
    return null
  }

  // Helper: get human-readable POI type name
  function getPOITypeName(poiType: string): string {
    return POI_TYPE_NAMES[poiType] || poiType || 'Unknown'
  }

  // Helper: format distance (meters -> km) and elevation_gain (meters) from RWGPS route object
  function formatRouteMetrics(route: any) {
    if (!route || typeof route !== 'object') return { distanceText: null, elevationText: null }
    const distMeters = route.distance
    const elevMeters = route.elevation_gain
    const distanceText = Number.isFinite(distMeters) ? `${(distMeters / 1000).toFixed(1)} km` : null
    const elevationText = Number.isFinite(elevMeters) ? `${Math.round(elevMeters)} m` : null
    return { distanceText, elevationText }
  }

  // Helper: generate unique key for POI
  function getMarkerKey(poi: any) {
    return `${poi.name}_${poi.lat}_${poi.lng}`
  }

  // Helper: get marker icon based on state
  function getMarkerIcon(state: 'suggested' | 'selected' | 'existing') {
    if (state === 'existing') {
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#6b7280" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(28, 28),
        anchor: new window.google.maps.Point(14, 28)
      }
    } else if (state === 'selected') {
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#22c55e" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32)
      }
    } else {
        return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${routeColor}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32)
      }
    }
  }

  // Helper: get current route name
  function getCurrentRouteName() {
    if (!selectedRouteId) return ''
    const currentRoute = routes.find(r => r.id.toString() === selectedRouteId)
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
        setValue(selectedRouteId || '')
        break
        
      case 'keep-points':
        // Switch route but keep the selected POIs (they'll become orphaned but still selected)
        await showRoute(dialog.newRoute.id)
        break
        
      case 'clear-points':
        // Clear all markers and switch to new route
        setMarkers([])
        setMarkerStates({})
        setSelectedMarker(null)
        await showRoute(dialog.newRoute.id)
        break
    }
  }
  function updateMarkerState(markerKey: string, newState: 'suggested' | 'selected' | 'existing') {
    // Don't allow changing state of existing POIs
    if (markerStates[markerKey] === 'existing') {
      return
    }
    setMarkerStates(prev => ({
      ...prev,
      [markerKey]: newState
    }))
  }

  // Updated marker click handler for React approach
  const handleMarkerClick = (poi: any) => {
    setSelectedMarker(poi)
  }

  // Helper function to format URL for display
  const formatURLForDisplay = (url: string): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const maxLength = 40;
      
      if (url.length <= maxLength) {
        return url;
      }
      
      // Show domain and crop the rest
      const pathAndQuery = urlObj.pathname + urlObj.search;
      const remaining = maxLength - domain.length - 3; // 3 for "..."
      
      if (pathAndQuery.length > remaining) {
        return domain + pathAndQuery.slice(0, remaining) + '...';
      }
      
      return domain + pathAndQuery;
    } catch (e) {
      // If URL parsing fails, just truncate
      return url.length > 40 ? url.slice(0, 37) + '...' : url;
    }
  }

  // Custom Polyline component using useMap hook
  const RoutePolyline = ({ path }: { path: any[] }) => {
    const map = useMap()
    
    useEffect(() => {
      // Store map reference for use in showRoute
      mapInstanceRef.current = map
    }, [map])
    
    useEffect(() => {
      if (!map || !path || path.length === 0) return
      
  const polyline = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
  strokeColor: routeColor,
        strokeWeight: 4,
        strokeOpacity: 0.8
      })
      
      polyline.setMap(map)
      
      return () => {
        polyline.setMap(null)
      }
    }, [map, path])
    
    return null
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
    } else {
      console.log('[fetchAuthState] User not authenticated, clearing routes')
      setRoutes([])
    }
  }

  useEffect(() => {
    fetchAuthState()
  }, [])

  async function showRoute(id: any){
    console.log('[showRoute] Starting with id:', id, 'type:', typeof id)
    
    // Set the selected route ID immediately and reset loaded state
    setSelectedRouteId(id.toString())
    setRouteFullyLoaded(false)
    
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
      
      // Add existing POIs to markers and set their state to 'existing'
      setMarkers(prev => [...prev, ...existingPOIsForMap])
      
      // Set marker states for existing POIs
      const existingMarkerStates: {[key: string]: 'existing'} = {}
      existingPOIsForMap.forEach((poi: any) => {
        const markerKey = getMarkerKey(poi)
        existingMarkerStates[markerKey] = 'existing'
      })
      
      setMarkerStates(prev => ({ ...prev, ...existingMarkerStates }))
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
    setMarkers(prev => prev.filter(poi => {
      const markerKey = getMarkerKey(poi)
      const state = markerStates[markerKey]
      // Keep existing POIs and selected POIs, only remove suggested ones
      return state === 'existing' || state === 'selected'
    }))
    
    // Remove marker states for suggested POIs only
    setMarkerStates(prev => {
      const newStates: {[key: string]: 'suggested' | 'selected' | 'existing'} = {}
      Object.entries(prev).forEach(([key, state]) => {
        if (state === 'existing' || state === 'selected') {
          newStates[key] = state
        }
        // Don't include 'suggested' states - effectively removes them
      })
      return newStates
    })
    
    setSelectedMarker(null)
    
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
                <div className="p-2">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {value ? routes.find(r => r.id.toString() === value)?.name || "Route not found" : "Select route..."}
                        </span>
                        <ChevronsUpDown className="opacity-50 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Search route..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No route found.</CommandEmpty>
                          <CommandGroup>
                            {routes.map((route) => (
                              <CommandItem
                                key={route.id}
                                value={route.id.toString()}
                                keywords={[route.name]}
                                onSelect={(currentValue: string) => {
                                  console.log('[Route Selection] onSelect triggered with ID:', currentValue)
                                  console.log('[Route Selection] Current value state:', value)
                                  console.log('[Route Selection] Available routes:', routes.length, routes.map(r => ({ id: r.id, name: r.name })))
                                  
                                  // Use the route ID directly
                                  const selectedRoute = routes.find(r => r.id.toString() === currentValue)
                                  if (selectedRoute) {
                                    setValue(currentValue === value ? "" : currentValue)
                                    setOpen(false)
                                    if (currentValue !== value) {
                                      console.log('[Route Selection] Found route:', selectedRoute)
                                      console.log('[Route Selection] Calling handleRouteSwitch with route:', selectedRoute.name)
                                      handleRouteSwitch(selectedRoute)
                                    } else {
                                      console.log('[Route Selection] Clearing route selection')
                                      setSelectedRouteId(null)
                                      setElevationData([])
                                      setShowElevation(false)
                                    }
                                  } else {
                                    console.warn('[Route Selection] No route found for ID:', currentValue)
                                  }
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">{route.name}</div>
                                  {(() => {
                                    const { distanceText, elevationText } = formatRouteMetrics(route)
                                    if (!distanceText && !elevationText) return null
                                    return (
                                      <div className="text-xs text-muted-foreground">
                                        {distanceText && <span className="mr-2">{distanceText}</span>}
                                        {elevationText && <span>{elevationText}</span>}
                                      </div>
                                    )
                                  })()}
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4 flex-shrink-0",
                                    selectedRouteId === route.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          
          <SidebarGroup>
            <SidebarGroupLabel>Search POIs along route</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2 space-y-2">
                {poiProviders.length > 0 ? (
                  <>
                    <Accordion 
                      type="single" 
                      collapsible 
                      value={activeAccordionItem}
                      onValueChange={setActiveAccordionItem}
                    >
                      {poiProviders.map((provider) => {
                        const SearchForm = provider.getSearchFormComponent();
                        const providerContext = { routePath, mapBounds: mapInstanceRef.current?.getBounds() };
                        const isEnabled = provider.isEnabled(providerContext);
                        
                        return (
                          <AccordionItem key={provider.id} value={provider.id}>
                            <AccordionTrigger className="text-sm">
                              {provider.name}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  {provider.description}
                                </p>
                                <SearchForm 
                                  onSearch={(params) => handlePOISearch(provider, params)}
                                  disabled={!isEnabled}
                                />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                    <div className="pt-2">
                      <Button onClick={clearMarkers} variant="outline" size="sm" className="w-full">
                        Clear All POIs
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading POI providers...</div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          {(() => {
            const selectedCount = Object.values(markerStates).filter(state => state === 'selected').length
            return selectedCount > 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>{selectedCount} new point{selectedCount !== 1 ? 's' : ''}</span>
                <Button 
                  onClick={sendPOIsToRideWithGPS} 
                  size="sm" 
                  className="ml-2"
                  disabled={!selectedRouteId}
                >
                  Send to RideWithGPS
                </Button>
              </div>
            ) : null
          })()}
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
              <div className="relative w-full h-full">
                {googleMapsApiKey && (
                  <APIProvider apiKey={googleMapsApiKey} libraries={['geometry', 'places']}>
                    <Map
                      defaultCenter={mapCenter}
                      defaultZoom={mapZoom}
                      mapTypeId="roadmap"
                      style={{ width: '100%', height: '100%' }}
                      onCameraChanged={(event) => {
                        setMapCenter(event.detail.center)
                        setMapZoom(event.detail.zoom)
                      }}
                    >
                    {/* Route Polyline */}
                    {routePath.length > 0 && <RoutePolyline path={routePath} />}
                  
                  {/* Chart hover position marker */}
                  {chartHoverPosition && (
                    <Marker
                      position={chartHoverPosition}
                      icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${routeColor}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        `),
                        scaledSize: new window.google.maps.Size(16, 16),
                        anchor: new window.google.maps.Point(8, 8)
                      }}
                    />
                  )}
                  
                  {/* POI Markers */}
                  {markers.map((poi) => {
                    const markerKey = getMarkerKey(poi)
                    const markerState = markerStates[markerKey] || 'suggested'
                    
                    return (
                      <Marker
                        key={markerKey}
                        position={{ lat: poi.lat, lng: poi.lng }}
                        title={poi.name}
                        icon={getMarkerIcon(markerState)}
                        onClick={() => handleMarkerClick(poi)}
                      />
                    )
                  })}
                  
                  {/* Info Window for selected marker */}
                  {selectedMarker && (
                    <InfoWindow
                      position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <h3 className="font-bold text-sm mb-2">{selectedMarker.name}</h3>
                        <div className="space-y-2">
                          {/* POI Type */}
                          {selectedMarker.poi_type_name && (
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">Type:</span> {getPOITypeName(selectedMarker.poi_type_name)}
                            </div>
                          )}
                          
                          {/* Description */}
                          {selectedMarker.description && (
                            <div className="text-xs text-gray-600">
                              <span className="font-semibold">Description:</span> {selectedMarker.description}
                            </div>
                          )}
                          
                          {/* URL with icon and cropped display */}
                          {selectedMarker.url && (
                            <a 
                              href={selectedMarker.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                              title={selectedMarker.url}
                            >
                              <Link className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{formatURLForDisplay(selectedMarker.url)}</span>
                            </a>
                          )}
                          
                          <div>
                            {(() => {
                              const markerKey = getMarkerKey(selectedMarker)
                              const state = markerStates[markerKey] || 'suggested'
                              
                              if (state === 'existing') {
                                return (
                                  <div className="text-xs text-gray-500 italic mt-2">
                                    Existing POI
                                  </div>
                                )
                              } else if (state === 'suggested') {
                                return (
                                  <button
                                    onClick={() => updateMarkerState(markerKey, 'selected')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium mt-2"
                                  >
                                    Keep
                                  </button>
                                )
                              } else {
                                return (
                                  <button
                                    onClick={() => updateMarkerState(markerKey, 'suggested')}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium mt-2"
                                  >
                                    Remove
                                  </button>
                                )
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                    </Map>
                  </APIProvider>
                )}
                
                {/* Overlay when no route is selected or route is not fully loaded */}
                {(!selectedRouteId || !routeFullyLoaded) && (
                  <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
                    <div className="text-center space-y-4">
                      <ListTodo className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {!selectedRouteId 
                          ? "To get started, log in to RideWithGPS and select a route"
                          : "Loading route..."
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
            <Collapsible open={showElevation} onOpenChange={setShowElevation}>
              <CollapsibleContent className="border-t">
                <Card className="rounded-none border-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Elevation Profile</CardTitle>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {showElevation ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {elevationData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart 
                            data={elevationData}
                            onMouseMove={handleChartMouseMove}
                            onMouseLeave={handleChartMouseLeave}
                          >
                            <XAxis 
                              dataKey="distance" 
                              tickFormatter={(value) => `${Number(value).toFixed(0)}km`}
                              axisLine={false}
                              tickLine={false}
                              className="text-xs"
                            />
                            <YAxis 
                              tickFormatter={(value) => `${Math.round(value)}m`}
                              axisLine={false}
                              tickLine={false}
                              className="text-xs"
                            />
                            <ChartTooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="elevation"
                              stroke={routeColor}
                              fill={routeColor}
                              fillOpacity={0.6}
                              strokeWidth={2}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        No elevation data available for this route
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </SidebarInset>
      <IntroScreen 
        open={showIntroScreen} 
        onOpenChange={setShowIntroScreen} 
      />
      
      {/* Route Switch Confirmation Dialog */}
      {routeSwitchDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Unsaved Points</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have {routeSwitchDialog.selectedCount} point{routeSwitchDialog.selectedCount !== 1 ? 's' : ''} selected for the route "{routeSwitchDialog.currentRouteName}" that you haven't sent to RideWithGPS. What do you want to do?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleRouteSwitchAction('keep-editing')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Keep editing "{routeSwitchDialog.currentRouteName}"
              </button>
              <button
                onClick={() => handleRouteSwitchAction('keep-points')}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Keep points and switch to "{routeSwitchDialog.newRoute?.name}"
              </button>
              <button
                onClick={() => handleRouteSwitchAction('clear-points')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear points and switch to "{routeSwitchDialog.newRoute?.name}"
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
