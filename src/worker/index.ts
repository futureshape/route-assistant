import { Hono } from 'hono'
import type { AppEnv } from './types'
import { sessionMiddleware } from './middleware/session'
import { csrfMiddleware } from './middleware/csrf'
import { authRoutes } from './routes/auth'
import { sessionRoutes } from './routes/api/session'
import { userRoutes } from './routes/api/user'
import { rwgpsRoutes } from './routes/api/routes'
import { poiRoutes } from './routes/api/poi'
import { adminRoutes } from './routes/api/admin'

const app = new Hono<AppEnv>()

// Session loaded/saved on every Worker-handled request
app.use('*', sessionMiddleware)

// CSRF validated on all non-GET requests
app.use('*', csrfMiddleware)

// OAuth routes
app.route('/auth', authRoutes)

// API routes
const api = new Hono<AppEnv>()
api.route('/', sessionRoutes)
api.route('/', userRoutes)
api.route('/', rwgpsRoutes)
api.route('/', poiRoutes)
api.route('/', adminRoutes)

app.route('/api', api)

export default app
