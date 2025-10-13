import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithCSRFRetry } from '@/lib/csrf';
import { Loader2 } from 'lucide-react';
import { POIProvider, POISearchParams, POIResult, POISearchFormProps } from '@/lib/poi-providers';
import { useAlert } from '@/hooks/use-alert-dialog';

// Note: Google type mapping and description building is now handled on the backend
// This keeps the frontend simple and eliminates duplication

// Google Maps POI Search Form Component
const GoogleMapsSearchForm: React.FC<POISearchFormProps> = ({ onSearch, disabled, loading }) => {
  const [query, setQuery] = useState('');
  const { showAlert } = useAlert();

  const handleSearch = () => {
    if (!query.trim()) {
      showAlert('Please enter a search term');
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
        placeholder="e.g. coffee, 24hr petrol station"
        disabled={disabled || loading}
      />
      <div className="flex gap-2">
        <Button onClick={handleSearch} size="sm" disabled={disabled || loading || !query.trim()}>
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
        const response = await fetchWithCSRFRetry('/api/poi-from-place-id', {
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
  description = 'Search for anything you can find on Google Maps';

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
    const response = await fetchWithCSRFRetry('/api/poi-search/google-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Search failed: ${text}`);
    }

    const data = await response.json();
    const places: POIResult[] = data.places || [];

    // Backend provides fully formed POI objects, just ensure provider is set and filter invalid coords
    return places
      .map((p) => ({ ...p, provider: this.id }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  getSearchFormComponent() {
    return GoogleMapsSearchForm;
  }
}