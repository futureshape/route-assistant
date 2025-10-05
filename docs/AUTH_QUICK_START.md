# Quick Start Guide: User Authentication System

## For Developers

### First Time Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (no changes needed):
   - The existing `.env` file already has all required variables
   - No additional configuration needed for the user system

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **Database auto-initialization**:
   - On first start, `route-assistant.db` will be created automatically
   - Schema, indexes, and tables are created automatically
   - No manual database setup required

### First User Setup (Bootstrap Admin)

When you first deploy the app:

1. **Sign in with your RideWithGPS account** via the web interface
2. **Provide your email** when prompted
3. **Verify your email** by clicking the link sent to your inbox (admins bypass access requirement but verification is still recommended)
4. **Check your user ID**:
   ```bash
   node admin-cli.js list
   ```

5. **Grant yourself admin access**:
   ```bash
   node admin-cli.js set-status <your_rwgps_id> beta
   node admin-cli.js set-role <your_rwgps_id> admin
   ```

6. **Refresh the page** - you now have full admin access!

## For Admins

### Approving Beta Testers

When a new user signs up:

1. **Check new signups**:
   ```bash
   node admin-cli.js list
   ```

2. **Approve a user**:
   ```bash
   node admin-cli.js approve 12345
   ```
   This sets their status to `beta` and grants access.

3. **User notification** (manual for now):
   - Email the user to let them know they've been approved
   - They'll have access on their next sign-in

### Managing Users

**List all users**:
```bash
node admin-cli.js list
```

**Approve a waitlist user**:
```bash
node admin-cli.js approve <rwgps_user_id>
```

**Change user status**:
```bash
# Put user back on waitlist
node admin-cli.js set-status <rwgps_user_id> waitlist

# Disable a user
node admin-cli.js set-status <rwgps_user_id> inactive

# Reactivate a user
node admin-cli.js set-status <rwgps_user_id> beta
```

**Grant/revoke admin access**:
```bash
# Make user an admin
node admin-cli.js set-role <rwgps_user_id> admin

# Remove admin access
node admin-cli.js set-role <rwgps_user_id> user
```

**Manage email verification**:
```bash
# Mark user's email as verified (bypass email verification)
node admin-cli.js verify-email <rwgps_user_id>

# Reset email verification (user must verify again)
node admin-cli.js reset-verification <rwgps_user_id>

# Resend verification email to user
node admin-cli.js resend-verification <rwgps_user_id>
```

### Batch Operations

Approve multiple users at once:
```bash
for id in 12345 67890 11111 22222; do
  node admin-cli.js approve $id
  echo "Approved user $id"
done
```

## User Experience

### New User Journey

1. **Sign In**: User clicks "Sign in with RideWithGPS"
2. **OAuth**: Redirected to RideWithGPS for authorization
3. **Email Collection**: Prompted to provide email address (required)
4. **Email Verification**: Verification email sent automatically with unique link
5. **Verification Required**: User must verify email to access app (sees "Email Verification Required" screen)
6. **Waitlist Screen**: If status is 'waitlist', sees waitlist message after verification
7. **Wait for Approval**: Admin approves user (sets status to 'beta' or 'active')
8. **Access Granted**: User has full access to app once both verified and approved

**Note**: Admins bypass the email verification requirement for access, but verification is still recommended.

### Waitlist User Experience

Users on the waitlist see:
- Clear message they're on the waitlist
- Their registered email address
- Explanation that they'll be notified when approved
- Logout button

### Approved User Experience

Once approved (status = `beta` or `active`) AND email verified:
- Full access to all features
- Can browse and select routes
- Can search for POIs
- Can add POIs to routes
- No restrictions

**Note**: Users need both approved status AND verified email for access (admins exempt from verification requirement).

### Admin User Experience

Admins have:
- Automatic access regardless of status
- Same features as regular users (for now)
- Future: admin dashboard for user management

## Database Management

### Viewing Database Directly

```bash
# Open SQLite shell
sqlite3 route-assistant.db

# List all users
SELECT * FROM users;

# Count users by status
SELECT status, COUNT(*) FROM users GROUP BY status;

# Find user by email
SELECT * FROM users WHERE email LIKE '%example.com';

# Exit SQLite
.exit
```

### Backup Database

```bash
# Create backup
cp route-assistant.db route-assistant.db.backup

# Restore from backup
cp route-assistant.db.backup route-assistant.db
```

### Reset Database

```bash
# Delete database (fresh start)
rm route-assistant.db

# Restart server - database will be recreated
npm run dev
```

## Troubleshooting

### "Database is locked" error

If you see this error:
1. Stop the server
2. Close any SQLite shell sessions
3. Restart the server

### User can't access app after approval

1. Verify status: `node admin-cli.js list`
2. Ensure status is `beta` or `active`
3. **Check email verification**: Ensure `Email Verified` column shows ✓
4. If unverified, either:
   - Ask user to check their email for verification link
   - Use `node admin-cli.js resend-verification <rwgps_user_id>` to resend
   - Use `node admin-cli.js verify-email <rwgps_user_id>` to manually verify
5. Ask user to log out and log back in
6. Check server logs for errors

### Admin CLI shows wrong data

The CLI always shows fresh data from the database. If data seems wrong:
1. Check you're running the CLI in the project directory
2. Verify the database file exists: `ls -la route-assistant.db`
3. Check server logs for database errors

### Email collection dialog won't close

This is expected behavior if email is not provided. User must:
1. Enter a valid email address
2. Click "Continue"
3. Wait for submission to complete

## Security Notes

