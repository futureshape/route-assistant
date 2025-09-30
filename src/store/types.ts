// Type definitions for the application store
import type { POIProvider as LibPOIProvider } from '@/lib/poi-providers'

// Re-export types from central types directory
export type { Route, RouteCoordinate } from '@/types/route'
export type { POI, POIMarker, MarkerState, MarkerStates } from '@/types/poi'

export interface MapPosition {
  lat: number
  lng: number
}

export interface ElevationDataPoint {
  distance: number
  elevation: number
  lat: number
  lng: number
  index: number
}

export interface RouteSwitchDialogState {
  show: boolean
  newRoute: Route | null
  currentRouteName: string
  selectedCount: number
}

// Re-export POIProvider from lib
export type POIProvider = LibPOIProvider

