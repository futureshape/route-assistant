import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { requireAuth, requireAccess } from '../../middleware/auth'
import { mapGoogleTypeToRideWithGPS, mapOSMAmenityToRideWithGPS } from '../../lib/poi-type-mapping'
import { downsampleEncodedPolyline, parsePositiveIntEnv, getOpeningHoursSummary } from '../../lib/utils'
import polyline from '@mapbox/polyline'

const GOOGLE_PLACES_FIELDMASK =
  'places.displayName,places.googleMapsUri,places.location,places.primaryType,places.editorialSummary,places.regularOpeningHours.weekdayDescriptions'

const router = new Hono<AppEnv>()

router.post('/poi-search/google-maps', requireAuth, requireAccess, async (c) => {
  type GoogleBody = { textQuery?: string; encodedPolyline?: string; routingOrigin?: unknown }
  const body = await c.req.json<GoogleBody>().catch(() => ({} as GoogleBody))
  const { textQuery, encodedPolyline, routingOrigin } = body

  if (!textQuery || !encodedPolyline) return c.json({ error: 'textQuery and encodedPolyline required' }, 400)

  const maxPoints = parsePositiveIntEnv(c.env.GOOGLE_ROUTE_MAX_POINTS, 500)
  const queryPolyline = downsampleEncodedPolyline(encodedPolyline, maxPoints)

  const requestBody: Record<string, unknown> = {
    textQuery,
    searchAlongRouteParameters: { polyline: { encodedPolyline: queryPolyline } },
  }
  if (routingOrigin) requestBody.routingParameters = { origin: routingOrigin }

  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': c.env.GOOGLE_API_KEY || '', 'X-Goog-FieldMask': GOOGLE_PLACES_FIELDMASK },
    body: JSON.stringify(requestBody),
  })
  if (!r.ok) {
    const snippet = await r.text().then((t) => t.slice(0, 500))
    return c.json({ error: 'Search failed', details: { status: r.status, snippet } }, 500)
  }

  const data = (await r.json()) as { places?: Array<Record<string, unknown>> }
  const places = (data.places || []).map((place) => {
    const location = (place.location as { latitude?: number; longitude?: number }) || {}
    const primaryType = (place.primaryType as string) || 'establishment'
    const openingHours = getOpeningHoursSummary(place as { regularOpeningHours?: { weekdayDescriptions?: string[] } })
    const descParts: string[] = []
    if (openingHours) descParts.push(openingHours)
    const editorial = (place.editorialSummary as { text?: string })?.text
    if (editorial) descParts.push(editorial)
    return {
      displayName: place.displayName,
      name: (place.displayName as { text?: string })?.text || '',
      location,
      lat: location.latitude,
      lng: location.longitude,
      primaryType,
      poi_type_name: mapGoogleTypeToRideWithGPS(primaryType),
      description: descParts.join('\n\n'),
      googleMapsUri: place.googleMapsUri || '',
      url: place.googleMapsUri || '',
      provider: 'google',
    }
  })

  return c.json({ places })
})

