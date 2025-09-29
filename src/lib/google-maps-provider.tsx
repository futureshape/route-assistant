import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps } from '@/lib/poi-providers';

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

  async searchPOIs(params: POISearchParams): Promise<POIResult[]> {
    const { textQuery, encodedPolyline, routingOrigin } = params;
    
    if (!encodedPolyline) {
      throw new Error('Google Maps provider requires a route (encoded polyline)');
    }

    const payload = { textQuery, encodedPolyline, routingOrigin };
    const response = await fetch('/api/search-along-route', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Search failed: ${text}`);
    }

    const data = await response.json();
    const places = data.places || [];
    
    return places.map((p: any) => {
      const loc = p.location || p.geoCode?.location || p.geometry?.location || p.center || {};
      const lat = loc.latitude ?? loc.lat ?? loc.latLng?.latitude;
      const lng = loc.longitude ?? loc.lng ?? loc.latLng?.longitude;
      return { 
        name: p.displayName?.text || p.name || '', 
        googleMapsUri: p.googleMapsUri, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng),
        primaryType: p.primaryType || 'establishment',
        provider: this.id
      };
    }).filter((p: POIResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  getSearchFormComponent() {
    return GoogleMapsSearchForm;
  }
}