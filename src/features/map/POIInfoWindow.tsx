import { InfoWindow } from '@vis.gl/react-google-maps'
import { Link } from 'lucide-react'

interface POI {
  name: string
  lat: number
  lng: number
  poi_type_name?: string
  description?: string
  url?: string
  poiSource?: string
}

interface POIInfoWindowProps {
  poi: POI | null
  markerState: 'suggested' | 'selected' | 'existing'
  poiTypeNames: Record<string, string>
  onClose: () => void
  onUpdateState: (newState: 'suggested' | 'selected') => void
}

// Helper: get human-readable POI type name
function getPOITypeName(poiType: string, poiTypeNames: Record<string, string>): string {
  return poiTypeNames[poiType] || poiType || 'Unknown'
}

// Helper function to format URL for display
function formatURLForDisplay(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const maxLength = 40;
    
    if (url.length <= maxLength) {
      return url;
    }
    
    // Show domain and crop the rest
    const pathAndQuery = urlObj.pathname + urlObj.search;
    const remaining = maxLength - domain.length - 3; // 3 for "..."
    
    if (pathAndQuery.length > remaining) {
      return domain + pathAndQuery.slice(0, remaining) + '...';
    }
    
    return domain + pathAndQuery;
  } catch (e) {
    // If URL parsing fails, just truncate
    return url.length > 40 ? url.slice(0, 37) + '...' : url;
  }
}

export function POIInfoWindow({
  poi,
  markerState,
  poiTypeNames,
  onClose,
  onUpdateState
}: POIInfoWindowProps) {
  if (!poi) return null

  return (
    <InfoWindow
      position={{ lat: poi.lat, lng: poi.lng }}
      onCloseClick={onClose}
    >
      <div className="p-2 max-w-xs">
        <h3 className="font-bold text-sm mb-2">{poi.name}</h3>
        <div className="space-y-2">
          {/* POI Type */}
          {poi.poi_type_name && (
            <div className="text-xs text-gray-600">
              <span className="font-semibold">Type:</span> {getPOITypeName(poi.poi_type_name, poiTypeNames)}
            </div>
          )}
          
          {/* Description */}
          {poi.description && (
            <div className="text-xs text-gray-600">
              <span className="font-semibold">Description:</span> {poi.description}
            </div>
          )}
          
          {/* URL with icon and cropped display */}
          {poi.url && (
            <a 
              href={poi.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
              title={poi.url}
            >
              <Link className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatURLForDisplay(poi.url)}</span>
            </a>
          )}
          
          <div>
            {markerState === 'existing' ? (
              <div className="text-xs text-gray-500 italic mt-2">
                Existing POI
              </div>
            ) : markerState === 'suggested' ? (
              <button
                onClick={() => onUpdateState('selected')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium mt-2"
              >
                Keep
              </button>
            ) : (
              <button
                onClick={() => onUpdateState('suggested')}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium mt-2"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </InfoWindow>
  )
}
