import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps, RideWithGPSPOIType } from '@/lib/poi-providers';

// Preset OSM amenity tags relevant for cycling
// Based on https://wiki.openstreetmap.org/wiki/Key:amenity
const PRESET_AMENITIES = [
  { value: 'toilets', label: 'Toilets', description: 'Essential for breaks during long rides' },
  { value: 'drinking_water', label: 'Drinking Water', description: 'Refill water bottles / hydration station' },
  { value: 'water_point', label: 'Water Point', description: 'Large volume water source' },
  { value: 'shelter', label: 'Shelter', description: 'Protection from rain, wind, or sun' },
  { value: 'bench', label: 'Bench', description: 'Somewhere to sit and rest' },
  { value: 'shower', label: 'Shower', description: 'Useful for overnight stops' },
  { value: 'bicycle_parking', label: 'Bicycle Parking', description: 'Secure/marked bike parking' },
  { value: 'bicycle_repair_station', label: 'Bike Repair Station', description: 'Basic tools (pump, wrench)' },
  { value: 'compressed_air', label: 'Compressed Air', description: 'For pumping up tires' },
  { value: 'fuel', label: 'Fuel Station', description: 'Often sells snacks, water, sometimes bike items' },
  { value: 'restaurant', label: 'Restaurant', description: 'Places to eat and recharge' },
  { value: 'cafe', label: 'Cafe', description: 'Coffee and light meals' },
  { value: 'fast_food', label: 'Fast Food', description: 'Quick meals on the go' },
  { value: 'pharmacy', label: 'Pharmacy', description: 'First-aid supplies, painkillers, etc.' },
  { value: 'hospital', label: 'Hospital', description: 'In case of injury or health emergency' },
  { value: 'clinic', label: 'Clinic', description: 'Medical care facility' },
  { value: 'doctors', label: 'Doctor', description: 'Medical professional' },
  { value: 'parking', label: 'Parking', description: 'Rest area with space for pulling off road' },
  { value: 'post_office', label: 'Post Office', description: 'For sending or receiving items' },
  { value: 'vending_machine', label: 'Vending Machine', description: 'Quick snacks / drinks on the go' },
  { value: 'bus_station', label: 'Bus Station', description: 'Backup transport option' },
  { value: 'ferry_terminal', label: 'Ferry Terminal', description: 'Alternate transport option' },
];

// Mapping from OSM amenity tags to RideWithGPS POI types
// This mirrors the backend mapping in poi-type-mapping.js
const OSM_TO_RIDEWITHGPS_MAPPING: Record<string, RideWithGPSPOIType> = {
  // Essential cycling amenities
  'toilets': 'restroom',
  'drinking_water': 'water',
  'water_point': 'water',
  'shelter': 'rest_stop',
  'bench': 'rest_stop',
  'shower': 'shower',
  'bicycle_parking': 'bike_parking',
  'bicycle_repair_station': 'bike_shop',
  'compressed_air': 'bike_shop',
  
  // Food & Drink
  'restaurant': 'food',
  'cafe': 'coffee',
  'fast_food': 'food',
  'bar': 'bar',
  'pub': 'bar',
  'biergarten': 'bar',
  'food_court': 'food',
  'ice_cream': 'food',
  
  // Fuel & Vehicle Services
  'fuel': 'gas',
  
  // Healthcare & Safety
  'pharmacy': 'first_aid',
  'hospital': 'hospital',
  'clinic': 'hospital',
  'doctors': 'first_aid',
  'dentist': 'first_aid',
  'veterinary': 'first_aid',
  
  // General parking & rest areas
  'parking': 'parking',
  'parking_space': 'parking',
  
  // Postal services
  'post_office': 'generic',
  'post_box': 'generic',
  'parcel_locker': 'generic',
  
  // Vending & quick services
  'vending_machine': 'convenience_store',
  
  // Public transport
  'bus_station': 'transit',
  'ferry_terminal': 'ferry',
  'taxi': 'transit',
  
  // Shopping
  'marketplace': 'convenience_store',
  'bicycle_rental': 'bikeshare',
  
  // Other common amenities
  'telephone': 'generic',
  'waste_basket': 'generic',
  'recycling': 'generic',
  'charging_station': 'generic',
  'atm': 'atm',
  'bank': 'atm',
  'bureau_de_change': 'atm',
  'public_bookcase': 'library',
  'library': 'library',
  'community_centre': 'rest_stop',
  'social_facility': 'rest_stop',
  'townhall': 'generic',
  'police': 'first_aid',
  'fire_station': 'first_aid',
  'ranger_station': 'first_aid',
  'emergency_phone': 'first_aid',
  'place_of_worship': 'monument',
  'fountain': 'water',
  'watering_place': 'water',
  'bbq': 'rest_stop',
  'picnic_table': 'rest_stop',
};

