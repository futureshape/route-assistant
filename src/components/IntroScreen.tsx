import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { setCookie, getCookie } from '@/lib/utils'

interface IntroScreenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntroScreen({ open, onOpenChange }: IntroScreenProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Sync checkbox state with cookie when dialog opens
  useEffect(() => {
    if (open) {
      const dismissed = getCookie('intro-screen-dismissed')
      setDontShowAgain(dismissed === 'true')
    }
  }, [open])

  const handleClose = () => {
    if (dontShowAgain) {
      setCookie('intro-screen-dismissed', 'true', 365)
    } else {
      // If checkbox is unchecked, clear the cookie by setting it to expire in the past
      setCookie('intro-screen-dismissed', '', -1)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Welcome to Route Assistant</DialogTitle>
          <DialogDescription>
            A few things to know before you get started
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Use this app to quickly find points of interest (e.g. resupply points, accommodation or landmarks) and bulk-add them to your RideWithGPS routes.
            </p>
          <ul className="text-sm text-muted-foreground list-disc ml-6">
            <li>
              You need a RideWithGPS account (this app does not work with other route planning platforms)
            </li>
            <li>
              We don't keep copies of any of your routes or the points you add, everything is sent directly to RideWithGPS
            </li>
            <li>
              We won't make any changes to your routes apart from adding your selected points of interest. However, this app is experimental so we do recommend <b>making a backup copy of your route</b> before using it, just in case
            </li>
            <li>
              This app is not supported or endorsed in any way by RideWithGPS, if you have any issues then please <a href="mailto:hello@route-assistant.com" className="underline">contact us</a>, not them
            </li>
          </ul>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label 
              htmlFor="dont-show-again" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show again
            </label>
          </div>
          <Button onClick={handleClose}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}