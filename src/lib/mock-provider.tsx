import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps } from '@/lib/poi-providers';

// Mock POI Search Form Component
const MockSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled, loading }) => {
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
        placeholder="Mock search (returns center pin)"
        disabled={disabled || loading}
      />
      <div className="flex gap-2">
        <Button onClick={handleSearch} size="sm" disabled={disabled || loading}>
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            'Mock Search'
          )}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        This mock provider returns a single POI at the center of the current map viewport for demonstration purposes.
      </div>
    </div>
  );
};

// Mock POI Provider Implementation
export class MockProvider implements POIProvider {
  id = 'mock';
  name = 'Mock Provider';
  description = 'Demo provider that returns a pin at the center of the viewport';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isEnabled(_context?: { mapBounds?: unknown }): boolean {
    // Mock provider is always enabled
    return true;
  }

  async searchPOIs(params: POISearchParams): Promise<POIResult[]> {
    const { textQuery, mapBounds } = params;
    
    const payload = { textQuery, mapBounds };
    const response = await fetch('/api/poi-search/mock', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Mock search failed: ${text}`);
    }

    interface MockPlace {
      displayName?: { text?: string }
      name?: string
      location?: { latitude?: number; longitude?: number; lat?: number; lng?: number }
      description?: string
      uri?: string
    }

    const data = await response.json();
    const places: MockPlace[] = data.places || [];
    
    return places.map((p): POIResult => {
      const loc = p.location || {};
      const lat = loc.latitude ?? loc.lat;
      const lng = loc.longitude ?? loc.lng;
      
      return { 
        name: p.displayName?.text || p.name || '', 
        lat: parseFloat(String(lat)), 
        lng: parseFloat(String(lng)),
        poi_type_name: 'generic',
        description: p.description || 'Mock POI for demonstration',
        url: p.uri || '',
        provider: this.id
      };
    }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  getSearchFormComponent() {
    return MockSearchForm;
  }
}