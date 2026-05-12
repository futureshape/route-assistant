import { Marker } from '@vis.gl/react-google-maps'
import {
  Bed,
  Beer,
  Bike,
  Binoculars,
  Bus,
  Coffee,
  Cross,
  Droplets,
  Flag,
  FlagTriangleRight,
  Fuel,
  Grape,
  Hospital,
  Landmark,
  Library,
  MapPin,
  Mountain,
  MoveLeft,
  MoveRight,
  SquareParking,
  ShoppingBag,
  ShoppingCart,
  ShowerHead,
  Signpost,
  Square,
  Tent,
  Toilet,
  Trees,
  TriangleAlert,
  UtensilsCrossed,
  Waves,
  ShieldCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { POI, MarkerState, MarkerStates } from '@/types/poi'
import type { RideWithGPSPOIType } from '@/lib/poi-providers'

interface POIMarkersProps {
  markers: POI[]
  markerStates: MarkerStates
  routeColor: string
  onMarkerClick: (poi: POI) => void
  getMarkerKey: (poi: POI) => string
}

const POI_TYPE_ICONS: Record<RideWithGPSPOIType, LucideIcon> = {
  camping: Tent,
  lodging: Bed,
  parking: SquareParking,
  food: UtensilsCrossed,
  viewpoint: Binoculars,
  restroom: Toilet,
  generic: MapPin,
  aid_station: Flag,
  bar: Beer,
  bike_shop: Bike,
  bike_parking: Bike,
  convenience_store: ShoppingBag,
  first_aid: Cross,
  hospital: Hospital,
  rest_stop: Trees,
  trailhead: Signpost,
  geocache: ShoppingBag,
  water: Droplets,
  control: ShieldCheck,
  winery: Grape,
  start: FlagTriangleRight,
  stop: Square,
  finish: Flag,
  atm: Landmark,
  caution: TriangleAlert,
  coffee: Coffee,
  ferry: Bus,
  gas: Fuel,
  library: Library,
  monument: Landmark,
  park: Trees,
  segment_start: MoveRight,
  segment_end: MoveLeft,
  shopping: ShoppingCart,
  shower: ShowerHead,
  summit: Mountain,
  swimming: Waves,
  transit: Bus,
  bikeshare: Bike
}

const iconGlyphCache = new Map<LucideIcon, string>()
const markerIconCache = new Map<string, google.maps.Icon>()

function getMarkerFillColor(state: MarkerState, routeColor: string) {
  if (state === 'existing') return '#6b7280'
  if (state === 'selected') return '#22c55e'
  return routeColor
}

function getPOITypeIcon(poiTypeName?: string): LucideIcon {
  if (!poiTypeName) return POI_TYPE_ICONS.generic
  return POI_TYPE_ICONS[poiTypeName as RideWithGPSPOIType] || POI_TYPE_ICONS.generic
}

function getIconGlyphSvg(icon: LucideIcon) {
  const cached = iconGlyphCache.get(icon)
  if (cached) return cached

  const IconComponent = icon
  const glyph = renderToStaticMarkup(
    <IconComponent width="12" height="12" stroke="#ffffff" strokeWidth={2.25} fill="none" />
  ).replace('<svg', '<svg x="6" y="4"')

  iconGlyphCache.set(icon, glyph)
  return glyph
}

// Helper: get marker icon based on state and POI type
function getMarkerIcon(state: MarkerState, routeColor: string, poiTypeName?: string) {
  const markerSize = state === 'existing' ? 28 : 32
  const markerFill = getMarkerFillColor(state, routeColor)
  const markerIcon = getPOITypeIcon(poiTypeName)
  const cacheKey = `${state}_${markerFill}_${poiTypeName || 'generic'}`
  const cached = markerIconCache.get(cacheKey)
  if (cached) return cached

  const icon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${markerFill}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${getIconGlyphSvg(markerIcon)}
      </svg>
    `),
    scaledSize: new window.google.maps.Size(markerSize, markerSize),
    anchor: new window.google.maps.Point(markerSize / 2, markerSize)
  }

  markerIconCache.set(cacheKey, icon)
  return icon
}

export function POIMarkers({
  markers,
  markerStates,
  routeColor,
  onMarkerClick,
  getMarkerKey
}: POIMarkersProps) {
  return (
    <>
      {markers.map((poi) => {
        const markerKey = getMarkerKey(poi)
        const markerState = markerStates[markerKey] || 'suggested'

        return (
          <Marker
            key={markerKey}
            position={{ lat: poi.lat, lng: poi.lng }}
            title={poi.name}
            icon={getMarkerIcon(markerState, routeColor, poi.poi_type_name)}
            onClick={() => onMarkerClick(poi)}
          />
        )
      })}
    </>
  )
}
