import { useState, useEffect } from 'react'
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
import { User } from '@/types/user'

interface AuthHeaderProps {
  authenticated: boolean
  onAuthChange: () => void
}

export function AuthHeader({ authenticated, onAuthChange }: AuthHeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch user details when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchUserDetails()
    } else {
      setUser(null)
    }
  }, [authenticated])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.location.href = '/auth/ridewithgps'
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (response.ok) {
        setUser(null)
        onAuthChange()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!authenticated) {
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

  if (loading || !user) {
    return (
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-accent rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-sidebar-accent rounded animate-pulse mb-1" />
            <div className="h-3 bg-sidebar-accent rounded animate-pulse w-2/3" />
          </div>
        </div>
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
                <div className="text-xs text-sidebar-foreground/70">
                  {user.email}
                </div>
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
            onClick={() => window.open(`https://ridewithgps.com/users/${user.id}`, '_blank')}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
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
