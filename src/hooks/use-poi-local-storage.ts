import { useCallback } from 'react'
import type { POI } from '@/store/types'

const STORAGE_KEY_PREFIX = 'route-assistant-pois-'

function getStorageKey(routeId: number): string {
  return `${STORAGE_KEY_PREFIX}${routeId}`
}

function isValidPOI(item: unknown): item is POI {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  return (
    typeof obj.name === 'string' &&
    typeof obj.lat === 'number' &&
    typeof obj.lng === 'number'
  )
}

/**
 * Hook that provides localStorage persistence for selected POIs,
 * keyed by RideWithGPS route ID.
 *
 * Only 'selected' POIs are persisted (not 'suggested' or 'existing' ones).
 */
export function usePOILocalStorage() {
  const savePOIs = useCallback((routeId: number, pois: POI[]) => {
    try {
      if (pois.length === 0) {
        localStorage.removeItem(getStorageKey(routeId))
      } else {
        localStorage.setItem(getStorageKey(routeId), JSON.stringify(pois))
      }
    } catch (error) {
      console.warn('[POILocalStorage] Failed to save POIs:', error)
    }
  }, [])

  const loadPOIs = useCallback((routeId: number): POI[] => {
    try {
      const stored = localStorage.getItem(getStorageKey(routeId))
      if (!stored) return []
      const parsed: unknown = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isValidPOI)
    } catch (error) {
      console.warn('[POILocalStorage] Failed to load POIs:', error)
      return []
    }
  }, [])

  const clearPOIs = useCallback((routeId: number) => {
    try {
      localStorage.removeItem(getStorageKey(routeId))
    } catch (error) {
      console.warn('[POILocalStorage] Failed to clear POIs:', error)
    }
  }, [])

  return { savePOIs, loadPOIs, clearPOIs }
}
