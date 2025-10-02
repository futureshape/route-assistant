import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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
const GoogleMapsSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled, loading }) => {
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
        disabled={disabled || loading}
      />
      <div className="flex gap-2">
        <Button onClick={handleSearch} size="sm" disabled={disabled || loading}>
          {loading ? (
            <>
              <Spinner className="mr-2" />
              Searching...
            </>
          ) : (
            'Search POIs'
          )}
        </Button>
      </div>
    </div>
  );
};

// Function to set up Google Maps native POI click interception
export function setupGoogleMapsPOIClickListener(
  map: google.maps.Map,
  onPOIClick: (poi: POIResult) => void
): google.maps.MapsEventListener | null {
  if (!map) return null;

  const listener = map.addListener('click', async (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
    // Check if this is a POI click (has placeId)
    if ('placeId' in event && event.placeId) {
      console.log('[Google Maps POI] Clicked on native POI with place ID:', event.placeId);
      
      // Prevent the default info window from showing
      event.stop();
      
      try {
        // Fetch place details using our API
        const response = await fetch('/api/poi-from-place-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: event.placeId })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch place details: ${response.status}`);
        }

        const poi: POIResult = await response.json();
        console.log('[Google Maps POI] Fetched POI details:', poi);
        
        // Call the callback with the POI
        onPOIClick(poi);
      } catch (error) {
        console.error('[Google Maps POI] Error fetching place details:', error);
      }
    }
  });

  return listener;
}

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