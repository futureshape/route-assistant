import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface EmailVerificationProps {
  token: string
  onClose: () => void
}

export function EmailVerification({ token, onClose }: EmailVerificationProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus('already-verified')
            setMessage('Your email has already been verified.')
          } else {
            setStatus('success')
            setMessage('Your email has been verified successfully!')
          }
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to verify email. The link may be invalid or expired.')
        }
      } catch (err) {
        setStatus('error')
        setMessage('An error occurred while verifying your email. Please try again.')
        console.error('Email verification error:', err)
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === 'verifying' && (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            )}
            {status === 'already-verified' && (
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'verifying' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'already-verified' && 'Already Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'verifying' && (
            <Button 
              onClick={onClose} 
              className="w-full"
            >
              Continue to App
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
