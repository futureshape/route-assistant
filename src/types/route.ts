// Route-related Type Definitions

export interface Route {
  id: number
  name: string
  distance?: number // meters
  elevation_gain?: number // meters
  encoded_polyline?: string
  created_at?: string
  updated_at?: string
  description?: string
  locality?: string
  visibility?: number
  user_id?: number
}

export interface RouteWithDetails extends Route {
  track_points?: TrackPoint[]
  extras?: RouteExtra[]
}

export interface TrackPoint {
  x: number // longitude
  y: number // latitude
  d: number // distance from start in meters
  e?: number // elevation in meters
}

export interface RouteExtra {
  type: string
  point_of_interest?: any
  [key: string]: any
}

export interface RouteCoordinate {
  lat: number
  lng: number
}
