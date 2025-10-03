import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Clock, Mail } from 'lucide-react'

interface WaitlistScreenProps {
  email: string | null
  onLogout: () => void
}

export function WaitlistScreen({ email, onLogout }: WaitlistScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're on the Waitlist</CardTitle>
          <CardDescription>
            Thank you for your interest in Route Assistant!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Your email:</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {email || 'Not provided'}
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              We're currently in beta testing with a limited number of users. You'll receive an email notification when your access is approved.
            </p>
            <p>
              In the meantime, you can:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Follow us for updates</li>
              <li>Tell your cycling friends about Route Assistant</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onLogout}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
