import polyline from '@mapbox/polyline'

// Mirrors server.js coordsFromTrackPoints — only uses route.track_points
export function coordsFromTrackPoints(route: { track_points?: Array<{ x: number; y: number }> }): [number, number][] {
  if (!Array.isArray(route?.track_points)) return []
  const out: [number, number][] = []
  for (const p of route.track_points) {
    const lat = parseFloat(String(p.y))
    const lng = parseFloat(String(p.x))
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng])
  }
  return out
}

export function downsampleEncodedPolyline(encodedPolyline: string, maxPoints = 500): string {
  if (!encodedPolyline) return encodedPolyline
  try {
    const coords = polyline.decode(encodedPolyline)
    if (coords.length <= maxPoints) return encodedPolyline
    const step = Math.max(1, Math.ceil(coords.length / maxPoints))
    const reduced: [number, number][] = []
    for (let i = 0; i < coords.length; i += step) reduced.push(coords[i])
    const last = coords[coords.length - 1]
    const final = reduced[reduced.length - 1]
    if (!final || final[0] !== last[0] || final[1] !== last[1]) reduced.push(last)
    return polyline.encode(reduced)
  } catch {
    return encodedPolyline
  }
}

export function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function getOpeningHoursSummary(place: { regularOpeningHours?: { weekdayDescriptions?: string[] } }): string {
  const descriptions = place.regularOpeningHours?.weekdayDescriptions
  if (Array.isArray(descriptions) && descriptions.length > 0) {
    return `Regular hours:\n${descriptions.join('\n')}`
  }
  return ''
}
