import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchWithCSRFRetry } from '@/lib/csrf';
import { Loader2, X, ChevronsUpDown } from 'lucide-react';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps } from '@/lib/poi-providers';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

// Preset OSM tags relevant for cycling, using key=value consistently
// amenity=* reference: https://wiki.openstreetmap.org/wiki/Key:amenity
// railway=* reference: https://wiki.openstreetmap.org/wiki/Key:railway
const PRESET_TAGS = [
  { value: 'amenity=toilets', label: 'Toilets', description: 'Essential for breaks during long rides' },
  { value: 'amenity=drinking_water', label: 'Drinking Water', description: 'Refill water bottles / hydration station' },
  { value: 'amenity=water_point', label: 'Water Point', description: 'Large volume water source' },
  { value: 'amenity=shelter', label: 'Shelter', description: 'Protection from rain, wind, or sun' },
  { value: 'amenity=bench', label: 'Bench', description: 'Somewhere to sit and rest' },
  { value: 'amenity=shower', label: 'Shower', description: 'Useful for overnight stops' },
  { value: 'amenity=bicycle_parking', label: 'Bicycle Parking', description: 'Secure/marked bike parking' },
  { value: 'amenity=bicycle_repair_station', label: 'Bike Repair Station', description: 'Basic tools (pump, wrench)' },
  { value: 'amenity=compressed_air', label: 'Compressed Air', description: 'For pumping up tires' },
  { value: 'amenity=fuel', label: 'Fuel Station', description: 'Often sells snacks, water, sometimes bike items' },
  { value: 'amenity=restaurant', label: 'Restaurant', description: 'Places to eat and recharge' },
  { value: 'amenity=cafe', label: 'Cafe', description: 'Coffee and light meals' },
  { value: 'amenity=fast_food', label: 'Fast Food', description: 'Quick meals on the go' },
  { value: 'amenity=pharmacy', label: 'Pharmacy', description: 'First-aid supplies, painkillers, etc.' },
  { value: 'amenity=hospital', label: 'Hospital', description: 'In case of injury or health emergency' },
  { value: 'amenity=clinic', label: 'Clinic', description: 'Medical care facility' },
  { value: 'amenity=doctors', label: 'Doctor', description: 'Medical professional' },
  { value: 'amenity=parking', label: 'Parking', description: 'Rest area with space for pulling off road' },
  { value: 'amenity=post_office', label: 'Post Office', description: 'For sending or receiving items' },
  { value: 'amenity=vending_machine', label: 'Vending Machine', description: 'Quick snacks / drinks on the go' },
  { value: 'amenity=bus_station', label: 'Bus Station', description: 'Backup transport option' },
  { value: 'amenity=ferry_terminal', label: 'Ferry Terminal', description: 'Alternate transport option' },
  { value: 'railway=station', label: 'Train stations', description: 'Railway stations' },
];

// OSM POI Search Form Component
const OSMSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled, loading }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(a => a !== tag)
        : [...prev, tag]
    );
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(a => a !== tag));
  };

  const handleSearch = () => {
    onSearch({ textQuery: selectedTags.join(',') });
  };

  const selectedTagObjects = selectedTags.map(value => 
    PRESET_TAGS.find(tag => tag.value === value)
  ).filter(Boolean);

  const unselectedTags = PRESET_TAGS.filter(tag => 
    !selectedTags.includes(tag.value)
  );

  return (
    <div className="space-y-3">
      
      {/* Combobox for adding OSM key=value tags */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
            data-testid="osm-poi-types-button"
          >
            Add POI types ...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" data-testid="osm-poi-types-popover">
          <Command>
            <CommandInput placeholder="Search POI types ..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {unselectedTags.map((tag) => (
                  <CommandItem
                    key={tag.value}
                    value={tag.value}
                    keywords={[tag.label, tag.description]}
                    data-testid={`osm-poi-type-${tag.value}`}
                    data-poi-label={tag.label}
                    onSelect={() => {
                      handleToggleTag(tag.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{tag.label}</span>

                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected tags as tokens/badges */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1" data-testid="osm-selected-tags">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag?.value}
              variant="default"
              className="flex items-center gap-1 text-xs"
              data-testid={`osm-selected-tag-${tag?.value}`}
            >
              {tag?.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag?.value || '')}
              />
            </Badge>
          ))}
        </div>
      )}

      <Button 
        onClick={handleSearch} 
        size="sm" 
        disabled={disabled || loading || selectedTags.length === 0} 
        data-testid="osm-poi-search-button"
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
      throw new Error('OSM provider requires OSM tags (textQuery)');
    }

    // Prefer route-based search if available, fall back to map bounds
    if (!encodedPolyline && !mapBounds) {
      throw new Error('OSM provider requires either a route (encodedPolyline) or map bounds');
    }

  // Send generic `tags` payload using key=value tokens
  const payload = { tags: textQuery, encodedPolyline, mapBounds };
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
    
    // Show message if no POIs found
    if (places.length === 0) {
      throw new Error('Your search didn\'t find anything near your route. Try selecting different POI types or checking a different area.');
    }
    
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