function mapOSMAmenityToRideWithGPS(osmAmenity: string | undefined): RideWithGPSPOIType {
  if (!osmAmenity) return 'generic';
  const normalizedAmenity = osmAmenity.toLowerCase();
  return OSM_TO_RIDEWITHGPS_MAPPING[normalizedAmenity] || 'generic';
}

// OSM POI Search Form Component
const OSMSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled }) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'drinking_water',
    'toilets',
    'cafe',
  ]);

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSearch = () => {
    // Pass the selected amenities as a comma-separated textQuery
    onSearch({ textQuery: selectedAmenities.join(',') });
  };

  const handleSelectAll = () => {
    setSelectedAmenities(PRESET_AMENITIES.map(a => a.value));
  };

  const handleClearAll = () => {
    setSelectedAmenities([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Select Amenity Types:</div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectAll}
            disabled={disabled}
            className="h-7 text-xs"
          >
            Select All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearAll}
            disabled={disabled}
            className="h-7 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[300px] rounded-md border p-3">
        <div className="space-y-3">
          {PRESET_AMENITIES.map((amenity) => (
            <div key={amenity.value} className="flex items-start space-x-2">
              <Checkbox
                id={amenity.value}
                checked={selectedAmenities.includes(amenity.value)}
                onCheckedChange={() => handleToggleAmenity(amenity.value)}
                disabled={disabled}
              />
              <div className="grid gap-1 leading-none">
                <Label
                  htmlFor={amenity.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {amenity.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {amenity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{selectedAmenities.length} amenity type{selectedAmenities.length !== 1 ? 's' : ''} selected</span>
      </div>

      <Button 
        onClick={handleSearch} 
        size="sm" 
        disabled={disabled || selectedAmenities.length === 0} 
        className="w-full"
      >
        Search OSM POIs
      </Button>
      
      <div className="text-xs text-muted-foreground">
        Searches OpenStreetMap data via Overpass API along your route for selected amenity types.
      </div>
    </div>
  );
};

// OSM POI Provider Implementation
export class OSMProvider implements POIProvider {
  id = 'osm';
  name = 'OpenStreetMap';
  description = 'Search for cycling-relevant amenities from OpenStreetMap';

  isEnabled(context?: { routePath?: unknown[] }): boolean {
    // OSM provider requires a route to be loaded (for bounding box)
    return !!(context?.routePath && context.routePath.length > 0);
  }

  async searchPOIs(params: POISearchParams): Promise<POIResult[]> {
    const { textQuery, encodedPolyline, mapBounds } = params;
    
    if (!textQuery) {
      throw new Error('OSM provider requires amenity types (textQuery)');
    }

    // Prefer route-based search if available, fall back to map bounds
    if (!encodedPolyline && !mapBounds) {
      throw new Error('OSM provider requires either a route (encodedPolyline) or map bounds');
    }

    const payload = { amenities: textQuery, encodedPolyline, mapBounds };
    const response = await fetch('/api/poi-search/osm', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OSM search failed: ${text}`);
    }

    interface OSMElement {
      type: string
      id: number
      lat?: number
      lon?: number
      center?: { lat: number; lon: number }
      tags?: {
        name?: string
        amenity?: string
        description?: string
        website?: string
        [key: string]: string | undefined
      }
    }

    const data = await response.json();
    const elements: OSMElement[] = data.elements || [];
    
    return elements.map((element): POIResult => {
      // Get coordinates - nodes have lat/lon, ways/relations have center
      const lat = element.lat ?? element.center?.lat ?? 0;
      const lon = element.lon ?? element.center?.lon ?? 0;
      
      const tags = element.tags || {};
      const amenity = tags.amenity || 'unknown';
      const name = tags.name || `${amenity.charAt(0).toUpperCase() + amenity.slice(1).replace(/_/g, ' ')}`;
      
      return {
        name,
        lat: parseFloat(String(lat)),
        lng: parseFloat(String(lon)),
        poi_type_name: mapOSMAmenityToRideWithGPS(amenity),
        description: tags.description || '',
        url: tags.website || `https://www.openstreetmap.org/${element.type}/${element.id}`,
        provider: this.id
      };
    }).filter((p: POIResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  getSearchFormComponent() {
    return OSMSearchForm;
  }
}
