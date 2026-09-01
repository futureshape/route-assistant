import { Hono } from 'hono'
import type { AppEnv } from '../../types'
import { requireAuth, requireAccess } from '../../middleware/auth'
import { getRideWithGPSTypeId } from '../../lib/poi-type-mapping'
import { coordsFromTrackPoints } from '../../lib/utils'
import polyline from '@mapbox/polyline'

const router = new Hono<AppEnv>()

router.get('/routes', requireAuth, requireAccess, async (c) => {
  const token = c.get('session').rwgps!.access_token
  let allRoutes: unknown[] = []
  let page = 1
  const perPage = 20

  while (page <= 100) {
    const r = await fetch(`https://ridewithgps.com/api/v1/routes.json?per_page=${perPage}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!r.ok) return c.json({ error: 'Failed to fetch routes' }, 500)
    const data = (await r.json()) as { routes?: unknown[] }
    const routes = data.routes || []
    allRoutes = allRoutes.concat(routes)
    if (routes.length < perPage) break
    page++
  }

  return c.json({ routes: allRoutes })
})

router.get('/route/:id', requireAuth, requireAccess, async (c) => {
  const id = c.req.param('id')
  const token = c.get('session').rwgps!.access_token

  const r = await fetch(`https://ridewithgps.com/routes/${id}.json`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'x-rwgps-api-version': '3' },
  })
  if (!r.ok) return c.json({ error: 'Failed to fetch route' }, 500)

  const data = (await r.json()) as {
    route?: { encoded_polyline?: string; track_points?: Array<{ x: number; y: number; d?: number; e?: number }> }
    extras?: Array<{ type: string; point_of_interest?: Record<string, unknown> }>
  }

  // Build polyline from track_points if missing
  if (data.route && !data.route.encoded_polyline) {
    const coords = coordsFromTrackPoints(data.route as { track_points: Array<{ x: number; y: number }> })
    if (coords.length > 0) data.route.encoded_polyline = polyline.encode(coords)
  }

  const existingPOIs =
    data.extras
      ?.filter((e) => e.type === 'point_of_interest' && e.point_of_interest)
      .map((e) => ({ ...e.point_of_interest, poiSource: 'existing' })) ?? []

  const elevationData =
    data.route?.track_points
      ?.map((p, index) => ({ distance: p.d || 0, elevation: p.e || 0, lat: p.y || 0, lng: p.x || 0, index }))
      .filter((p) => p.lat !== 0 && p.lng !== 0) ?? []

  return c.json({ ...data, elevationData, existingPOIs })
})

router.patch('/route/:id/pois', requireAuth, requireAccess, async (c) => {
  const routeId = c.req.param('id')
  const token = c.get('session').rwgps!.access_token
  type PoisBody = { pois?: Array<Record<string, unknown>> }
  const body = await c.req.json<PoisBody>().catch(() => ({} as PoisBody))
  const pois = body.pois

  if (!Array.isArray(pois)) return c.json({ error: 'POIs must be an array' }, 400)

  // Fetch current route to get existing POIs
  const routeRes = await fetch(`https://ridewithgps.com/routes/${routeId}.json`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'x-rwgps-api-version': '3' },
  })
  if (!routeRes.ok) return c.json({ error: 'Failed to fetch route' }, 500)
  const routeData = (await routeRes.json()) as { extras?: Array<{ type: string; point_of_interest?: Record<string, unknown> }> }

  const existingPOIs = routeData.extras?.filter((e) => e.type === 'point_of_interest' && e.point_of_interest).map((e) => e.point_of_interest!) ?? []

  // Fetch current user ID for POI format
  const userRes = await fetch('https://ridewithgps.com/api/v1/users/current.json', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!userRes.ok) return c.json({ error: 'Failed to get current user' }, 500)
  const userData = (await userRes.json()) as { user?: { id: number } }
  const currentUserId = userData.user?.id
  if (!currentUserId) return c.json({ error: 'Could not get current user ID' }, 500)

  const formattedNewPOIs = pois.map((poi) => {
    const poiTypeName = (poi.poi_type_name as string) || 'generic'
    return {
      lat: poi.lat,
      lng: poi.lng,
      name: poi.name,
      description: poi.description || '',
      url: poi.url || '',
      poi_type: getRideWithGPSTypeId(poiTypeName),
      poi_type_name: poiTypeName,
      user_id: currentUserId,
    }
  })

  const allPOIs = [...existingPOIs, ...formattedNewPOIs]
  const patchRes = await fetch(`https://ridewithgps.com/routes/${routeId}.json`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: { points_of_interest: allPOIs } }),
  })
  if (!patchRes.ok) {
    console.error(`[PATCH POIs] RWGPS returned ${patchRes.status}`)
    return c.json({ error: 'Failed to update route with POIs' }, 500)
  }

  return c.json({ success: true, addedPOIs: formattedNewPOIs.length, totalPOIs: allPOIs.length })
})

router.get('/google-maps-key', (c) => c.json({ apiKey: c.env.GOOGLE_API_KEY || '' }))

router.get('/poi-providers', (c) => {
  const enabled = (c.env.ENABLED_POI_PROVIDERS || 'google,osm').split(',').map((p) => p.trim())
  return c.json({ enabledProviders: enabled })
})

export { router as rwgpsRoutes }
