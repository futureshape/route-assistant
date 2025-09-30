import { useState, useEffect } from 'react'
import { InfoWindow } from '@vis.gl/react-google-maps'
import { Link } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RideWithGPSPOIType } from '@/lib/poi-providers'

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
  onPOIUpdate?: (updatedPOI: Partial<POI>) => void
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

// Helper to validate URL
function isValidURL(url: string): boolean {
  if (!url) return true; // Empty is valid
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function POIInfoWindow({
  poi,
  markerState,
  poiTypeNames,
  onClose,
  onUpdateState,
  onPOIUpdate
}: POIInfoWindowProps) {
  const [editedName, setEditedName] = useState(poi?.name || '')
  const [editedType, setEditedType] = useState(poi?.poi_type_name || 'generic')
  const [editedDescription, setEditedDescription] = useState(poi?.description || '')
  const [editedUrl, setEditedUrl] = useState(poi?.url || '')
  const [urlError, setUrlError] = useState(false)

  // Reset state when POI changes
  useEffect(() => {
    if (poi) {
      setEditedName(poi.name || '')
      setEditedType(poi.poi_type_name || 'generic')
      setEditedDescription(poi.description || '')
      setEditedUrl(poi.url || '')
      setUrlError(false)
    }
  }, [poi])

  if (!poi) return null

  const isEditable = markerState !== 'existing'

  // Get all POI type options sorted alphabetically
  const poiTypeOptions = Object.entries(poiTypeNames).sort((a, b) => 
    a[1].localeCompare(b[1])
  )

  // Handle field updates
  const handleNameChange = (value: string) => {
    setEditedName(value)
    if (onPOIUpdate) {
      onPOIUpdate({ name: value })
    }
  }

  const handleTypeChange = (value: string) => {
    setEditedType(value)
    if (onPOIUpdate) {
      onPOIUpdate({ poi_type_name: value as RideWithGPSPOIType })
    }
  }

  const handleDescriptionChange = (value: string) => {
    setEditedDescription(value)
    if (onPOIUpdate) {
      onPOIUpdate({ description: value })
    }
  }

  const handleUrlChange = (value: string) => {
    setEditedUrl(value)
    const valid = isValidURL(value)
    setUrlError(!valid)
    if (valid && onPOIUpdate) {
      onPOIUpdate({ url: value })
    }
  }

  return (
    <InfoWindow
      position={{ lat: poi.lat, lng: poi.lng }}
      onCloseClick={onClose}
    >
      <div className="p-2 max-w-xs">
        <div className="space-y-2">
          {/* POI Name */}
          {isEditable ? (
            <Input
              value={editedName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="font-bold text-sm"
              placeholder="POI Name"
            />
          ) : (
            <h3 className="font-bold text-sm">{poi.name}</h3>
          )}
          
          {/* POI Type */}
          {isEditable ? (
            <Select value={editedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="text-xs h-8" tabIndex={0}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {poiTypeOptions.map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : poi.poi_type_name ? (
            <div className="text-xs text-gray-600">
              {getPOITypeName(poi.poi_type_name, poiTypeNames)}
            </div>
          ) : null}
          
          {/* Description */}
          {isEditable ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Description (optional)"
              className="text-xs min-h-[60px]"
            />
          ) : poi.description ? (
            <div className="text-xs text-gray-600">{poi.description}</div>
          ) : null}
          
          {/* URL */}
          {isEditable ? (
            <div>
              <div className="flex items-center gap-1">
                <Link className="h-3 w-3 flex-shrink-0 text-gray-500" />
                <Input
                  value={editedUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="URL (optional)"
                  className={`text-xs h-8 ${urlError ? 'border-red-500' : ''}`}
                />
              </div>
              {urlError && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
              )}
            </div>
          ) : poi.url ? (
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
          ) : null}
          
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
