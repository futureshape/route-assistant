import { useCallback } from 'react'

const STORAGE_KEY_PREFIX = 'route-assistant-timing-'

interface RouteTiming {
  startDateTime: string
  averageSpeedKmh: number
}

function getStorageKey(routeId: number): string {
  return `${STORAGE_KEY_PREFIX}${routeId}`
}

/**
 * Hook that provides localStorage persistence for route timing settings
 * (start date/time and average speed), keyed by RideWithGPS route ID.
 */
export function useRouteTimingLocalStorage() {
  const saveTiming = useCallback((routeId: number, timing: RouteTiming) => {
    try {
      localStorage.setItem(getStorageKey(routeId), JSON.stringify(timing))
    } catch (error) {
      console.warn('[RouteTimingLocalStorage] Failed to save timing:', error)
    }
  }, [])

  const loadTiming = useCallback((routeId: number): RouteTiming | null => {
    try {
      const stored = localStorage.getItem(getStorageKey(routeId))
      if (!stored) return null
      const parsed: unknown = JSON.parse(stored)
      if (typeof parsed !== 'object' || parsed === null) return null
      const obj = parsed as Record<string, unknown>
      if (typeof obj.startDateTime !== 'string') return null
      if (typeof obj.averageSpeedKmh !== 'number') return null
      return { startDateTime: obj.startDateTime, averageSpeedKmh: obj.averageSpeedKmh }
    } catch (error) {
      console.warn('[RouteTimingLocalStorage] Failed to load timing:', error)
      return null
    }
  }, [])

  return { saveTiming, loadTiming }
}
