import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps, RideWithGPSPOIType } from '@/lib/poi-providers';

// Mapping from Google Places API primaryType to RideWithGPS POI types
// Google Places types: https://developers.google.com/maps/documentation/places/web-service/place-types
// RideWithGPS POI types: https://github.com/ridewithgps/developers/blob/master/reference/points_of_interest.md
const GOOGLE_TO_RIDEWITHGPS_MAPPING: Record<string, RideWithGPSPOIType> = {
  // Food & Drink
  'restaurant': 'food',
  'meal_takeaway': 'food',
  'meal_delivery': 'food',
  'food': 'food',
  'bakery': 'food',
  'bar': 'bar',
  'night_club': 'bar',
  'cafe': 'coffee',
  'coffee_shop': 'coffee',
  'winery': 'winery',
  'brewery': 'bar',
  
  // Lodging & Camping
  'lodging': 'lodging',
  'hotel': 'lodging',
  'motel': 'lodging',
  'guest_house': 'lodging',
  'hostel': 'lodging',
  'bed_and_breakfast': 'lodging',
  'campground': 'camping',
  'rv_park': 'camping',
  
  // Transportation & Parking
  'parking': 'parking',
  'gas_station': 'gas',
  'petrol_station': 'gas',
  'ferry_terminal': 'ferry',
  'airport': 'transit',
  'train_station': 'transit',
  'subway_station': 'transit',
  'bus_station': 'transit',
  'transit_station': 'transit',
  'taxi_stand': 'transit',
  
  // Healthcare & Safety
  'hospital': 'hospital',
  'pharmacy': 'first_aid',
  'doctor': 'first_aid',
  'dentist': 'first_aid',
  'veterinary_care': 'first_aid',
  
  // Shopping & Services
  'convenience_store': 'convenience_store',
  'supermarket': 'convenience_store',
  'grocery_store': 'convenience_store',
  'shopping_mall': 'shopping',
  'department_store': 'shopping',
  'clothing_store': 'shopping',
  'store': 'shopping',
  'atm': 'atm',
  'bank': 'atm',
  'library': 'library',
  
  // Recreation & Tourism
  'tourist_attraction': 'viewpoint',
  'amusement_park': 'viewpoint',
  'zoo': 'viewpoint',
  'aquarium': 'viewpoint',
  'museum': 'viewpoint',
  'art_gallery': 'viewpoint',
  'park': 'park',
  'national_park': 'park',
  'hiking_area': 'trailhead',
  'mountain_peak': 'summit',
  'natural_feature': 'viewpoint',
  'scenic_lookout': 'viewpoint',
  
  // Bike-specific
  'bicycle_store': 'bike_shop',
  
  // Sports & Recreation
  'gym': 'rest_stop',
  'spa': 'shower',
  'swimming_pool': 'swimming',
  'water_park': 'swimming',
  
  // Public facilities
  'restroom': 'restroom',
  'public_restroom': 'restroom',
};

function mapGoogleTypeToRideWithGPS(googleType: string | undefined): RideWithGPSPOIType {
  if (!googleType) return 'generic';
  const normalizedType = googleType.toLowerCase();
  return GOOGLE_TO_RIDEWITHGPS_MAPPING[normalizedType] || 'generic';
}

// Google Maps POI Search Form Component
const GoogleMapsSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled }) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (!query.trim()) {
      alert('Enter a search term');
      return;
    }
    onSearch({ textQuery: query });
  };

  return (
    <div className="space-y-2">
      <Input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
        placeholder="e.g., coffee, restroom, bike shop"
        disabled={disabled}
      />
      <div className="flex gap-2">
        <Button onClick={handleSearch} size="sm" disabled={disabled}>
          Search POIs
        </Button>
      </div>
    </div>
  );
};

// Google Maps POI Provider Implementation
export class GoogleMapsProvider implements POIProvider {
  id = 'google';
  name = 'Google Maps';
  description = 'Search for Points of Interest using Google Places API';

  isEnabled(context?: { routePath?: unknown[] }): boolean {
    // Google Maps provider requires a route to be loaded
    return !!(context?.routePath && context.routePath.length > 0);
  }

  async searchPOIs(params: POISearchParams): Promise<POIResult[]> {
    const { textQuery, encodedPolyline, routingOrigin } = params;
    
    if (!encodedPolyline) {
      throw new Error('Google Maps provider requires a route (encoded polyline)');
    }

    const payload = { textQuery, encodedPolyline, routingOrigin };
    const response = await fetch('/api/poi-search/google-maps', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Search failed: ${text}`);
    }

    interface GooglePlace {
      displayName?: { text?: string }
      name?: string
      location?: { latitude?: number; longitude?: number }
      geoCode?: { location?: { latitude?: number; longitude?: number } }
      geometry?: { location?: { lat?: number; lng?: number } }
      center?: { latitude?: number; longitude?: number; lat?: number; lng?: number; latLng?: { latitude?: number; longitude?: number } }
      primaryType?: string
      description?: string
      websiteUri?: string
      editorialSummary?: { text?: string }
      googleMapsUri?: string
    }

    const data = await response.json();
    const places: GooglePlace[] = data.places || [];
    
    return places.map((p) => {
      const loc = p.location || {};
      const lat = loc.latitude;
      const lng = loc.longitude;
      
      const primaryType = p.primaryType || 'establishment';
      
      return { 
        name: p.displayName?.text || p.name || '', 
        lat: parseFloat(String(lat)), 
        lng: parseFloat(String(lng)),
        poi_type_name: mapGoogleTypeToRideWithGPS(primaryType),
        description: p.editorialSummary?.text || '',
        url: p.googleMapsUri || '',
        provider: this.id
      };
    }).filter((p: POIResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  getSearchFormComponent() {
    return GoogleMapsSearchForm;
  }
}