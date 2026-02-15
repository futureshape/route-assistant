import { Marker } from '@vis.gl/react-google-maps'
import type { POI, MarkerState, MarkerStates } from '@/types/poi'

interface POIMarkersProps {
  markers: POI[]
  markerStates: MarkerStates
  routeColor: string
  onMarkerClick: (poi: POI) => void
  getMarkerKey: (poi: POI) => string
}

// Helper: get marker icon based on state
function getMarkerIcon(state: MarkerState, routeColor: string) {
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
            icon={getMarkerIcon(markerState, routeColor)}
            onClick={() => onMarkerClick(poi)}
          />
        )
      })}
    </>
  )
}
