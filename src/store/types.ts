// Type definitions for the application store

export interface Route {
  id: string | number
  name: string
  encoded_polyline?: string
  [key: string]: any
}

export interface POI {
  name: string
  lat: number
  lng: number
  poi_type_name?: string
  description?: string
  url?: string
  poiSource?: 'google' | 'existing' | string
  [key: string]: any
}

export type MarkerState = 'suggested' | 'selected' | 'existing'

export interface MarkerStates {
  [key: string]: MarkerState
}

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

export interface POIProvider {
  id: string
  name: string
  searchPOIs: (params: any) => Promise<any[]>
  [key: string]: any
}
