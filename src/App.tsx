import React, { useEffect, useRef, useState } from 'react'

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

import { Button } from './components/ui/Button'
import { Sidebar } from './components/ui/sidebar'
import { ScrollArea } from './components/ui/scroll-area'

export default function App(){
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [status, setStatus] = useState('Not signed in')
  const [routes, setRoutes] = useState([])
  const [routePolyline, setRoutePolyline] = useState(null)
  const [markers, setMarkers] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const mapsReady = useGoogleMapsReady()

  useEffect(()=>{ (async()=>{
    const r = await fetch('/api/session'); const j = await r.json(); setStatus(j.authenticated ? 'Signed in':'Not signed in')
    const rr = await fetch('/api/routes'); if (rr.ok){ const jj = await rr.json(); setRoutes(jj.routes||[]) }
  })() },[])

  useEffect(()=>{
    if (!mapsReady || !mapRef.current || map) return
    const m = new google.maps.Map(mapRef.current, { center:{lat:39.5,lng:-98.35}, zoom:4 })
    setMap(m)
  },[mapsReady, mapRef, map])

  async function showRoute(id){
    clearMarkers()
    const r = await fetch(`/api/route/${id}`)
    if (!r.ok){ alert('Failed to load route'); return }
    const j = await r.json()
    const enc = j.route && j.route.encoded_polyline
    if (!enc){ alert('Route has no encoded_polyline'); return }
    window.lastFetchedEncodedPolyline = enc
    const path = google.maps.geometry.encoding.decodePath(enc)
    if (routePolyline){ routePolyline.setMap(null) }
    const pl = new google.maps.Polyline({ path, strokeColor:'#007bff', strokeWeight:4 })
    pl.setMap(map)
    setRoutePolyline(pl)
    const bounds = new google.maps.LatLngBounds(); path.forEach(p=>bounds.extend(p)); map.fitBounds(bounds)
  }

  function clearMarkers(){
    markers.forEach(m=>m.setMap(null)); setMarkers([])
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
    const norm = places.map(p=>{
      const loc = p.location || p.geoCode?.location || p.geometry?.location || p.center || {}
      const lat = loc.latitude ?? loc.lat ?? loc.latLng?.latitude
      const lng = loc.longitude ?? loc.lng ?? loc.latLng?.longitude
      return { name: p.displayName?.text || p.name || '', googleMapsUri: p.googleMapsUri, lat: parseFloat(lat), lng: parseFloat(lng) }
    }).filter(p=> Number.isFinite(p.lat) && Number.isFinite(p.lng))
    setResults(norm)
    // place markers
    const mks = norm.map(p=>{
      const mk = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map, title: p.name })
      const iw = new google.maps.InfoWindow({ content: `<strong>${p.name||'Place'}</strong>${p.googleMapsUri?`<br/><a href=\"${p.googleMapsUri}\" target=\"_blank\">Open in Google Maps</a>`:''}` })
      mk.addListener('click', ()=> iw.open({ map, anchor: mk }))
      return mk
    })
    setMarkers(mks)
    if (mks.length){ const b = new google.maps.LatLngBounds(); mks.forEach(m=>b.extend(m.getPosition())); if (routePolyline){ routePolyline.getPath().forEach(p=>b.extend(p)) } map.fitBounds(b) }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="px-3 py-2 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
        <Button onClick={()=> window.location = '/auth/ridewithgps'}>Sign in with RideWithGPS</Button>
        <span className="text-sm text-neutral-700">{status}</span>
      </div>
      <div className="flex flex-1 min-h-0">
        <Sidebar className="w-80" header={<div className="text-sm font-medium">Controls</div>}>
          <ScrollArea className="h-full p-3">
            <h3 className="text-base font-semibold mb-2">Your Routes</h3>
            <ul className="space-y-2">
              {routes.map(rt=> (
                <li key={rt.id} className="text-sm">
                  <div className="font-medium">{rt.name}</div>
                  <Button onClick={()=>showRoute(rt.id)} className="mt-1">Show</Button>
                </li>
              ))}
            </ul>
            <h3 className="text-base font-semibold mt-4 mb-2">Search POIs along route</h3>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g., coffee, restroom, bike shop" className="w-full border rounded-md px-3 py-2 text-sm"/>
            <div className="flex gap-2 mt-2">
              <Button onClick={searchPOIs}>Search POIs</Button>
              <Button onClick={clearMarkers} className="bg-neutral-200 text-black hover:bg-neutral-300">Clear markers</Button>
            </div>
            <ul className="mt-3 space-y-1">
              {results.map((r,i)=> (
                <li key={i} className="text-sm">
                  {r.name} {r.googleMapsUri? '— ' : ''}{r.googleMapsUri && (<a className="text-blue-600 hover:underline" href={r.googleMapsUri} target="_blank" rel="noreferrer">map</a>)}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Sidebar>
        <div id="map" ref={mapRef} className="flex-1" />
      </div>
    </div>
  )
}
