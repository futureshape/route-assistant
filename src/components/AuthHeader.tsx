import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { LogOut, User as UserIcon } from 'lucide-react'
import { fetchWithCSRFRetry } from '@/lib/csrf'
import { SessionUser } from '@/types/user'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'

interface AuthHeaderProps {
  authenticated: boolean
  user: SessionUser | null
  onAuthChange: () => void
}

export function AuthHeader({ authenticated, user, onAuthChange }: AuthHeaderProps) {
  const { confirmAction } = useUnsavedChanges()

  const handleLogin = () => {
    window.location.href = '/auth/ridewithgps'
  }

  const handleLogout = async () => {
    // Check for unsaved changes before logging out
    if (!confirmAction('sign out')) {
      return
    }
    
    try {
      const response = await fetchWithCSRFRetry('/api/logout', { method: 'POST' })
      if (response.ok) {
        onAuthChange()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!authenticated || !user) {
    return (
      <div className="p-4 border-b border-sidebar-border">
        <Button 
          onClick={handleLogin} 
          variant="default"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          Sign in with RideWithGPS
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 border-b border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start p-0 h-auto hover:bg-sidebar-accent"
          >
            <div className="flex items-center space-x-3 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src="/ridewithgps-logo.png" 
                  alt="RideWithGPS"
                  onLoad={() => console.log('Avatar image loaded successfully')}
                  onError={(e) => {
                    console.error('Avatar image failed to load:', e)
                    console.log('Trying to load:', '/ridewithgps-logo.png')
                  }}
                />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  RW
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </div>
                {user.email && (
                  <div className="text-xs text-sidebar-muted-foreground">
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56 bg-white border border-gray-200 shadow-md"
          side="right"
        >
          <DropdownMenuItem 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => window.open(`https://ridewithgps.com/users/${user.rwgpsUserId}`, '_blank')}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="capitalize font-medium">{user.role}</div>
            <div className="capitalize">{user.status} access</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center space-x-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
