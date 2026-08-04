#!/usr/bin/env node

const path = require('path');
const Database = require('better-sqlite3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const [dbPath, tableName] = process.argv.slice(2);
if (!dbPath || !tableName) {
  console.error('Usage: node scripts/migrate-users-to-dynamodb.js <sqlite-db-path> <users-table-name> [--apply]');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const db = new Database(path.resolve(dbPath), { readonly: true });
const users = db.prepare('SELECT * FROM users').all();
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

console.log(`Found ${users.length} user(s) in ${dbPath}. ${apply ? 'Writing records.' : 'Dry run only.'}`);

(async () => {
  for (const source of users) {
    const user = {
      id: source.rwgps_user_id,
      rwgps_user_id: source.rwgps_user_id,
      ...(source.email ? { email: source.email } : {}),
      ...(source.email_verification_token ? { email_verification_token: source.email_verification_token } : {}),
      email_verified: source.email_verified === 1,
      status: source.status,
      role: source.role,
      created_at: source.created_at,
      updated_at: source.updated_at,
    };
    console.log(`${apply ? 'Migrating' : 'Would migrate'} RWGPS user ${user.rwgps_user_id}`);
    if (apply) {
      await dynamoDb.send(new PutCommand({
        TableName: tableName,
        Item: user,
        ConditionExpression: 'attribute_not_exists(rwgps_user_id)',
      }));
    }
  }
  console.log(apply ? 'Migration completed.' : 'Run again with --apply to write these records.');
})().catch(error => {
  if (error.name === 'ConditionalCheckFailedException') {
    console.error('Migration stopped because a user already exists. No existing records were overwritten.');
  } else {
    console.error('Migration failed:', error.message);
  }
  process.exit(1);
});