router.post('/poi-search/osm', requireAuth, requireAccess, async (c) => {
  type OsmBody = { tags?: string; encodedPolyline?: string; mapBounds?: Record<string, number> }
  const body = await c.req.json<OsmBody>().catch(() => ({} as OsmBody))
  const { tags, encodedPolyline, mapBounds } = body
  const tokenStr = typeof tags === 'string' && tags.trim() ? tags.trim() : ''
  if (!tokenStr) return c.json({ error: 'OSM tags required (must be key=value format)' }, 400)
  if (!encodedPolyline && !mapBounds) return c.json({ error: 'Either encodedPolyline or mapBounds required' }, 400)

  // Parse comma-separated key=value tags and group by key
  const rawList = tokenStr.split(',').map((a) => a.trim()).filter(Boolean)
  const groups = new Map<string, Set<string>>()
  for (const token of rawList) {
    if (token.includes('=')) {
      const eqIdx = token.indexOf('=')
      const k = token.slice(0, eqIdx).trim()
      const v = token.slice(eqIdx + 1).trim()
      if (k && v) {
        if (!groups.has(k)) groups.set(k, new Set())
        groups.get(k)!.add(v)
      }
    }
  }
  if (groups.size === 0) return c.json({ error: 'At least one valid key=value tag required' }, 400)

  const escSql = (s: string) => String(s).replace(/'/g, "''")
  const tagFilter = Array.from(groups.entries())
    .map(([key, values]) => `tags->>'${escSql(key)}' IN (${Array.from(values).map((v) => `'${escSql(v)}'`).join(', ')})`)
    .join(' OR ')

  let postpassQuery: string

  if (encodedPolyline) {
    const coords = polyline.decode(encodedPolyline)
    const maxPoints = parsePositiveIntEnv(c.env.OSM_ROUTE_MAX_POINTS, 800)
    let sampled = coords
    if (coords.length > maxPoints) {
      const step = Math.max(1, Math.floor(coords.length / Math.min(maxPoints, Math.max(20, Math.floor(coords.length * 0.25)))))
      sampled = coords.filter((_, i) => i % step === 0)
      const last = coords[coords.length - 1]
      const fin = sampled[sampled.length - 1]
      if (!fin || fin[0] !== last[0] || fin[1] !== last[1]) sampled.push(last)
    }
    const lineCoords = sampled.map(([lat, lng]) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Invalid coordinate in route polyline')
      return `${lng} ${lat}`
    })
    postpassQuery = `SELECT osm_type, osm_id, tags, ST_Centroid(geom) as geom FROM postpass_pointpolygon WHERE (${tagFilter}) AND ST_DWithin(geom, ST_SetSRID(ST_GeomFromText('LINESTRING(${lineCoords.join(', ')})'), 4326), 0.005)`
  } else {
    const { south, west, north, east } = mapBounds!
    const [s, w, n, e] = [south, west, north, east].map(Number)
    if ([s, w, n, e].some((v) => !Number.isFinite(v))) return c.json({ error: 'Invalid bounding box coordinates' }, 400)
    postpassQuery = `SELECT osm_type, osm_id, tags, ST_Centroid(geom) as geom FROM postpass_pointpolygon WHERE (${tagFilter}) AND geom && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)`
  }

  let postpassRes: Response
  try {
    postpassRes = await fetch('https://postpass.geofabrik.de/api/0.2/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: postpassQuery }).toString(),
      signal: AbortSignal.timeout(25000),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      return c.json({ error: 'The OSM search server timed out. It may be busy — please try again shortly.' }, 504)
    }
    throw err
  }

  if (!postpassRes.ok) {
    if (postpassRes.status === 504) {
      return c.json({ error: 'The OSM search server timed out. It may be busy — please try again shortly.' }, 504)
    }
    return c.json({ error: 'OSM search failed', details: { status: postpassRes.status } }, 500)
  }

  const geojson = (await postpassRes.json()) as { features?: Array<Record<string, unknown>> }
  const osmTypeMap: Record<string, string> = { N: 'node', W: 'way', R: 'relation' }

  const formattedPOIs = (geojson.features || [])
    .map((feature) => {
      const coords = (feature.geometry as { coordinates?: [number, number] })?.coordinates || [0, 0]
      const lon = coords[0]
      const lat = coords[1]
      const props = (feature.properties as { tags?: Record<string, string>; osm_type?: string; osm_id?: string }) || {}
      const featureTags = props.tags || {}
      const osmType = (props.osm_type || '').trim()
      const osmId = props.osm_id

      const toTitleCase = (s: string) =>
        (s || '').replace(/[_-]/g, ' ').split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

      let name = featureTags.name
      if (!name) {
        if (featureTags.amenity) name = toTitleCase(featureTags.amenity)
        else if (featureTags.railway) name = toTitleCase(featureTags.railway)
        else if (featureTags.public_transport) name = toTitleCase(featureTags.public_transport)
        else if (featureTags.shop) name = toTitleCase(featureTags.shop)
        else if (featureTags.tourism) name = toTitleCase(featureTags.tourism)
        else if (featureTags.leisure) name = toTitleCase(featureTags.leisure)
        else name = 'POI'
      }

      let poiTypeKeyValue: string | null = null
      if (featureTags.amenity) poiTypeKeyValue = `amenity=${featureTags.amenity}`
      else if (featureTags.railway) poiTypeKeyValue = `railway=${featureTags.railway}`
      else if (featureTags.public_transport) poiTypeKeyValue = `public_transport=${featureTags.public_transport}`

      const osmTypeName = osmTypeMap[osmType] || 'node'
      return {
        name,
        lat: parseFloat(String(lat)),
        lng: parseFloat(String(lon)),
        poi_type_name: poiTypeKeyValue ? mapOSMAmenityToRideWithGPS(poiTypeKeyValue) : 'generic',
        description: featureTags.description || '',
        url: featureTags.website || `https://www.openstreetmap.org/${osmTypeName}/${osmId}`,
      }
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  return c.json({ places: formattedPOIs })
})

router.post('/poi-search/mock', requireAuth, requireAccess, async (c) => {
  type MockBody = { textQuery?: string; mapBounds?: { north: number; south: number; east: number; west: number } }
  const body = await c.req.json<MockBody>().catch(() => ({} as MockBody))
  const { textQuery, mapBounds } = body
  if (!textQuery) return c.json({ error: 'textQuery required' }, 400)

  let centerLat = 39.5
  let centerLng = -98.35
  if (mapBounds?.north && mapBounds?.south && mapBounds?.east && mapBounds?.west) {
    centerLat = (mapBounds.north + mapBounds.south) / 2
    centerLng = (mapBounds.east + mapBounds.west) / 2
  }

  return c.json({
    places: [{ displayName: { text: `Mock: ${textQuery}` }, location: { latitude: centerLat, longitude: centerLng }, primaryType: 'establishment' }],
  })
})

router.post('/poi-from-place-id', requireAuth, requireAccess, async (c) => {
  type PlaceBody = { placeId?: string }
  const body = await c.req.json<PlaceBody>().catch(() => ({} as PlaceBody))
  const { placeId } = body
  if (!placeId) return c.json({ error: 'Place ID is required' }, 400)

  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': c.env.GOOGLE_API_KEY || '',
      'X-Goog-FieldMask': 'displayName,location,types,formattedAddress,websiteUri,editorialSummary,regularOpeningHours.weekdayDescriptions',
    },
  })
  if (!r.ok) return c.json({ error: 'Place not found or invalid' }, r.status === 404 ? 404 : 500)

  const place = (await r.json()) as {
    displayName?: { text?: string }
    location?: { latitude?: number; longitude?: number }
    types?: string[]
    formattedAddress?: string
    websiteUri?: string
    editorialSummary?: { text?: string }
    regularOpeningHours?: { weekdayDescriptions?: string[] }
  }
  if (!place.location) return c.json({ error: 'Place not found or invalid' }, 404)

  const primaryType = place.types?.[0] || 'establishment'
  const openingHours = getOpeningHoursSummary(place)
  const descParts: string[] = []
  if (openingHours) descParts.push(openingHours)
  if (place.editorialSummary?.text) descParts.push(place.editorialSummary.text)
  else if (place.formattedAddress) descParts.push(place.formattedAddress)

  return c.json({
    name: place.displayName?.text || 'Unknown Place',
    lat: place.location.latitude,
    lng: place.location.longitude,
    poi_type_name: mapGoogleTypeToRideWithGPS(primaryType),
    description: descParts.join('\n\n'),
    url: place.websiteUri || '',
    provider: 'google',
  })
})

export { router as poiRoutes }
