import { useState } from 'react'
import { Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface RouteSettingsProps {
  startDateTime: string
  averageSpeedKmh: number
  onSave: (startDateTime: string, averageSpeedKmh: number) => void
}

function formatSummaryDateTime(dt: string): string {
  try {
    return new Date(dt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dt
  }
}

export function RouteSettings({
  startDateTime,
  averageSpeedKmh,
  onSave,
}: RouteSettingsProps) {
  const [open, setOpen] = useState(false)
  const [draftDateTime, setDraftDateTime] = useState(startDateTime)
  const [draftSpeed, setDraftSpeed] = useState(averageSpeedKmh)

  const hasTimingSet = !!startDateTime

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDraftDateTime(startDateTime)
      setDraftSpeed(averageSpeedKmh)
    }
    setOpen(isOpen)
  }

  const handleSave = () => {
    onSave(draftDateTime, draftSpeed)
    setOpen(false)
  }

  const popoverContent = (
    <PopoverContent className="w-72" align="start">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Start date &amp; time</Label>
          <Input
            type="datetime-local"
            value={draftDateTime}
            onChange={(e) => setDraftDateTime(e.target.value)}
            className="text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Average speed (km/h)</Label>
          <Input
            type="number"
            value={draftSpeed}
            onChange={(e) => setDraftSpeed(parseFloat(e.target.value) || 0)}
            min={1}
            max={200}
            step={0.5}
            className="text-xs h-8"
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSave}>
          Save
        </Button>
      </div>
    </PopoverContent>
  )

  if (hasTimingSet) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground leading-snug">
            Starting {formatSummaryDateTime(startDateTime)}, {averageSpeedKmh}&nbsp;km/h
          </span>
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 shrink-0">
                Edit
              </Button>
            </PopoverTrigger>
            {popoverContent}
          </Popover>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Timer className="h-4 w-4" />
            Set route timing
          </Button>
        </PopoverTrigger>
        {popoverContent}
      </Popover>
    </div>
  )
}
