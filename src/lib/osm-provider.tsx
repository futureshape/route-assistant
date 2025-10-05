import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchWithCSRFRetry } from '@/lib/csrf';
import { Loader2, X, ChevronsUpDown } from 'lucide-react';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps } from '@/lib/poi-providers';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

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

// OSM POI Search Form Component
const OSMSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled, loading }) => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleRemoveAmenity = (amenity: string) => {
    setSelectedAmenities(prev => prev.filter(a => a !== amenity));
  };

  const handleSearch = () => {
    onSearch({ textQuery: selectedAmenities.join(',') });
  };

  const selectedAmenityObjects = selectedAmenities.map(value => 
    PRESET_AMENITIES.find(amenity => amenity.value === value)
  ).filter(Boolean);

  const unselectedAmenities = PRESET_AMENITIES.filter(amenity => 
    !selectedAmenities.includes(amenity.value)
  );

  return (
    <div className="space-y-3">
      
      {/* Combobox for adding amenities */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            Add amenity types...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search amenity types..." />
            <CommandList>
              <CommandEmpty>No amenity types found.</CommandEmpty>
              <CommandGroup>
                {unselectedAmenities.map((amenity) => (
                  <CommandItem
                    key={amenity.value}
                    value={amenity.value}
                    onSelect={() => {
                      handleToggleAmenity(amenity.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{amenity.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {amenity.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected amenities as tokens/badges */}
      {selectedAmenities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedAmenityObjects.map((amenity) => (
            <Badge
              key={amenity?.value}
              variant="default"
              className="flex items-center gap-1 text-xs"
            >
              {amenity?.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveAmenity(amenity?.value || '')}
              />
            </Badge>
          ))}
        </div>
      )}

      <Button 
        onClick={handleSearch} 
        size="sm" 
        disabled={disabled || loading || selectedAmenities.length === 0} 
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Searching...
          </>
        ) : (
          'Search'
        )}
      </Button>
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
    const response = await fetchWithCSRFRetry('/api/poi-search/osm', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OSM search failed: ${text}`);
    }

    const data = await response.json();
    const places = data.places || [];
    
    // Set provider field for each POI to be consistent with other providers
    return places.map((poi: POIResult) => ({
      ...poi,
      provider: this.id
    }));
  }

  getSearchFormComponent() {
    return OSMSearchForm;
  }
}
