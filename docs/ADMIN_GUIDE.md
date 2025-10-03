# Admin Operations Guide

## Overview

This guide explains how to manage users in the Route Assistant application during the beta phase.

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
