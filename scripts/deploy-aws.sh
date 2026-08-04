#!/usr/bin/env bash
set -euo pipefail

if ! command -v sam >/dev/null || ! command -v aws >/dev/null; then
  echo "Install and configure the AWS CLI and AWS SAM CLI first." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.aws}"
STACK_NAME="${STACK_NAME:-route-assistant}"
REGION="${AWS_REGION:-us-east-1}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Create $ENV_FILE from .env.aws.example, then rerun this command." >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required=(RWGPS_CLIENT_ID RWGPS_CLIENT_SECRET GOOGLE_API_KEY SESSION_SECRET)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "$name is required in $ENV_FILE" >&2; exit 1; }
done

cd "$ROOT"
npm ci
npm run build
sam build --template-file template.yaml
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "RwgpsClientId=$RWGPS_CLIENT_ID" \
    "RwgpsClientSecret=$RWGPS_CLIENT_SECRET" \
    "GoogleApiKey=$GOOGLE_API_KEY" \
    "SessionSecret=$SESSION_SECRET" \
    "MailerSendApiKey=${MAILERSEND_API_KEY:-}" \
    "MailerSendVerificationTemplateId=${MAILERSEND_VERIFICATION_TEMPLATE_ID:-}" \
    "MailerSendBetaAccessTemplateId=${MAILERSEND_BETA_ACCESS_TEMPLATE_ID:-}" \
    "MailerSendFromEmail=${MAILERSEND_FROM_EMAIL:-noreply@example.com}" \
    "MailerSendFromName=${MAILERSEND_FROM_NAME:-Route Assistant}" \
    "EnabledPoiProviders=${ENABLED_POI_PROVIDERS:-google,osm}"

BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" --output text)"
aws s3 sync dist/ "s3://$BUCKET/" --delete

echo
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteUrl' || OutputKey=='OAuthCallbackUrl'].[OutputKey,OutputValue]" \
  --output table
echo "Configure the displayed OAuthCallbackUrl in RideWithGPS, then set BASE_URL and RWGPS_REDIRECT_URI in .env.aws and deploy again."
