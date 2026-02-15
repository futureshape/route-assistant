import { useEffect, useMemo, memo } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { ListTodo } from 'lucide-react'
import { RoutePolyline } from './RoutePolyline'
import { POIMarkers } from './POIMarkers'
import { POIInfoWindow } from './POIInfoWindow'
import { setupGoogleMapsPOIClickListener } from '@/lib/google-maps-provider'
import type { POI, MarkerState, MarkerStates } from '@/types/poi'
import type { POIResult } from '@/lib/poi-providers'

// Memoized chart hover marker component to prevent flickering
const ChartHoverMarker = memo(({ position, color }: { position: { lat: number; lng: number }, color: string }) => {
  const icon = useMemo(() => ({
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(16, 16),
    anchor: new window.google.maps.Point(8, 8)
  }), [color])

  return <Marker position={position} icon={icon} />
})

interface MapContainerProps {
  googleMapsApiKey: string
  mapCenter: { lat: number; lng: number }
  mapZoom: number
  routePath: Array<{ lat: number; lng: number }>
  routeColor: string
  markers: POI[]
  markerStates: MarkerStates
  selectedMarker: POI | null
  chartHoverPosition: { lat: number; lng: number } | null
  selectedRouteId: number | null
  routeFullyLoaded: boolean
  poiTypeNames: Record<string, string>
  onCameraChange: (center: { lat: number; lng: number }, zoom: number) => void
  onMarkerClick: (poi: POI) => void
  onCloseInfoWindow: () => void
  onUpdateMarkerState: (markerKey: string, newState: MarkerState) => void
  onPOIUpdate?: (markerKey: string, updatedPOI: Partial<POI>) => void
  onDiscardPOI?: (markerKey: string) => void
  onGooglePlacesPOIClick?: (poi: POIResult) => void
  getMarkerKey: (poi: POI) => string
  mapInstanceRef: React.MutableRefObject<google.maps.Map | null>
}

// Component to capture map instance and set up POI click handling
function MapInstanceCapture({ 
  mapInstanceRef, 
  onGooglePlacesPOIClick 
}: { 
  mapInstanceRef: React.MutableRefObject<google.maps.Map | null>
  onGooglePlacesPOIClick?: (poi: POIResult) => void
}) {
  const map = useMap()
  
  useEffect(() => {
    mapInstanceRef.current = map
    
    // Set up Google Maps POI click listener if callback is provided
    if (map && onGooglePlacesPOIClick) {
      const listener = setupGoogleMapsPOIClickListener(map, onGooglePlacesPOIClick)
      
      // Cleanup listener when component unmounts
      return () => {
        if (listener) {
          window.google?.maps?.event?.removeListener(listener)
        }
      }
    }
  }, [map, mapInstanceRef, onGooglePlacesPOIClick])
  
  return null
}

