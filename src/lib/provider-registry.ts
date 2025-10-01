import { POIProvider } from '@/lib/poi-providers';
import { GoogleMapsProvider } from '@/lib/google-maps-provider';
import { MockProvider } from '@/lib/mock-provider';
import { OSMProvider } from '@/lib/osm-provider';

// Registry of all available POI providers
const ALL_PROVIDERS: POIProvider[] = [
  new GoogleMapsProvider(),
  new OSMProvider(),
  new MockProvider(),
];

// Get all available providers
export function getAllProviders(): POIProvider[] {
  return ALL_PROVIDERS;
}

// Get provider by ID
export function getProviderById(id: string): POIProvider | undefined {
  return ALL_PROVIDERS.find(provider => provider.id === id);
}

// Get enabled providers based on server configuration
export async function getEnabledProviders(): Promise<POIProvider[]> {
  try {
    const response = await fetch('/api/poi-providers');
    const data = await response.json();
    const enabledIds = data.enabledProviders || ['google'];
    
    return ALL_PROVIDERS.filter(provider => enabledIds.includes(provider.id));
  } catch (error) {
    console.error('Failed to fetch enabled providers, falling back to Google Maps only:', error);
    return ALL_PROVIDERS.filter(provider => provider.id === 'google');
  }
}