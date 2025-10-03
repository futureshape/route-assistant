// API Response Types
// These types match the responses from the backend API

import { Route, RouteWithDetails } from './route'
import { POI } from './poi'
import { User, SessionUser } from './user'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface SessionResponse {
  authenticated: boolean
  user?: SessionUser
}

export interface RoutesResponse {
  routes: Route[]
  total?: number
  page?: number
}

export interface RouteDetailsResponse {
  route: RouteWithDetails
  elevationData: ElevationPoint[]
  existingPOIs: POI[]
}

export interface ElevationPoint {
  distance: number // meters from start
  elevation: number // meters
  lat: number
  lng: number
  index: number // point index in the route
}

export interface GoogleMapsKeyResponse {
  apiKey: string
}

export interface POIProvidersResponse {
  providers: string[]
}

export interface AccessDeniedResponse {
  error: string
  status: string
  message: string
}