export function MapContainer({
  googleMapsApiKey,
  mapCenter,
  mapZoom,
  routePath,
  routeColor,
  markers,
  markerStates,
  selectedMarker,
  chartHoverPosition,
  selectedRouteId,
  routeFullyLoaded,
  poiTypeNames,
  onCameraChange,
  onMarkerClick,
  onCloseInfoWindow,
  onUpdateMarkerState,
  onPOIUpdate,
  onDiscardPOI,
  onGooglePlacesPOIClick,
  getMarkerKey,
  mapInstanceRef
}: MapContainerProps) {
  // Calculate POI counts by state
  const suggestedCount = markers.filter(poi => {
    const key = getMarkerKey(poi)
    const state = markerStates[key]
    return !state || state === 'suggested'
  }).length

  const selectedCount = markers.filter(poi => {
    const key = getMarkerKey(poi)
    return markerStates[key] === 'selected'
  }).length

  const existingCount = markers.filter(poi => {
    const key = getMarkerKey(poi)
    return markerStates[key] === 'existing'
  }).length

  // Create a JSON string of marker info for testing
  const markerInfo = JSON.stringify(markers.map(poi => ({
    key: getMarkerKey(poi),
    name: poi.name,
    state: markerStates[getMarkerKey(poi)] || 'suggested',
    lat: poi.lat,
    lng: poi.lng
  })))

  // Expose test helpers for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Function to click a marker by name
      (window as any).__testClickMarkerByName = (poiName: string) => {
        const poi = markers.find(m => m.name === poiName)
        if (poi) {
          onMarkerClick(poi)
          return true
        }
        return false
      }

      // Function to click a marker by index
      (window as any).__testClickMarkerByIndex = (index: number) => {
        if (index >= 0 && index < markers.length) {
          onMarkerClick(markers[index])
          return true
        }
        return false
      }

      // Function to click a marker by key
      (window as any).__testClickMarkerByKey = (markerKey: string) => {
        const poi = markers.find(m => getMarkerKey(m) === markerKey)
        if (poi) {
          onMarkerClick(poi)
          return true
        }
        return false
      }

      // Function to get all markers (for test inspection)
      (window as any).__testGetMarkers = () => {
        return markers.map((poi, index) => ({
          index,
          key: getMarkerKey(poi),
          name: poi.name,
          state: markerStates[getMarkerKey(poi)] || 'suggested',
          lat: poi.lat,
          lng: poi.lng,
          poi_type_name: poi.poi_type_name
        }))
      }
    }
  }, [markers, markerStates, onMarkerClick, getMarkerKey])

  return (
    <div 
      className="relative w-full h-full" 
      data-testid="map-container"
      data-route-loaded={routePath.length > 0 ? 'true' : 'false'}
      data-route-points={routePath.length}
      data-poi-count={markers.length}
      data-suggested-count={suggestedCount}
      data-selected-count={selectedCount}
      data-existing-count={existingCount}
      data-marker-info={markerInfo}
    >
      {googleMapsApiKey && (
        <APIProvider apiKey={googleMapsApiKey} libraries={['geometry', 'places']}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={mapZoom}
            mapTypeId="roadmap"
            style={{ width: '100%', height: '100%' }}
            onCameraChanged={(event) => {
              onCameraChange(event.detail.center, event.detail.zoom)
            }}
            data-testid="google-map"
          >
            {/* Capture map instance */}
            <MapInstanceCapture 
              mapInstanceRef={mapInstanceRef}
              onGooglePlacesPOIClick={onGooglePlacesPOIClick}
            />

            {/* Route Polyline */}
            {routePath.length > 0 && <RoutePolyline path={routePath} color={routeColor} />}
          
            {/* Chart hover position marker */}
            {chartHoverPosition && (
              <ChartHoverMarker position={chartHoverPosition} color={routeColor} />
            )}
          
            {/* POI Markers */}
            <POIMarkers
              markers={markers}
              markerStates={markerStates}
              routeColor={routeColor}
              onMarkerClick={onMarkerClick}
              getMarkerKey={getMarkerKey}
            />
          
            {/* Info Window for selected marker */}
            {selectedMarker && (() => {
              const markerKey = getMarkerKey(selectedMarker)
              const markerState = markerStates[markerKey] || 'suggested'
              
              return (
                <POIInfoWindow
                  poi={selectedMarker}
                  markerState={markerState}
                  poiTypeNames={poiTypeNames}
                  onClose={onCloseInfoWindow}
                  onUpdateState={(newState) => onUpdateMarkerState(markerKey, newState)}
                  onPOIUpdate={onPOIUpdate ? (updatedPOI) => onPOIUpdate(markerKey, updatedPOI) : undefined}
                  onDiscard={onDiscardPOI ? () => onDiscardPOI(markerKey) : undefined}
                />
              )
            })()}
          </Map>
        </APIProvider>
      )}
      
      {/* Overlay when no route is selected or route is not fully loaded */}
      {(!selectedRouteId || !routeFullyLoaded) && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-10" data-testid="map-overlay">
          <div className="text-center space-y-4">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {!selectedRouteId 
                ? "To get started, sign in with RideWithGPS and pick a route"
                : "Loading route..."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
