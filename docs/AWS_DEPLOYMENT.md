# AWS serverless deployment

This deployment uses AWS SAM to create all AWS resources: a private S3 bucket, CloudFront distribution, HTTP API, Lambda function, and on-demand DynamoDB user/session tables. No domain is required for initial testing—the CloudFront URL produced by the stack is the temporary HTTPS URL.

## Prerequisites

- An AWS account and a configured AWS CLI identity with permission to create CloudFormation, Lambda, API Gateway, CloudFront, S3, DynamoDB, and IAM resources.
- AWS SAM CLI.
- Node.js and npm.
- A RideWithGPS OAuth application, Google Maps API key, and optionally MailerSend credentials.

## First deployment

1. Copy `/home/runner/work/route-assistant/route-assistant/.env.aws.example` to `.env.aws` and supply the required values. Generate `SESSION_SECRET` with a cryptographically secure random generator.
2. Run:

   ```bash
   cd /home/runner/work/route-assistant/route-assistant
   npm run deploy:aws
   ```

   To use a differently named stack or region:

   ```bash
   STACK_NAME=route-assistant-test AWS_REGION=us-east-1 npm run deploy:aws
   ```

3. The command builds the frontend, provisions or updates the stack, uploads `dist/` to the private S3 bucket, and prints `SiteUrl` and `OAuthCallbackUrl`.
4. Register the exact `OAuthCallbackUrl` in the RideWithGPS OAuth application, then browse to `SiteUrl` and complete the OAuth flow.

CloudFront can take several minutes to distribute a new deployment. Run the same command for subsequent application or infrastructure updates.

## Existing users

The application starts with an empty DynamoDB user table. Before production cutover, take a copy of the SQLite database and verify a dry run:

```bash
node scripts/migrate-users-to-dynamodb.js /path/to/route-assistant.db <UsersTableName>
```

Apply it only after confirming the output:

```bash
node scripts/migrate-users-to-dynamodb.js /path/to/route-assistant.db <UsersTableName> --apply
```

The migration refuses to overwrite a user that already exists. Retain the SQLite backup until the AWS deployment is verified.

## Architecture and security

- CloudFront serves the React build and forwards `/api/*` and `/auth/*` to API Gateway/Lambda on the same origin.
- DynamoDB stores users and server-side sessions. The session table TTL removes expired sessions automatically.
- The S3 bucket has public access blocked; CloudFront uses Origin Access Control.
- The Lambda function is not in a VPC, avoiding NAT Gateway fixed costs.
- AWS Secrets are supplied as CloudFormation `NoEcho` parameters during deployment. Keep `.env.aws` private and do not commit it.
- Restrict the Google browser key to the CloudFront host and the Maps JavaScript API. Restrict the server key to the Places APIs it uses.

## Custom domain

The initial stack intentionally uses the CloudFront default domain. Add a validated ACM certificate in `us-east-1` and CloudFront aliases only after testing. Then update the RideWithGPS callback URI to the custom-domain callback URL.

## Rollback and cleanup

CloudFormation preserves the user/session data if an application deployment is rolled back. To remove all test infrastructure, empty the generated S3 bucket and run:

```bash
aws cloudformation delete-stack --stack-name route-assistant --region us-east-1
```

Delete only after exporting any user data that should be retained.
