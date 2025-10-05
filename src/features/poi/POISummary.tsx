import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface POISummaryProps {
  selectedCount: number
  selectedRouteId: number | null
  onSendPOIs: () => void
  sending: boolean
}

export function POISummary({ selectedCount, selectedRouteId, onSendPOIs, sending }: POISummaryProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>{selectedCount} new point{selectedCount !== 1 ? 's' : ''}</span>
      <Button 
        onClick={onSendPOIs} 
        size="sm" 
        className="ml-2"
        disabled={!selectedRouteId || sending}
      >
        {sending ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Sending...
          </>
        ) : (
          'Send to RideWithGPS'
        )}
      </Button>
    </div>
  )
}
