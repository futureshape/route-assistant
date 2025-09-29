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
            Learn how this app works and important information before you start.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            This app helps you quickly add "points of interest" (POIs, e.g. resupply points, landmarks, bailout options) to your RideWithGPS routes. You can search for POIs around your route (e.g. find supermarkets near your route) and quickly select a few and add them to your route.
          </p>
          <div className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-2 ml-4">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 mr-3 flex-shrink-0"></span>
                You need a RideWithGPS account (this app does not work with other route planning platforms)
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 mr-3 flex-shrink-0"></span>
                We don't keep copies of any of your routes or use any data for any other purposes
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 mr-3 flex-shrink-0"></span>
                This app is experimental so we recommend keeping a backup copy of your route
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-current rounded-full mt-2 mr-3 flex-shrink-0"></span>
                This app is not supported or endorsed in any way by RideWithGPS, if you have any issues then please contact us, not them
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={setDontShowAgain}
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