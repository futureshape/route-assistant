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
import { ScrollArea } from '@/components/ui/scroll-area'
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
    const r = await fetch('/api/session')
    const j = await r.json()
    setAuthenticated(j.authenticated)
    
    if (j.authenticated) {
      const rr = await fetch('/api/routes')
      if (rr.ok) {
        const jj = await rr.json()
        setRoutes(jj.routes || [])
      }
    } else {
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
    clearMarkers()
    const r = await fetch(`/api/route/${id}`)
    if (!r.ok){ alert('Failed to load route'); return }
    const j = await r.json()
    const enc = j.route && j.route.encoded_polyline
    if (!enc){ alert('Route has no encoded_polyline'); return }
    window.lastFetchedEncodedPolyline = enc
    const path = window.google.maps.geometry.encoding.decodePath(enc)
    if (routePolyline){ routePolyline.setMap(null) }
    const pl = new window.google.maps.Polyline({ path, strokeColor:'#007bff', strokeWeight:4 })
    pl.setMap(map)
    setRoutePolyline(pl)
    const bounds = new window.google.maps.LatLngBounds(); path.forEach((p: any)=>bounds.extend(p)); if(map) map.fitBounds(bounds)
    
    // Fetch elevation data
    try {
      const elevResponse = await fetch(`/api/route/${id}/elevation`)
      if (elevResponse.ok) {
        const elevData = await elevResponse.json()
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
        
        console.log('Elevation data loaded:', chartData.length, 'points')
      } else {
        console.warn('Failed to fetch elevation data:', elevResponse.status)
        setElevationData([])
        setTrackPoints([])
      }
    } catch (error) {
      console.error('Failed to fetch elevation data:', error)
      setElevationData([])
      setTrackPoints([])
    }
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

  function clearMarkers(){
    markers.forEach((m: any)=>m.setMap(null)); setMarkers([])
    if (routePolyline) {
      routePolyline.setMap(null)
      setRoutePolyline(null)
    }
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setMap(null)
      hoverMarkerRef.current = null
      setHoverMarker(null)
    }
    setElevationData([])
    setTrackPoints([])
    setShowElevation(false)
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
      const mk = new window.google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map, title: p.name })
      const iw = new window.google.maps.InfoWindow({ content: `<strong>${p.name||'Place'}</strong>${p.googleMapsUri?`<br/><a href=\"${p.googleMapsUri}\" target=\"_blank\">Open in Google Maps</a>`:''}` })
      mk.addListener('click', ()=> iw.open({ map, anchor: mk }))
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
                          {value || "Select route..."}
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
                                value={route.name}
                                onSelect={(currentValue: string) => {
                                  setValue(currentValue === value ? "" : currentValue)
                                  setOpen(false)
                                  if (currentValue !== value) {
                                    const selectedRoute = routes.find(r => r.name === currentValue)
                                    if (selectedRoute) {
                                      setSelectedRouteId(selectedRoute.id.toString())
                                      showRoute(selectedRoute.id)
                                    }
                                  } else {
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
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {results.map((r: any, i: number) => (
                      <div key={i} className="text-sm p-1">
                        {r.name} {r.googleMapsUri && (
                          <a className="text-blue-600 hover:underline ml-1" href={r.googleMapsUri} target="_blank" rel="noreferrer">
                            map
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
