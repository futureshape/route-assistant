// Cloudflare Worker environment bindings and shared types

export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  ASSETS: Fetcher
  // Secrets (wrangler secret put)
  RWGPS_CLIENT_ID: string
  RWGPS_CLIENT_SECRET: string
  GOOGLE_API_KEY: string
  RWGPS_REDIRECT_URI?: string
  BASE_URL?: string
  MAILERSEND_API_KEY?: string
  MAILERSEND_FROM_EMAIL?: string
  MAILERSEND_FROM_NAME?: string
  MAILERSEND_VERIFICATION_TEMPLATE_ID?: string
  MAILERSEND_BETA_ACCESS_TEMPLATE_ID?: string
  // Config vars (wrangler.toml [vars])
  ENABLED_POI_PROVIDERS?: string
  RATE_LIMIT_DEBUG?: string
  GOOGLE_ROUTE_MAX_POINTS?: string
  OSM_ROUTE_MAX_POINTS?: string
  // Test mode
  TEST_MODE?: string
  TEST_OAUTH_TOKEN?: string
  NODE_ENV?: string
}

export interface SessionUser {
  dbId: number
  rwgpsUserId: number
  name: string
  email: string | null
  emailVerified: boolean
  status: string
  role: string
  needsEmail?: boolean
}

export interface SessionData {
  rwgps?: {
    access_token: string
    token_type: string
    scope?: string
    created_at: number
  }
  user?: SessionUser
  csrfToken?: string
}

export interface DbUser {
  id: number
  rwgps_user_id: number
  email: string | null
  email_verified: number
  email_verification_token: string | null
  status: string
  role: string
  created_at: string
  updated_at: string
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    session: SessionData
    sessionId: string
  }
}
