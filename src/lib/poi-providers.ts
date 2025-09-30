// POI Provider interface and implementations

export interface POISearchParams {
  textQuery: string;
  encodedPolyline?: string;
  mapBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  routingOrigin?: {
    latitude: number;
    longitude: number;
  };
}

export interface POIResult {
  name: string; // Required
  lat: number; // Required
  lng: number; // Required
  type: string; // RideWithGPS POI type (defaults to 'generic')
  description?: string;
  url?: string;
  primaryType?: string; // Google-specific type for mapping
  provider: string;
}

export interface POIProvider {
  id: string;
  name: string;
  description: string;
  searchPOIs(params: POISearchParams): Promise<POIResult[]>;
  getSearchFormComponent(): React.ComponentType<POISearchFormProps>;
  isEnabled(context?: any): boolean;
}

export interface POISearchFormProps {
  onSearch: (params: POISearchParams) => void;
  disabled?: boolean;
}