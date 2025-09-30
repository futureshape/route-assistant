// POI-related Type Definitions

import { RideWithGPSPOIType } from '@/lib/poi-providers'

export interface POI {
  id?: string
  name: string
  lat: number
  lng: number
  poi_type_name?: RideWithGPSPOIType | string
  description?: string
  url?: string
  poiSource?: 'google' | 'existing' | string
}

export interface POIMarker extends POI {
  provider?: string
}

export type MarkerState = 'suggested' | 'selected' | 'existing'

export interface MarkerStates {
  [key: string]: MarkerState
}

export type POITypeMap = Record<string, string>
