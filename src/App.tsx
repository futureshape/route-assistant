import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Mountain, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { AuthHeader } from '@/components/AuthHeader'

// Google Maps hook
function useGoogleMapsReady() {
  const [ready, setReady] = useState(!!window.google)
  useEffect(() => {
    if (window.google) { setReady(true); return }
    const handler = () => setReady(true)
    window.addEventListener('google-maps-callback', handler)
    return () => window.removeEventListener('google-maps-callback', handler)
  }, [])
  return ready
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    google: any;
    lastFetchedEncodedPolyline: string;
  }
}

export default function App(){
  const mapRef = useRef<HTMLDivElement>(null)
  const hoverMarkerRef = useRef<any>(null)
  const allMarkersRef = useRef<any[]>([])
  const [map, setMap] = useState<any>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [routes, setRoutes] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [routePolyline, setRoutePolyline] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [elevationData, setElevationData] = useState<any[]>([])
  const [showElevation, setShowElevation] = useState(false)
  const [trackPoints, setTrackPoints] = useState<any[]>([])
  const [hoverMarker, setHoverMarker] = useState<any>(null)
  const customOverlayRef = useRef<any>(null)

  const mapsReady = useGoogleMapsReady()

  // Chart configuration for elevation profile
  const chartConfig = {
    elevation: {
      label: "Elevation",
      color: "hsl(var(--chart-1))",
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

  // Helper: format distance (meters -> km) and elevation_gain (meters) from RWGPS route object
  function formatRouteMetrics(route: any) {
    if (!route || typeof route !== 'object') return { distanceText: null, elevationText: null }
    const distMeters = route.distance
    const elevMeters = route.elevation_gain
    const distanceText = Number.isFinite(distMeters) ? `${(distMeters / 1000).toFixed(1)} km` : null
    const elevationText = Number.isFinite(elevMeters) ? `${Math.round(elevMeters)} m` : null
    return { distanceText, elevationText }
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

  useEffect(()=>{
    if (!mapsReady || !mapRef.current || map) return
    const m = new window.google.maps.Map(mapRef.current, { center:{lat:39.5,lng:-98.35}, zoom:4 })
    setMap(m)
  },[mapsReady, mapRef, map])

  async function showRoute(id: any){
    console.log('[showRoute] Starting with id:', id, 'type:', typeof id)
    console.log('[showRoute] Map available:', !!map)
    console.log('[showRoute] Google Maps ready:', !!window.google)
    
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
    
    const enc = j.route && j.route.encoded_polyline
    console.log('[showRoute] Encoded polyline:', enc ? `${enc.slice(0, 50)}...` : 'MISSING')
    
    if (!enc){ 
      console.error('[showRoute] Route has no encoded_polyline')
      alert('Route has no encoded_polyline'); 
      return 
    }
    
    window.lastFetchedEncodedPolyline = enc
    console.log('[showRoute] Decoding polyline...')
    const path = window.google.maps.geometry.encoding.decodePath(enc)
    console.log('[showRoute] Decoded path points:', path.length)
    
    if (routePolyline){ 
      console.log('[showRoute] Removing existing polyline')
      routePolyline.setMap(null) 
    }
    
    console.log('[showRoute] Creating new polyline')
    const pl = new window.google.maps.Polyline({ path, strokeColor:'#007bff', strokeWeight:4 })
    pl.setMap(map)
    setRoutePolyline(pl)
    
    console.log('[showRoute] Fitting map bounds to route')
    const bounds = new window.google.maps.LatLngBounds(); 
    path.forEach((p: any)=>bounds.extend(p)); 
    if(map) map.fitBounds(bounds)
    
    // Fetch elevation data
    try {
      console.log('[showRoute] Fetching elevation data from /api/route/' + id + '/elevation')
      const elevResponse = await fetch(`/api/route/${id}/elevation`)
      console.log('[showRoute] Elevation fetch response status:', elevResponse.status, elevResponse.ok)
      
      if (elevResponse.ok) {
        const elevData = await elevResponse.json()
        console.log('[showRoute] Elevation data received:', elevData)
        
        // Transform elevation data for chart
        const chartData = elevData.elevationData?.map((point: any, index: number) => ({
          distance: Number((point.distance / 1000).toFixed(2)), // Convert to km with 2 decimal places
          elevation: Number(point.elevation.toFixed(1)), // Round elevation to 1 decimal
          distanceM: point.distance, // Keep original distance in meters for tooltip
          index
        })) || []
        
        setElevationData(chartData)
        
        // Store track points for map hover functionality
        // We need to get the full route data with track points
        const fullRouteData = j.route?.track_points || []
        setTrackPoints(fullRouteData)
        
        console.log('[showRoute] Elevation data loaded:', chartData.length, 'points')
        console.log('[showRoute] Track points loaded:', fullRouteData.length, 'points')
      } else {
        console.warn('[showRoute] Failed to fetch elevation data:', elevResponse.status)
        const elevErrorText = await elevResponse.text()
        console.warn('[showRoute] Elevation error response:', elevErrorText)
        setElevationData([])
        setTrackPoints([])
      }
    } catch (error) {
      console.error('[showRoute] Failed to fetch elevation data:', error)
      setElevationData([])
      setTrackPoints([])
    }
    
    console.log('[showRoute] Completed successfully')
  }

  // Handle chart hover to show position on map
  const handleChartMouseMove = (state: any) => {
    if (!state || !state.activePayload || !state.activePayload[0] || !map || !trackPoints.length) {
      // Hide marker if no valid hover state
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.setVisible(false)
      }
      return
    }
    
    const activeData = state.activePayload[0].payload
    const pointIndex = activeData.index
    
    if (pointIndex !== undefined && pointIndex < trackPoints.length) {
      const trackPoint = trackPoints[pointIndex]
      const lat = trackPoint.y // RWGPS uses y for latitude
      const lng = trackPoint.x // RWGPS uses x for longitude
      
      if (lat !== undefined && lng !== undefined) {
        const position = { lat: parseFloat(lat), lng: parseFloat(lng) }
        
        // Create marker if it doesn't exist, otherwise just move it
        if (!hoverMarkerRef.current) {
          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#ff4444',
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 2
            },
            zIndex: 1000
          })
          
          hoverMarkerRef.current = marker
          setHoverMarker(marker)
        } else {
          // Just move the existing marker and make it visible
          hoverMarkerRef.current.setPosition(position)
          hoverMarkerRef.current.setVisible(true)
        }
      }
    } else {
      // Hide marker if point index is invalid
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.setVisible(false)
      }
    }
  }

  const handleChartMouseLeave = () => {
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setVisible(false)
    }
  }

  // Handle marker click to show custom popup
  const handleMarkerClick = (poi: any, marker: any) => {
    // Remove existing overlay if any
    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null)
      customOverlayRef.current = null
    }

    // Create custom overlay
    const overlay = new window.google.maps.OverlayView()
    
    overlay.onAdd = function() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.zIndex = '10000'
      // Ensure the overlay itself captures pointer events
      div.style.pointerEvents = 'auto'
      // Prevent clicks inside the popup from propagating to the map
      div.addEventListener('click', (e) => {
        e.stopPropagation()
      })
      div.innerHTML = `
        <div class="bg-popover border border-border rounded-lg p-4 shadow-lg max-w-xs" style="transform: translateX(-50%) translateY(-100%); margin-bottom: 8px;">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-popover-foreground text-sm mb-1 line-clamp-2">
                ${poi.name || 'Unknown Place'}
              </h3>
              ${poi.googleMapsUri ? `
                <a href="${poi.googleMapsUri}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Open in Google Maps
                </a>
              ` : ''}
            </div>
            <button class="text-muted-foreground hover:text-foreground transition-colors text-xs ml-2 close-popup">
              ✕
            </button>
          </div>
          <div class="absolute top-full left-1/2 transform -translate-x-1/2">
            <div class="border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border"></div>
            <div class="border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-popover absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px"></div>
          </div>
        </div>
      `
      
      // Store reference to div for cleanup
      this.div = div
      
      // Add click handler to close button
      const closeBtn = div.querySelector('.close-popup')
      if (closeBtn) {
        const closeHandler = (e: Event) => {
          console.debug('[Popup] Close button clicked')
          e.preventDefault()
          e.stopPropagation()
          // Force immediate DOM removal so it disappears without requiring a redraw
          if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div)
            this.div = null
          }
          // Also detach overlay from map to run cleanup
          this.setMap(null)
          customOverlayRef.current = null
        }
        closeBtn.addEventListener('click', closeHandler)
        // Store handler reference for cleanup
        this.closeHandler = closeHandler
        this.closeBtn = closeBtn
      }
      
      const panes = this.getPanes()
      // Use floatPane to match InfoWindow behavior and avoid redraw issues
      panes.floatPane.appendChild(div)

      // Close the overlay on any map click outside the popup
      this.mapClickListener = map.addListener('click', () => {
        console.debug('[Popup] Map click close triggered')
        // Remove DOM immediately then detach overlay
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div)
          this.div = null
        }
        this.setMap(null)
        customOverlayRef.current = null
      })
    }
    
    overlay.draw = function() {
      const position = marker.getPosition()
      const projection = this.getProjection()
      const point = projection.fromLatLngToDivPixel(position)
      
      if (point && this.div) {
        // Position the overlay at the top of the map pin (subtract 32px for pin height)
        this.div.style.left = point.x + 'px'
        this.div.style.top = (point.y - 32) + 'px'  // Offset by pin height to align with top
      }
    }
    
    overlay.onRemove = function() {
      console.debug('[Popup] onRemove called')
      // Clean up event listeners
      if (this.closeBtn && this.closeHandler) {
        this.closeBtn.removeEventListener('click', this.closeHandler)
      }
      // Remove map click listener
      if (this.mapClickListener && this.mapClickListener.remove) {
        this.mapClickListener.remove()
      } else if (this.mapClickListener) {
        window.google.maps.event.removeListener(this.mapClickListener)
      }
      
      // Remove DOM element
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div)
        this.div = null
      }
      
      // Clear references
      this.closeBtn = null
      this.closeHandler = null
      this.mapClickListener = null
    }
    
    overlay.setMap(map)
    customOverlayRef.current = overlay
  }

  function clearMarkers(){
    // Clear POI markers we've created via search
    allMarkersRef.current.forEach((m: any) => {
      if (m && m.setMap) {
        m.setMap(null)
      }
    })
    allMarkersRef.current = []
    
    setMarkers([])
    setResults([])
    
    // Clear popup overlay
    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null)
      customOverlayRef.current = null
    }
    // Intentionally do not clear the route polyline or elevation state here.
    // The route should remain visible until a different route is selected.
  }

  async function searchPOIs(){
    if (!routePolyline){ alert('Please show a route first'); return }
    const q = query.trim(); if (!q){ alert('Enter a search term'); return }
    const encoded = window.lastFetchedEncodedPolyline || null
    const payload = { textQuery: q, encodedPolyline: encoded }
    const r = await fetch('/api/search-along-route', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    if (!r.ok){ const t = await r.text(); alert('Search failed: ' + t); return }
    const j = await r.json()
    const places = j.places || []
    const norm = places.map((p: any)=>{
      const loc = p.location || p.geoCode?.location || p.geometry?.location || p.center || {}
      const lat = loc.latitude ?? loc.lat ?? loc.latLng?.latitude
      const lng = loc.longitude ?? loc.lng ?? loc.latLng?.longitude
      return { name: p.displayName?.text || p.name || '', googleMapsUri: p.googleMapsUri, lat: parseFloat(lat), lng: parseFloat(lng) }
    }).filter((p: any)=> Number.isFinite(p.lat) && Number.isFinite(p.lng))
    setResults(norm)
    // place markers
    const mks = norm.map((p: any)=>{
      const mk = new window.google.maps.Marker({ 
        position: { lat: p.lat, lng: p.lng }, 
        map, 
        title: p.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      })
      
      // Use our custom popup instead of InfoWindow
      mk.addListener('click', () => handleMarkerClick(p, mk))
      
      // Track this marker in our comprehensive list
      allMarkersRef.current.push(mk)
      
      return mk
    })
    setMarkers(mks)
    if (mks.length && map){ 
      const b = new window.google.maps.LatLngBounds(); 
      mks.forEach((m: any)=>b.extend(m.getPosition())); 
      if (routePolyline){ routePolyline.getPath().forEach((p: any)=>b.extend(p)) } 
      map.fitBounds(b) 
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
                                onSelect={(currentValue: string) => {
                                  console.log('[Route Selection] onSelect triggered with ID:', currentValue)
                                  console.log('[Route Selection] Current value state:', value)
                                  console.log('[Route Selection] Available routes:', routes.length, routes.map(r => ({ id: r.id, name: r.name })))
                                  
                                  setValue(currentValue === value ? "" : currentValue)
                                  setOpen(false)
                                  if (currentValue !== value) {
                                    const selectedRoute = routes.find(r => r.id.toString() === currentValue)
                                    console.log('[Route Selection] Found route:', selectedRoute)
                                    if (selectedRoute) {
                                      console.log('[Route Selection] Setting selectedRouteId to:', selectedRoute.id.toString())
                                      setSelectedRouteId(selectedRoute.id.toString())
                                      console.log('[Route Selection] Calling showRoute with id:', selectedRoute.id)
                                      showRoute(selectedRoute.id)
                                    } else {
                                      console.warn('[Route Selection] No route found for ID:', currentValue)
                                      console.warn('[Route Selection] Available route IDs:', routes.map(r => r.id.toString()))
                                    }
                                  } else {
                                    console.log('[Route Selection] Clearing route selection')
                                    setSelectedRouteId(null)
                                    setElevationData([])
                                    setTrackPoints([])
                                    setShowElevation(false)
                                    if (hoverMarkerRef.current) {
                                      hoverMarkerRef.current.setMap(null)
                                      hoverMarkerRef.current = null
                                      setHoverMarker(null)
                                    }
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
              <div className="space-y-2 p-2">
                <Input 
                  value={query} 
                  onChange={(e)=>setQuery(e.target.value)} 
                  placeholder="e.g., coffee, restroom, bike shop"
                />
                <div className="flex gap-2">
                  <Button onClick={searchPOIs} size="sm">Search POIs</Button>
                  <Button onClick={clearMarkers} variant="outline" size="sm">Clear</Button>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
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
        </header>
        <div className="flex flex-col flex-1">
          <div className="flex-1 relative">
            <div id="map" ref={mapRef} className="absolute inset-0" />
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
                              stroke="hsl(var(--chart-1))"
                              fill="hsl(var(--chart-1))"
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
    </SidebarProvider>
  )
}
