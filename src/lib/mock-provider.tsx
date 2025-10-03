import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithCSRFRetry } from '@/lib/csrf';
import { Loader2 } from 'lucide-react';
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
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
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
    const response = await fetchWithCSRFRetry('/api/poi-search/mock', { 
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