import { useEffect, useRef } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { ListTodo } from 'lucide-react'
import { RoutePolyline } from './RoutePolyline'
import { POIMarkers } from './POIMarkers'
import { POIInfoWindow } from './POIInfoWindow'

interface POI {
  name: string
  lat: number
  lng: number
  poi_type_name?: string
  description?: string
  url?: string
  poiSource?: string
}

interface MapContainerProps {
  googleMapsApiKey: string
  mapCenter: { lat: number; lng: number }
  mapZoom: number
  routePath: Array<{ lat: number; lng: number }>
  routeColor: string
  markers: POI[]
  markerStates: { [key: string]: 'suggested' | 'selected' | 'existing' }
  selectedMarker: POI | null
  chartHoverPosition: { lat: number; lng: number } | null
  selectedRouteId: string | null
  routeFullyLoaded: boolean
  poiTypeNames: Record<string, string>
  onCameraChange: (center: { lat: number; lng: number }, zoom: number) => void
  onMarkerClick: (poi: POI) => void
  onCloseInfoWindow: () => void
  onUpdateMarkerState: (markerKey: string, newState: 'suggested' | 'selected') => void
  getMarkerKey: (poi: POI) => string
  mapInstanceRef: React.MutableRefObject<any>
}

// Component to capture map instance
function MapInstanceCapture({ mapInstanceRef }: { mapInstanceRef: React.MutableRefObject<any> }) {
  const map = useMap()
  
  useEffect(() => {
    mapInstanceRef.current = map
  }, [map, mapInstanceRef])
  
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
  getMarkerKey,
  mapInstanceRef
}: MapContainerProps) {
  return (
    <div className="relative w-full h-full">
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
          >
            {/* Capture map instance */}
            <MapInstanceCapture mapInstanceRef={mapInstanceRef} />

            {/* Route Polyline */}
            {routePath.length > 0 && <RoutePolyline path={routePath} color={routeColor} />}
          
            {/* Chart hover position marker */}
            {chartHoverPosition && (
              <Marker
                position={chartHoverPosition}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${routeColor}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(16, 16),
                  anchor: new window.google.maps.Point(8, 8)
                }}
              />
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
                />
              )
            })()}
          </Map>
        </APIProvider>
      )}
      
      {/* Overlay when no route is selected or route is not fully loaded */}
      {(!selectedRouteId || !routeFullyLoaded) && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-10">
          <div className="text-center space-y-4">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {!selectedRouteId 
                ? "To get started, log in to RideWithGPS and select a route"
                : "Loading route..."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
