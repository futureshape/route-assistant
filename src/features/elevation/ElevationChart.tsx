import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface ElevationData {
  distance: number
  elevation: number
  lat: number
  lng: number
  index: number
}

interface ChartMouseState {
  activePayload?: Array<{
    payload: {
      lat?: number
      lng?: number
      elevation?: number
      distance?: number
    }
  }>
}

interface ElevationChartProps {
  elevationData: ElevationData[]
  showElevation: boolean
  routeColor: string
  onShowElevationChange: (show: boolean) => void
  onChartMouseMove: (state: ChartMouseState | null) => void
  onChartMouseLeave: () => void
}

// Chart configuration for elevation profile
const chartConfig = {
  elevation: {
    label: "Elevation",
    color: "var(--route-color)",
  },
} satisfies ChartConfig

// Custom tooltip for elevation chart
interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ElevationData
  }>
  label?: string | number
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div 
        className="bg-popover border border-border rounded-lg p-3 shadow-lg pointer-events-none"
        style={{ 
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <p className="font-medium text-sm text-popover-foreground whitespace-nowrap">{`Distance: ${Number(label).toFixed(1)} km`}</p>
        <p className="text-sm text-muted-foreground whitespace-nowrap">{`Elevation: ${Math.round(data.elevation)} m`}</p>
      </div>
    )
  }
  return null
}

export function ElevationChart({
  elevationData,
  showElevation,
  routeColor,
  onShowElevationChange,
  onChartMouseMove,
  onChartMouseLeave
}: ElevationChartProps) {
  return (
    <Collapsible open={showElevation} onOpenChange={onShowElevationChange}>
      <CollapsibleContent className="border-t">
        <Card className="rounded-none border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Elevation Profile</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showElevation ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {elevationData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={elevationData}
                    onMouseMove={onChartMouseMove}
                    onMouseLeave={onChartMouseLeave}
                  >
                    <XAxis 
                      dataKey="distance" 
                      tickFormatter={(value) => `${Number(value).toFixed(0)}km`}
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${Math.round(value)}m`}
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={<CustomTooltip />}
                      animationDuration={0}
                      animationEasing="linear"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="elevation"
                      stroke={routeColor}
                      fill={routeColor}
                      fillOpacity={0.6}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No elevation data available for this route
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
