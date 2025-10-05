import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { POIProvider, POISearchParams } from '@/lib/poi-providers'
import { useMarkerStates, useMarkers } from '@/store/selectors'

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface POISearchProps {
  poiProviders: POIProvider[]
  activeAccordionItem: string
  routePath: Array<{ lat: number; lng: number }>
  mapBounds: MapBounds | null
  loadingProviderId: string | null
  onAccordionChange: (value: string) => void
  onPOISearch: (provider: POIProvider, params: POISearchParams) => void
  onClearMarkers: () => void
}

export function POISearch({
  poiProviders,
  activeAccordionItem,
  routePath,
  mapBounds,
  loadingProviderId,
  onAccordionChange,
  onPOISearch,
  onClearMarkers
}: POISearchProps) {
  const markerStates = useMarkerStates()
  const markers = useMarkers()
  // A POI is considered "suggested" if its stored state is not 'existing' or 'selected'.
  // Some suggested POIs may not have an explicit entry in markerStates (undefined),
  // but they should still be treated as suggested (the map rendering treats missing as suggested).
  const hasSuggestedPOIs = markers.some((poi) => {
    const key = `${poi.name}_${poi.lat}_${poi.lng}`
    const state = markerStates[key]
    return state !== 'existing' && state !== 'selected'
  })
  return (
    <div className="p-2 space-y-2">
      {poiProviders.length > 0 ? (
        <>
          <Accordion 
            type="single" 
            collapsible 
            value={activeAccordionItem}
            onValueChange={onAccordionChange}
          >
            {poiProviders.map((provider) => {
              const SearchForm = provider.getSearchFormComponent();
              const providerContext = { routePath, mapBounds };
              const isEnabled = provider.isEnabled(providerContext);
              const isLoading = loadingProviderId === provider.id;
              
              return (
                <AccordionItem key={provider.id} value={provider.id}>
                  <AccordionTrigger className="text-sm">
                    {provider.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                      <SearchForm 
                        onSearch={(params) => onPOISearch(provider, params)}
                        disabled={!isEnabled || isLoading}
                        loading={isLoading}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          <div className="pt-2">
              <Button onClick={onClearMarkers} variant="destructive" size="sm" className="w-full" disabled={!hasSuggestedPOIs}>
                Clear all suggested POIs
              </Button>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Loading POI providers...</div>
      )}
    </div>
  )
}
