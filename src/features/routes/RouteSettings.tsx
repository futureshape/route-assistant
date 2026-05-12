import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface RouteSettingsProps {
  startDateTime: string
  averageSpeedKmh: number
  onStartDateTimeChange: (value: string) => void
  onAverageSpeedChange: (value: number) => void
}

export function RouteSettings({
  startDateTime,
  averageSpeedKmh,
  onStartDateTimeChange,
  onAverageSpeedChange,
}: RouteSettingsProps) {
  return (
    <div className="space-y-2 px-1">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Start date &amp; time</Label>
        <Input
          type="datetime-local"
          value={startDateTime}
          onChange={(e) => onStartDateTimeChange(e.target.value)}
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Average speed (km/h)</Label>
        <Input
          type="number"
          value={averageSpeedKmh}
          onChange={(e) => onAverageSpeedChange(parseFloat(e.target.value) || 0)}
          min={1}
          max={200}
          step={0.5}
          className="text-xs h-8"
        />
      </div>
    </div>
  )
}
