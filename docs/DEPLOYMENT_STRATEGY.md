# Branch-Based Deployment Strategy

## Overview
Simple deployment workflow using a `production` branch that your platform deploys from automatically.

## Branch Structure
- **`main`** - Development branch (work here)
- **`production`** - Deployment branch (platform deploys from here)  
- **`feature/*`** - Optional experimental branches

## Initial Setup (One-Time)

### 1. Create Production Branch
```bash
# From main branch, create production
git checkout -b production
git push -u origin production
git checkout main
```

### 2. Configure Your Platform
Set your deployment platform to:
- **Production Branch**: `production`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Auto-deploy**: ON (deploy on push to production)

### 3. Set Environment Variables
```env
RIDEWITHGPS_CLIENT_ID=your_client_id
RIDEWITHGPS_CLIENT_SECRET=your_client_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
SESSION_SECRET=random_secure_string
NODE_ENV=production
DB_PATH=/path/to/persistent/storage/route-assistant.db
BASE_URL=https://yourdomain.com
TRUST_PROXY=true
```

**Important:** Set `DB_PATH` to your platform's mounted persistent storage location!

## Daily Development Workflow

### Working on Features
```bash
# Just work on main as usual
git add .
git commit -m "add new feature"
git push origin main
```

### Deploying to Production
```bash
# 1. Test your build
npm run build

# 2. Merge main into production
git checkout production
git merge main

# 3. Push to trigger deployment
git push origin production

# 4. Back to main
git checkout main
```

## Automated Deployment Script

Create `scripts/deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying to production..."

# Ensure on main and up to date
git checkout main
git pull origin main

# Run build check
npm run build
echo "✅ Build successful"

# Merge to production
git checkout production
git pull origin production
git merge main --no-edit

# Push to trigger deployment
git push origin production
echo "✅ Deployed to production!"

# Back to main
git checkout main
echo "✅ Back on main - ready for more development"
```

Make it executable:
```bash
chmod +x scripts/deploy.sh
```

Deploy with one command:
```bash
./scripts/deploy.sh
```

## If Something Goes Wrong

### Quick Fix
```bash
# Fix on main
git add .
git commit -m "fix: production issue"

# Deploy the fix
git checkout production
git merge main
git push origin production
git checkout main
```

### Rollback to Previous Version
```bash
# Find the last working commit
git checkout production
git log --oneline

# Revert to it
git reset --hard <last-working-commit-hash>
git push --force origin production

# Then fix properly on main
git checkout main
# make fixes...
```

## Pre-Deployment Checklist
- [ ] Build succeeds: `npm run build`
- [ ] Test key features in dev
- [ ] No console errors
- [ ] All changes committed to main
- [ ] Environment variables set on platform
- [ ] DB_PATH points to persistent storage

## Platform-Specific Notes

### Vercel/Netlify/Render
- Set production branch to `production`
- Auto-deploy ON
- Environment variables in dashboard

### Railway/Fly.io
- Set watch branch to `production`
- Configure persistent volume for database
- Set `DB_PATH` to volume mount point (e.g., `/data/route-assistant.db`)

### Database Storage
Your platform needs persistent storage for the SQLite database:
1. Create/mount a persistent volume
2. Set `DB_PATH` env var to point to it
3. Example: `DB_PATH=/mnt/data/route-assistant.db`

## Key Principles
1. Always work on `main`
2. `production` branch = what's deployed
3. Test before merging to `production`
4. Keep deployments small and frequent
5. Can rollback by reverting `production` branch
