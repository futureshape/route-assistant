import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [map, setMap] = useState<any>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [routes, setRoutes] = useState<any[]>([])
  const [routePolyline, setRoutePolyline] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  const mapsReady = useGoogleMapsReady()

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
  }

  function clearMarkers(){
    markers.forEach((m: any)=>m.setMap(null)); setMarkers([])
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
                <ScrollArea className="h-48">
                  <div className="space-y-2 p-2">
                    {routes.map((rt: any) => (
                      <div key={rt.id} className="text-sm">
                        <div className="font-medium mb-1">{rt.name}</div>
                        <Button onClick={()=>showRoute(rt.id)} size="sm" className="w-full">
                          Show Route
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
        </header>
        <div className="flex-1 relative">
          <div id="map" ref={mapRef} className="absolute inset-0" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
