// Minimal frontend logic: auth, list routes, display route polyline, search POIs along route
const loginBtn = document.getElementById('login');
const statusEl = document.getElementById('status');
const routesEl = document.getElementById('routes');
const resultsEl = document.getElementById('results');
const searchBtn = document.getElementById('search');
const placeQuery = document.getElementById('placeQuery');

let map, directionsService, directionsRenderer, routePolyline, markers = [], infoWindow;

async function checkSession(){
  const r = await fetch('/api/session');
  const j = await r.json();
  statusEl.textContent = j.authenticated ? 'Signed in' : 'Not signed in';
}

loginBtn.addEventListener('click', ()=>{
  window.location = '/auth/ridewithgps';
});

async function listRoutes(){
  routesEl.innerHTML = '<li>Loading...</li>';
  const r = await fetch('/api/routes');
  if (r.status === 401){ routesEl.innerHTML = '<li>Not signed in</li>'; return; }
  const j = await r.json();
  routesEl.innerHTML = '';
  if (!j || !j.routes || j.routes.length===0){ routesEl.innerHTML = '<li>No routes found</li>'; return; }
  j.routes.forEach(rt=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${rt.name}</strong><br/><button data-id="${rt.id}">Show</button>`;
    li.querySelector('button').addEventListener('click', ()=>showRoute(rt.id));
    routesEl.appendChild(li);
  });
}

async function showRoute(id){
  clearMarkers();
  const r = await fetch(`/api/route/${id}`);
  if (!r.ok) return alert('Failed to load route');
  const j = await r.json();
  // RideWithGPS route object may contain gpx or polyline; try to use 'encoded_polyline'
  const enc = j.route && j.route.encoded_polyline;
  if (!enc){
    alert('Route has no encoded_polyline; displaying track points not implemented in demo');
    return;
  }
  // Keep last fetched encoded polyline for search usage
  window.lastFetchedEncodedPolyline = enc;
  const path = google.maps.geometry.encoding.decodePath(enc);
  if (routePolyline) routePolyline.setMap(null);
  routePolyline = new google.maps.Polyline({ path, strokeColor:'#007bff', strokeWeight:4 });
  routePolyline.setMap(map);
  map.fitBounds(path.reduce((b,p)=>{ b.extend(p); return b; }, new google.maps.LatLngBounds()));
}

function clearMarkers(){
  markers.forEach(m=>m.setMap(null)); markers = [];
  // Do not remove routePolyline when clearing markers
}

function placeMarkers(results){
  resultsEl.innerHTML = '';
  results.forEach(r=>{
    const li = document.createElement('li');
    li.textContent = r.name + ' — ' + (r.vicinity || r.formatted_address || '');
    resultsEl.appendChild(li);
    const marker = new google.maps.Marker({ position: { lat: parseFloat(r.geometry.location.lat), lng: parseFloat(r.geometry.location.lng) }, map, title: r.name });
    markers.push(marker);
    // InfoWindow with name and link if available
    const displayName = r.name || 'Place';
    const googleMapsUri = r.googleMapsUri || r.url || null;
    const content = document.createElement('div');
    const titleEl = document.createElement('div'); titleEl.textContent = displayName; titleEl.style.fontWeight = 'bold';
    content.appendChild(titleEl);
    if (googleMapsUri){
      const a = document.createElement('a'); a.href = googleMapsUri; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = 'Open in Google Maps'; a.style.display = 'block'; a.style.marginTop = '6px';
      content.appendChild(a);
    }
    marker.addListener('click', ()=>{
      if (!infoWindow) infoWindow = new google.maps.InfoWindow();
      infoWindow.setContent(content);
      infoWindow.open(map, marker);
    });
  });
  // Fit map to show markers and route if present
  if (markers.length>0){
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m=>bounds.extend(m.getPosition()));
    if (routePolyline){
      const path = routePolyline.getPath();
      for (let i=0;i<path.getLength();i++) bounds.extend(path.getAt(i));
    }
    map.fitBounds(bounds);
  }
}

async function searchPOIsAlongRoute(){
  if (!routePolyline) return alert('Please show a route first');
  const query = placeQuery.value.trim();
  if (!query) return alert('Enter a search term');
  // Use server-side Search Along Route (Places Web Service) by sending the encoded polyline
  // We need the encoded polyline string from the route (we stored it in showRoute)
  // routePolyline was built from decoded path; encode it back to string by extracting lat/lngs
  const path = routePolyline.getPath();
  const coords = [];
  for (let i=0;i<path.getLength();i++) coords.push({ latitude: path.getAt(i).lat(), longitude: path.getAt(i).lng() });
  // We'll try to reuse the encoded polyline if available on the route object via lastFetchedEncodedPolyline
  const encoded = window.lastFetchedEncodedPolyline || null;
  const payload = { textQuery: query, encodedPolyline: encoded };
  const r = await fetch('/api/search-along-route', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!r.ok) return alert('Search failed');
  const j = await r.json();
  console.debug('Search response raw:', j);
  const places = j.places || [];
  console.debug('Places array length=', places.length, places);
  // Normalize geometry to {lat,lng} for markers
  function extractLatLng(p){
    let lat = null, lng = null;
    try{
      if (p.geoCode){
        if (p.geoCode.location){
          lat = p.geoCode.location.latitude ?? p.geoCode.location.lat ?? p.geoCode.location.latLng?.latitude ?? p.geoCode.location.latLng?.lat;
          lng = p.geoCode.location.longitude ?? p.geoCode.location.lng ?? p.geoCode.location.latLng?.longitude ?? p.geoCode.location.latLng?.lng;
        } else {
          lat = p.geoCode.latitude ?? p.geoCode.lat;
          lng = p.geoCode.longitude ?? p.geoCode.lng;
        }
      }
      if ((lat == null || lng == null) && p.geometry){
        const loc = p.geometry.location || p.geometry;
        lat = lat ?? (loc && (loc.latitude ?? loc.lat ?? loc.latLng?.latitude ?? loc.latLng?.lat));
        lng = lng ?? (loc && (loc.longitude ?? loc.lng ?? loc.latLng?.longitude ?? loc.latLng?.lng));
      }
      if ((lat == null || lng == null) && p.location){
        lat = lat ?? (p.location.latitude ?? p.location.lat);
        lng = lng ?? (p.location.longitude ?? p.location.lng);
      }
      if ((lat == null || lng == null) && p.geoCode && p.geoCode.latLng){
        lat = lat ?? (p.geoCode.latLng.latitude ?? p.geoCode.latLng.lat);
        lng = lng ?? (p.geoCode.latLng.longitude ?? p.geoCode.latLng.lng);
      }
      if ((lat == null || lng == null) && p.center){
        lat = lat ?? (p.center.latitude ?? p.center.lat);
        lng = lng ?? (p.center.longitude ?? p.center.lng);
      }
    }catch(e){ console.debug('extractLatLng error', e); }
    const nlat = lat != null ? parseFloat(lat) : NaN;
    const nlng = lng != null ? parseFloat(lng) : NaN;
    return { lat: nlat, lng: nlng };
  }

  const normalized = places.map(p=>{
    const { lat, lng } = extractLatLng(p);
    const name = p.displayName?.text || p.name || (p.displayName && typeof p.displayName === 'string' ? p.displayName : '') || p.formattedAddress || '';
    const googleMapsUri = p.googleMapsUri || p.uri || p.url || null;
    return { name, vicinity: p.formattedAddress || '', googleMapsUri, geometry: { location: { lat, lng } } };
  }).filter(p=> Number.isFinite(p.geometry.location.lat) && Number.isFinite(p.geometry.location.lng));

  console.debug('Normalized places (filtered) count=', normalized.length, normalized);
  placeMarkers(normalized);
}

searchBtn.addEventListener('click', searchPOIsAlongRoute);
document.getElementById('clearMarkers').addEventListener('click', ()=>{
  clearMarkers();
  resultsEl.innerHTML = '';
});

function initMap(){
  map = new google.maps.Map(document.getElementById('map'), { center:{lat:39.5,lng:-98.35}, zoom:4 });
}

window.initMap = initMap;

// Boot
checkSession();
listRoutes();
