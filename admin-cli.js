#!/usr/bin/env node

/**
 * Admin CLI tool for managing Route Assistant users
 * 
 * Usage:
 *   node admin-cli.js list                              - List all users
 *   node admin-cli.js approve <rwgps_user_id>          - Approve user (set status to 'beta')
 *   node admin-cli.js set-status <rwgps_user_id> <status> - Set user status (waitlist|beta|active|inactive)
 *   node admin-cli.js set-role <rwgps_user_id> <role>  - Set user role (user|admin)
 */

const { getDatabase } = require('./db');
const userService = require('./user-service');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Usage:');
  console.log('  node admin-cli.js list');
  console.log('  node admin-cli.js approve <rwgps_user_id>');
  console.log('  node admin-cli.js set-status <rwgps_user_id> <status>');
  console.log('  node admin-cli.js set-role <rwgps_user_id> <role>');
  process.exit(1);
}

// Initialize database
getDatabase();

switch (command) {
  case 'list': {
    const users = userService.getAllUsers();
    console.log('\n=== All Users ===\n');
    console.table(users.map(u => ({
      ID: u.id,
      'RWGPS ID': u.rwgps_user_id,
      Email: u.email || '(not provided)',
      Status: u.status,
      Role: u.role,
      Created: new Date(u.created_at).toLocaleDateString()
    })));
    console.log(`\nTotal users: ${users.length}\n`);
    break;
  }

  case 'approve': {
    const rwgpsUserId = parseInt(args[1]);
    if (!rwgpsUserId) {
      console.error('Error: RWGPS user ID required');
      process.exit(1);
    }

    const user = userService.findUserByRwgpsId(rwgpsUserId);
    if (!user) {
      console.error(`Error: User with RWGPS ID ${rwgpsUserId} not found`);
      process.exit(1);
    }

    const updated = userService.updateUserStatus(rwgpsUserId, 'beta');
    console.log(`✓ User approved (RWGPS ID: ${rwgpsUserId})`);
    console.log(`  Email: ${updated.email || '(not provided)'}`);
    console.log(`  Status: ${updated.status}`);
    break;
  }

  case 'set-status': {
    const rwgpsUserId = parseInt(args[1]);
    const status = args[2];

    if (!rwgpsUserId || !status) {
      console.error('Error: RWGPS user ID and status required');
      console.error('Valid statuses: waitlist, beta, active, inactive');
      process.exit(1);
    }

    const validStatuses = ['waitlist', 'beta', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      console.error(`Error: Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      process.exit(1);
    }

    const user = userService.findUserByRwgpsId(rwgpsUserId);
    if (!user) {
      console.error(`Error: User with RWGPS ID ${rwgpsUserId} not found`);
      process.exit(1);
    }

    const updated = userService.updateUserStatus(rwgpsUserId, status);
    console.log(`✓ User status updated (RWGPS ID: ${rwgpsUserId})`);
    console.log(`  Email: ${updated.email || '(not provided)'}`);
    console.log(`  Status: ${updated.status}`);
    break;
  }

  case 'set-role': {
    const rwgpsUserId = parseInt(args[1]);
    const role = args[2];

    if (!rwgpsUserId || !role) {
      console.error('Error: RWGPS user ID and role required');
      console.error('Valid roles: user, admin');
      process.exit(1);
    }

    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      console.error(`Error: Invalid role. Must be one of: ${validRoles.join(', ')}`);
      process.exit(1);
    }

    const user = userService.findUserByRwgpsId(rwgpsUserId);
    if (!user) {
      console.error(`Error: User with RWGPS ID ${rwgpsUserId} not found`);
      process.exit(1);
    }

    const updated = userService.updateUserRole(rwgpsUserId, role);
    console.log(`✓ User role updated (RWGPS ID: ${rwgpsUserId})`);
    console.log(`  Email: ${updated.email || '(not provided)'}`);
    console.log(`  Role: ${updated.role}`);
    break;
  }

  default:
    console.error(`Error: Unknown command '${command}'`);
    process.exit(1);
}
