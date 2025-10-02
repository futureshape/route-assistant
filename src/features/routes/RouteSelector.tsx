import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'

interface Route {
  id: number
  name: string
  distance?: number
  elevation_gain?: number
}

interface RouteSelectorProps {
  routes: Route[]
  selectedRouteId: number | null
  value: string
  open: boolean
  routesLoading: boolean
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onRouteSelect: (route: Route) => void
}

// Helper: format distance (meters -> km) and elevation_gain (meters) from RWGPS route object
function formatRouteMetrics(route: Route) {
  if (!route || typeof route !== 'object') return { distanceText: null, elevationText: null }
  const distMeters = route.distance
  const elevMeters = route.elevation_gain
  const distanceText = (distMeters != null && Number.isFinite(distMeters)) ? `${(distMeters / 1000).toFixed(1)} km` : null
  const elevationText = (elevMeters != null && Number.isFinite(elevMeters)) ? `${Math.round(elevMeters)} m` : null
  return { distanceText, elevationText }
}

export function RouteSelector({
  routes,
  selectedRouteId,
  value,
  open,
  routesLoading,
  onOpenChange,
  onValueChange,
  onRouteSelect,
}: RouteSelectorProps) {
  return (
    <div className="p-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={routesLoading}
          >
            <span className="truncate">
              {routesLoading
                ? "Loading routes..."
                : value ? routes.find(r => r.id === Number(value))?.name || "Route not found" : "Select route..."
              }
            </span>
            {routesLoading ? (
              <Spinner className="text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronsUpDown className="opacity-50 flex-shrink-0" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search route..." className="h-9" />
            <CommandList>
              <CommandEmpty>
                {routesLoading ? "Loading routes..." : "No route found."}
              </CommandEmpty>
              <CommandGroup>
                {routes.map((route) => (
                  <CommandItem
                    key={route.id}
                    value={route.id.toString()}
                    keywords={[route.name]}
                    onSelect={(currentValue: string) => {
                      console.log('[Route Selection] onSelect triggered with ID:', currentValue)
                      console.log('[Route Selection] Current value state:', value)
                      console.log('[Route Selection] Available routes:', routes.length, routes.map(r => ({ id: r.id, name: r.name })))
                      
                      // Use the route ID directly
                      const selectedRoute = routes.find(r => r.id === Number(currentValue))
                      if (selectedRoute) {
                        onValueChange(currentValue === value ? "" : currentValue)
                        onOpenChange(false)
                        if (currentValue !== value) {
                          console.log('[Route Selection] Found route:', selectedRoute)
                          console.log('[Route Selection] Calling onRouteSelect with route:', selectedRoute.name)
                          onRouteSelect(selectedRoute)
                        } else {
                          console.log('[Route Selection] Clearing route selection')
                          // This case is handled by parent
                        }
                      } else {
                        console.warn('[Route Selection] No route found for ID:', currentValue)
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{route.name}</div>
                      {(() => {
                        const { distanceText, elevationText } = formatRouteMetrics(route)
                        if (!distanceText && !elevationText) return null
                        return (
                          <div className="text-xs text-muted-foreground">
                            {distanceText && <span className="mr-2">{distanceText}</span>}
                            {elevationText && <span>{elevationText}</span>}
                          </div>
                        )
                      })()}
                    </div>
                                          <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedRouteId === route.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
