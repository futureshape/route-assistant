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

// Valid RideWithGPS POI type names
// Reference: https://github.com/ridewithgps/developers/blob/master/reference/points_of_interest.md
export type RideWithGPSPOIType = 
  | 'camping'
  | 'lodging'
  | 'parking'
  | 'food'
  | 'viewpoint'
  | 'restroom'
  | 'generic'
  | 'aid_station'
  | 'bar'
  | 'bike_shop'
  | 'bike_parking'
  | 'convenience_store'
  | 'first_aid'
  | 'hospital'
  | 'rest_stop'
  | 'trailhead'
  | 'geocache'
  | 'water'
  | 'control'
  | 'winery'
  | 'start'
  | 'stop'
  | 'finish'
  | 'atm'
  | 'caution'
  | 'coffee'
  | 'ferry'
  | 'gas'
  | 'library'
  | 'monument'
  | 'park'
  | 'segment_start'
  | 'segment_end'
  | 'shopping'
  | 'shower'
  | 'summit'
  | 'swimming'
  | 'transit'
  | 'bikeshare';

export interface POIResult {
  name: string; // Required
  lat: number; // Required
  lng: number; // Required
  poi_type_name: RideWithGPSPOIType; // Required - RideWithGPS POI type
  description?: string;
  url?: string;
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