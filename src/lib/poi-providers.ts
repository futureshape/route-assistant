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
  name: string;
  lat: number;
  lng: number;
  primaryType: string;
  googleMapsUri?: string;
  provider: string;
}

export interface POIProvider {
  id: string;
  name: string;
  description: string;
  searchPOIs(params: POISearchParams): Promise<POIResult[]>;
  getSearchFormComponent(): React.ComponentType<POISearchFormProps>;
}

export interface POISearchFormProps {
  onSearch: (params: POISearchParams) => void;
  disabled?: boolean;
}