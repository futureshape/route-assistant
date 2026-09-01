# Admin Operations Guide

## Overview

User management is done via `wrangler d1 execute` — direct SQL against the Cloudflare D1 database. Append `--remote` to run against production; omit it for local dev.

## User Statuses

- **`waitlist`**: Signed up, not yet approved (default for new users)
- **`beta`**: Beta tester with full access
- **`active`**: Regular active user (for future use)
- **`inactive`**: Account disabled

## User Roles

- **`user`**: Regular user (default)
- **`admin`**: Administrator; automatic access regardless of status

## Managing Users via D1

All commands below target the local D1 database. Add `--remote` for production.

### List All Users

```bash
wrangler d1 execute route-assistant-db --command "
SELECT id, rwgps_user_id, email, email_verified, status, role, created_at
FROM users ORDER BY created_at DESC"
```

### Approve a User (Beta Access)

```bash
wrangler d1 execute route-assistant-db --remote --command "
UPDATE users SET status='beta', updated_at=datetime('now')
WHERE rwgps_user_id=12345"
```

### Change User Status

```bash
# Disable a user
wrangler d1 execute route-assistant-db --remote --command "
UPDATE users SET status='inactive', updated_at=datetime('now')
WHERE rwgps_user_id=12345"

# Reactivate a user
wrangler d1 execute route-assistant-db --remote --command "
UPDATE users SET status='beta', updated_at=datetime('now')
WHERE rwgps_user_id=12345"
```

### Grant Admin Access

```bash
wrangler d1 execute route-assistant-db --remote --command "
UPDATE users SET role='admin', updated_at=datetime('now')
WHERE rwgps_user_id=12345"
```

### Manually Verify Email

```bash
wrangler d1 execute route-assistant-db --remote --command "
UPDATE users SET email_verified=1, email_verification_token=NULL, updated_at=datetime('now')
WHERE rwgps_user_id=12345"
```

### Find User by Email

```bash
wrangler d1 execute route-assistant-db --command "
SELECT * FROM users WHERE email='user@example.com'"
```

### User Statistics

```bash
wrangler d1 execute route-assistant-db --command "
SELECT status, COUNT(*) as count FROM users GROUP BY status"
```

## Managing Users via Admin API

Authenticated admins can also use the REST API:

```
GET  /api/admin/users                  — List all users
PATCH /api/admin/users/:rwgpsUserId    — Update user fields
```

PATCH body (all fields optional):
```json
{ "status": "beta", "role": "admin", "email": "user@example.com" }
```

Note: Promoting a user from `waitlist` to `beta`/`active` via the API automatically sends a beta access notification email (if Mailersend is configured).

## User Authentication Flow

1. User authenticates with RideWithGPS OAuth
2. Worker creates user record with `status=waitlist`
3. User provides email → verification email sent automatically
4. User must verify email before accessing the app
5. Admin approves user: sets `status=beta`
6. User refreshes → full access granted

**Admins** bypass email verification but still need approved status.

## Bootstrap: First Admin Setup

1. Sign in with your RideWithGPS account
2. Provide your email when prompted
3. Find your user record:
   ```bash
   wrangler d1 execute route-assistant-db --remote --command "
   SELECT rwgps_user_id, email, status, role FROM users ORDER BY created_at LIMIT 5"
   ```
4. Grant yourself admin access and approve:
   ```bash
   wrangler d1 execute route-assistant-db --remote --command "
   UPDATE users SET status='beta', role='admin', email_verified=1, updated_at=datetime('now')
   WHERE rwgps_user_id=YOUR_ID"
   ```
5. Refresh the page

## Batch Approve Users

```bash
for id in 12345 67890 11111; do
  wrangler d1 execute route-assistant-db --remote --command \
    "UPDATE users SET status='beta', updated_at=datetime('now') WHERE rwgps_user_id=$id"
  echo "Approved $id"
done
```

## Security Notes

- `--remote` mutations are immediate and irreversible
- Admin API endpoints require authentication and admin role
- D1 console in Cloudflare dashboard provides a SQL editor as an alternative


## User Statuses

The application supports the following user statuses:

- **`waitlist`**: User has signed up but not yet approved (default for new users)
- **`beta`**: Beta tester with full access to the application
- **`active`**: Regular active user (for future use when app is public)
- **`inactive`**: User account disabled

## User Roles

- **`user`**: Regular user (default)
- **`admin`**: Administrator with access to admin features

## Managing Users via CLI

### List All Users

```bash
node admin-cli.js list
```

This displays all users in a table format showing:
- Database ID
- RideWithGPS user ID
- Email address
- Current status
- Current role
- Creation date

### Approve a User (Beta Access)

To grant beta access to a user on the waitlist:

```bash
node admin-cli.js approve <rwgps_user_id>
```

Example:
```bash
node admin-cli.js approve 12345
```

This sets the user's status to `beta`, granting them full access to the application.

### Change User Status

To manually set a user's status:

```bash
node admin-cli.js set-status <rwgps_user_id> <status>
```

Valid statuses: `waitlist`, `beta`, `active`, `inactive`

Example:
```bash
node admin-cli.js set-status 12345 inactive
```

### Grant Admin Access

To give a user admin privileges:

```bash
node admin-cli.js set-role <rwgps_user_id> admin
```

Example:
```bash
node admin-cli.js set-role 12345 admin
```

**Note**: Admin users automatically have access to the application regardless of their status.

## Managing Users via Admin API

If you have admin access, you can also manage users through the web interface (to be implemented) or via API calls.

### Get All Users

```
GET /api/admin/users
```

Requires admin authentication.

### Update User

```
PATCH /api/admin/users/:rwgpsUserId
```

Request body:
```json
{
  "status": "beta",
  "role": "user",
  "email": "user@example.com"
}
```

All fields are optional. Only provided fields will be updated.

## User Authentication Flow

1. **First Sign-In**:
   - User authenticates with RideWithGPS OAuth
   - System creates user record with status `waitlist`
   - User is prompted to provide email address
   - User sees waitlist screen

2. **After Approval**:
   - Admin approves user (sets status to `beta`)
   - On next login, user has full access to the application

3. **Notification** (Future):
   - When user is approved, they should receive an email notification
   - This requires email integration (not yet implemented)

## Database Access

The user database is stored in `route-assistant.db` at the project root.

You can also query the database directly using SQLite:

```bash
sqlite3 route-assistant.db "SELECT * FROM users;"
```

**Warning**: Direct database manipulation should be done with caution. Use the admin CLI for safety.

## Common Tasks

### Grant Beta Access to First Admin

1. Sign in to the application with your RideWithGPS account
2. Note your RideWithGPS user ID from the database:
   ```bash
   node admin-cli.js list
   ```
3. Set yourself as admin with beta access:
   ```bash
   node admin-cli.js set-status <your_rwgps_id> beta
   node admin-cli.js set-role <your_rwgps_id> admin
   ```

### Batch Approve Users

To approve multiple users, you can use a shell loop:

```bash
for id in 12345 67890 11111; do
  node admin-cli.js approve $id
done
```

## Security Notes

- The admin CLI requires file system access to the database
- Only run admin commands on the server where the database is located
- Admin API endpoints require authentication and admin role
- All user management operations are logged in the application logs

## Future Enhancements

- Web-based admin interface
- Email notifications for status changes
- Bulk user import/export
- User activity tracking
- Automated approval based on criteria
