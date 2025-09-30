import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

interface RoutePolylineProps {
  path: Array<{ lat: number; lng: number }>
  color: string
}

export function RoutePolyline({ path, color }: RoutePolylineProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !path || path.length === 0) return

    const polyline = new window.google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: color,
      strokeWeight: 4,
      strokeOpacity: 0.8
    })

    polyline.setMap(map)

    return () => {
      polyline.setMap(null)
    }
  }, [map, path, color])

  return null
}
