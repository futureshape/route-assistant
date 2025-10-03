// User-related Type Definitions

export interface User {
  id: number
  name: string
  created_at: string
  updated_at: string
}

// Database user record
export interface DbUser {
  id: number
  rwgps_user_id: number
  email: string | null
  status: 'waitlist' | 'beta' | 'active' | 'inactive'
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

// Session user info
export interface SessionUser {
  dbId: number
  rwgpsUserId: number
  name: string
  email: string | null
  status: 'waitlist' | 'beta' | 'active' | 'inactive'
  role: 'user' | 'admin'
  needsEmail: boolean
}