### What to Protect

✅ **Secure**:
- `route-assistant.db` - Contains user emails (backup regularly)
- `.env` - Contains OAuth secrets and session secret
- Server logs - May contain user information

❌ **Don't commit**:
- `route-assistant.db` (already in .gitignore)
- `.env` (already in .gitignore)
- Database backups

### Best Practices

1. **Use strong SESSION_SECRET** in production
2. **Enable HTTPS** for production deployment
3. **Backup database regularly** (user data is valuable)
4. **Monitor failed login attempts** in logs
5. **Review user list periodically** for suspicious accounts

## API Integration

### For Frontend Developers

Check user status in components:
```typescript
const { authenticated, user } = useAuth()

if (!authenticated) {
  // Show sign-in button
}

if (user?.needsEmail) {
  // Show email collection dialog
}

if (!user?.emailVerified && user?.email && ['beta', 'active'].includes(user?.status)) {
  // Show email verification screen
}

if (user?.status === 'waitlist') {
  // Show waitlist screen
}

if (user?.status === 'beta' || user?.status === 'active') {
  // User has access - show full app (requires verified email unless admin)
}

if (user?.role === 'admin') {
  // User is admin - bypasses email verification requirement
}
```

### For Backend Developers

Protect endpoints with middleware:
```javascript
// Require authentication only
app.get('/api/some-endpoint', requireAuth, async (req, res) => {
  // User is authenticated
  // Access token: req.session.rwgps.access_token
  // User info: req.session.user
})

// Require authentication AND access (beta/active status)
app.get('/api/protected-endpoint', requireAuth, requireAccess, async (req, res) => {
  // User has access to the app
})

// Require admin role
app.get('/api/admin-endpoint', requireAuth, requireAdmin, async (req, res) => {
  // User is an admin
})
```

## Common Workflows

### Workflow 1: Launch Beta

1. Deploy app with authentication system
2. Sign in yourself, approve yourself as admin
3. Share app link with beta testers
4. As users sign up, approve them:
   ```bash
   node admin-cli.js list  # Check new signups
   node admin-cli.js approve <user_id>  # Approve - sends email notification automatically
   ```
5. Users receive email notification when approved (if Mailersend is configured)

### Workflow 2: Public Launch

When ready to go public:

1. Create a "public" status or change default status:
   ```javascript
   // In user-service.js, change default status
   createUser(rwgpsUserId, email, 'active', 'user')
   ```

2. Approve all waitlist users:
   ```bash
   sqlite3 route-assistant.db "UPDATE users SET status='active' WHERE status='waitlist';"
   ```

3. Update UI to remove waitlist messaging

### Workflow 3: Handle Abuse

If a user is abusing the system:

1. **Disable immediately**:
   ```bash
   node admin-cli.js set-status <user_id> inactive
   ```

2. **User loses access** on their next request

3. **Review their activity** in logs

4. **Delete user** if needed:
   ```bash
   sqlite3 route-assistant.db "DELETE FROM users WHERE rwgps_user_id = <user_id>;"
   ```

## Email Notifications

Route Assistant includes automated email notifications via Mailersend:

### Email Verification
When users provide their email:
- Verification email is sent automatically with a unique verification link
- User clicks the link to verify ownership of the email address
- Verification status is tracked in the database (`email_verified` field)
- Unverified emails can still be used for notifications, but verified status proves ownership

**Verification Flow**:
1. User enters email in email collection dialog
2. Email saved to database with `email_verified = 0` and unique token
3. Verification email sent with link: `https://yourdomain.com/verify-email?token=<token>`
4. User clicks link and is shown verification confirmation
5. Database updated with `email_verified = 1` and token cleared

### Beta Access Notification
When users are approved (waitlist → beta/active):
- Notification email sent automatically
- Informs user they now have access
- Sent via CLI approval or admin API

### Configuration

1. **Sign up for Mailersend** at [mailersend.com](https://www.mailersend.com)
2. **Create email templates** in Mailersend dashboard:
   - Email verification template (must include verification link button/URL)
   - Beta access notification template
3. **Configure environment variables** in `.env`:
   ```bash
   BASE_URL=https://yourdomain.com  # Used for verification links
   MAILERSEND_API_KEY=your_api_key
   MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
   MAILERSEND_FROM_NAME=Route Assistant
   MAILERSEND_VERIFICATION_TEMPLATE_ID=template_id
   MAILERSEND_BETA_ACCESS_TEMPLATE_ID=template_id
   ```

### Template Variables

Templates should support these variables:
- **Verification email**:
  - `user_name` - User's name or email
  - `user_email` - User's email address
  - `verification_url` - Complete URL for email verification
- **Beta access email**:
  - `user_name` - User's name or email
  - `user_email` - User's email address
  - `access_level` - "beta" or "full"

**Note**: Email notifications are optional. The app functions normally without Mailersend configured.

## Future Enhancements

When you're ready to add these features:

### Web Admin Interface

1. Create admin UI components
2. Use existing admin API endpoints
3. Add to navigation when `user?.role === 'admin'`

### Billing Integration

1. Add Stripe user IDs to database
2. Create plan/subscription status fields
3. Update access checks to consider billing
4. User table is already designed for this!

## Support

For questions or issues:
1. Check server logs for errors
2. Review `docs/ADMIN_GUIDE.md` for detailed operations
3. Check `docs/AUTH_IMPLEMENTATION.md` for implementation details
4. Review this quick start guide

---

**You're all set!** The authentication system is ready to use. Start by setting up your admin account and approving your first beta testers.
