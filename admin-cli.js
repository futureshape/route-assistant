/**
 * Admin CLI tool for managing Route Assistant users
 * 
 * Usage:
 *   node admin-cli.js list                              - List all users
 *   node admin-cli.js approve <rwgps_user_id>          - Approve user (set status to 'beta')
 *   node admin-cli.js set-status <rwgps_user_id> <status> - Set user status (waitlist|beta|active|inactive)
 *   node admin-cli.js set-role <rwgps_user_id> <role>  - Set user role (user|admin)
 *   node admin-cli.js verify-email <rwgps_user_id>     - Mark user email as verified
 *   node admin-cli.js reset-verification <rwgps_user_id> - Reset email verification (mark as unverified)
 *   node admin-cli.js find-email <email>               - Find user by email address
 *   node admin-cli.js remove-user <rwgps_user_id>      - Remove user from database (for testing)
 *   node admin-cli.js stats                            - Show user statistics
 */

// Load environment variables from .env file (for CLI usage)
require('dotenv').config();

const { getDatabase } = require('./db');
const userService = require('./user-service');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Route Assistant Admin CLI');
  console.log('========================\n');
  console.log('Usage:');
  console.log('  node admin-cli.js list                                    - List all users');
  console.log('  node admin-cli.js approve <rwgps_user_id>                 - Approve user (set status to \'beta\')');
  console.log('  node admin-cli.js set-status <rwgps_user_id> <status>     - Set user status');
  console.log('  node admin-cli.js set-role <rwgps_user_id> <role>         - Set user role');
  console.log('  node admin-cli.js verify-email <rwgps_user_id>            - Mark user email as verified');
  console.log('  node admin-cli.js reset-verification <rwgps_user_id>      - Reset email verification');
  console.log('  node admin-cli.js find-email <email>                      - Find user by email address');
  console.log('  node admin-cli.js remove-user <rwgps_user_id>             - Remove user from database (for testing)');
  console.log('  node admin-cli.js stats                                   - Show user statistics');
  console.log('');
  console.log('Valid Status Values:');
  console.log('  waitlist  - User has signed up but not approved yet');
  console.log('  beta      - Beta tester with full access');
  console.log('  active    - Regular active user (for future use)');
  console.log('  inactive  - User account disabled');
  console.log('');
  console.log('Valid Role Values:');
  console.log('  user      - Regular user');
  console.log('  admin     - Administrator with access to admin features');
  console.log('');
  console.log('Examples:');
  console.log('  node admin-cli.js list');
  console.log('  node admin-cli.js approve 1625496');
  console.log('  node admin-cli.js set-status 1625496 beta');
  console.log('  node admin-cli.js set-role 1625496 admin');
  console.log('  node admin-cli.js find-email user@example.com');
  console.log('  node admin-cli.js remove-user 1625496');
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
      'Email Verified': u.email_verified ? '✓' : '✗',
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
    console.log(`  Email Verified: ${updated.email_verified ? 'Yes' : 'No'}`);
    console.log(`  Status: ${updated.status}`);
    break;
  }

  case 'set-status': {
    const rwgpsUserId = parseInt(args[1]);
    const status = args[2];

    if (!rwgpsUserId || !status) {
      console.error('Error: RWGPS user ID and status required');
      console.error('Run "node admin-cli.js" without arguments to see valid statuses');
      process.exit(1);
    }

    const validStatuses = ['waitlist', 'beta', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      console.error(`Error: Invalid status '${status}'`);
      console.error('Valid statuses: waitlist, beta, active, inactive');
      console.error('Run "node admin-cli.js" without arguments for more details');
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
    console.log(`  Email Verified: ${updated.email_verified ? 'Yes' : 'No'}`);
    console.log(`  Status: ${updated.status}`);
    break;
  }

  case 'set-role': {
    const rwgpsUserId = parseInt(args[1]);
    const role = args[2];

    if (!rwgpsUserId || !role) {
      console.error('Error: RWGPS user ID and role required');
      console.error('Run "node admin-cli.js" without arguments to see valid roles');
      process.exit(1);
    }

    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      console.error(`Error: Invalid role '${role}'`);
      console.error('Valid roles: user, admin');
      console.error('Run "node admin-cli.js" without arguments for more details');
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
    console.log(`  Email Verified: ${updated.email_verified ? 'Yes' : 'No'}`);
    console.log(`  Role: ${updated.role}`);
    break;
  }

  case 'verify-email': {
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

    if (!user.email) {
      console.error('Error: User has no email address to verify');
      process.exit(1);
    }

    // Manually mark email as verified
    const { getDatabase } = require('./db');
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE users 
      SET email_verified = 1, email_verification_token = NULL, updated_at = datetime('now')
      WHERE rwgps_user_id = ?
    `);
    stmt.run(rwgpsUserId);

    const updated = userService.findUserByRwgpsId(rwgpsUserId);
    console.log(`✓ Email verified for user (RWGPS ID: ${rwgpsUserId})`);
    console.log(`  Email: ${updated.email}`);
    console.log(`  Email Verified: Yes`);
    break;
  }

  case 'reset-verification': {
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

    if (!user.email) {
      console.error('Error: User has no email address');
      process.exit(1);
    }

    // Reset email verification
    const { getDatabase } = require('./db');
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE users 
      SET email_verified = 0, email_verification_token = NULL, updated_at = datetime('now')
      WHERE rwgps_user_id = ?
    `);
    stmt.run(rwgpsUserId);

    const updated = userService.findUserByRwgpsId(rwgpsUserId);
    console.log(`✓ Email verification reset for user (RWGPS ID: ${rwgpsUserId})`);
    console.log(`  Email: ${updated.email}`);
    console.log(`  Email Verified: No`);
    break;
  }

  case 'find-email': {
    const email = args[1];
    if (!email) {
      console.error('Error: Email address required');
      process.exit(1);
    }

    const user = userService.findUserByEmail(email);
    if (!user) {
      console.log(`No user found with email: ${email}`);
      process.exit(0);
    }

    console.log(`\n=== User Found ===\n`);
    console.table([{
      ID: user.id,
      'RWGPS ID': user.rwgps_user_id,
      Email: user.email,
      'Email Verified': user.email_verified ? 'Yes' : 'No',
      Status: user.status,
      Role: user.role,
      Created: new Date(user.created_at).toLocaleDateString(),
      Updated: new Date(user.updated_at).toLocaleDateString()
    }]);
    break;
  }

  case 'stats': {
    const users = userService.getAllUsers();
    const stats = {
      total: users.length,
      byStatus: {},
      byRole: {},
      emailStats: {
        withEmail: 0,
        verified: 0,
        unverified: 0,
        noEmail: 0
      }
    };

    users.forEach(user => {
      // Status stats
      stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
      
      // Role stats
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      
      // Email stats
      if (user.email) {
        stats.emailStats.withEmail++;
        if (user.email_verified) {
          stats.emailStats.verified++;
        } else {
          stats.emailStats.unverified++;
        }
      } else {
        stats.emailStats.noEmail++;
      }
    });

    console.log('\n=== User Statistics ===\n');
    console.log(`Total Users: ${stats.total}\n`);
    
    console.log('By Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\nBy Role:');
    Object.entries(stats.byRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    console.log('\nEmail Statistics:');
    console.log(`  Users with email: ${stats.emailStats.withEmail}`);
    console.log(`  Email verified: ${stats.emailStats.verified}`);
    console.log(`  Email unverified: ${stats.emailStats.unverified}`);
    console.log(`  No email: ${stats.emailStats.noEmail}`);
    
    if (stats.emailStats.withEmail > 0) {
      const verificationRate = ((stats.emailStats.verified / stats.emailStats.withEmail) * 100).toFixed(1);
      console.log(`  Verification rate: ${verificationRate}%`);
    }
    console.log('');
    break;
  }

  case 'remove-user': {
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

    // Show user details before deletion
    console.log(`\n⚠️  WARNING: About to delete user:`);
    console.log(`  RWGPS ID: ${user.rwgps_user_id}`);
    console.log(`  Email: ${user.email || '(not provided)'}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${new Date(user.created_at).toLocaleDateString()}`);

    // Confirmation prompt
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nAre you sure you want to delete this user? This cannot be undone. (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        // Delete the user using the service
        const deleted = userService.deleteUser(rwgpsUserId);

        if (deleted) {
          console.log(`✓ User deleted successfully (RWGPS ID: ${rwgpsUserId})`);
          console.log('  User can now sign up again from scratch');
        } else {
          console.error('Error: Failed to delete user');
        }
      } else {
        console.log('User deletion cancelled');
      }
      rl.close();
    });
    return; // Don't break here since we're handling async readline
  }

  default:
    console.error(`Error: Unknown command '${command}'`);
    process.exit(1);
}
