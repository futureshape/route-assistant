# Simple Deployment Strategy for Solo Development

## Overview
This is a streamlined deployment approach for solo development with GitHub Copilot, focusing on simplicity while enabling stable production deployments.

## Simple Source Control Strategy

### Main Workflow
- **`main`** branch is your primary development branch
- Work directly on `main` for small changes and fixes
- Use `feature/*` branches only for bigger experimental changes
- Tag stable points for releases

### When to Use Feature Branches
Only create feature branches for:
- **Large experimental features** that might take days/weeks
- **Breaking changes** that you want to test thoroughly
- **Major refactoring** that might destabilize the app
- **Anything you're not sure about** and want to experiment with

Example:
```bash
# For big changes only
git checkout -b feature/major-ui-redesign
# Work on big changes...
git checkout main
git merge feature/major-ui-redesign
git branch -d feature/major-ui-redesign
```

## Simple Release Process

### 1. When Ready to Deploy
```bash
# Make sure main is stable
npm run build
npm test  # if you have tests

# Tag the release
git tag -a v1.2.3 -m "Release v1.2.3: Add elevation chart improvements"
git push origin v1.2.3
```

### 2. Deploy the Tagged Version
- Deploy the specific tag to production
- Keep `main` for continued development
- If issues arise, either hotfix or rollback to previous tag

## Pre-Deployment Checklist (Simple)

### Essential Checks
- [ ] App builds without errors (`npm run build`)
- [ ] Basic functionality works in dev mode
- [ ] No console errors on main features
- [ ] Environment variables ready for production

### Quick Manual Test
- [ ] Can sign in with RideWithGPS
- [ ] Can load and select a route
- [ ] POI search works (try one provider)
- [ ] Map displays correctly
- [ ] No obvious UI breaks

### Before Tagging
- [ ] Update version in `package.json`
- [ ] Add entry to `CHANGELOG.md` (create if needed)
- [ ] Commit any final changes

## Deployment Environments

### Development
- **Where**: Local (`npm run dev`)
- **When**: All the time while developing

### Production
- **Where**: Your chosen platform (Vercel recommended)
- **When**: Deploy tagged releases
- **How**: Platform deploys specific git tags

## Simple Version Numbering

Keep it simple:
- `v1.0.0` - First stable release
- `v1.1.0` - New features added
- `v1.1.1` - Bug fixes
- `v2.0.0` - Major changes or breaking changes

## Recommended Platform Setup

### Vercel (Easiest for React)
1. Connect your GitHub repo to Vercel
2. Set production branch to deploy from **tags only**
3. Set up environment variables in Vercel dashboard
4. Vercel will auto-deploy when you push new tags

### Environment Variables
```env
RIDEWITHGPS_CLIENT_ID=your_client_id
RIDEWITHGPS_CLIENT_SECRET=your_client_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
SESSION_SECRET=random_secure_string
NODE_ENV=production
```

## If Something Goes Wrong

### Production Issue
1. **Quick fix needed?**
   - Fix on `main`
   - Tag new version
   - Deploy new tag

2. **Complex issue?**
   - Revert to previous working tag
   - Fix properly on `main`
   - Tag and deploy when ready

### Rollback Process
```bash
# Find previous working version
git tag --list
git log --oneline

# Deploy previous tag through your platform
# Or temporarily revert commits on main
git revert <problematic-commit-hash>
git tag -a v1.2.4 -m "Hotfix: revert problematic change"
git push origin v1.2.4
```

## Daily Workflow Examples

### Regular Development
```bash
# Just work on main
git add .
git commit -m "improve POI search performance"
git push origin main

# When ready to release
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0
```

### Experimental Feature
```bash
# Only for big uncertain changes
git checkout -b feature/experimental-maps-api
# Experiment...
git add .
git commit -m "try new maps implementation"

# If it works
git checkout main
git merge feature/experimental-maps-api
git branch -d feature/experimental-maps-api

# If it doesn't work
git checkout main
git branch -D feature/experimental-maps-api  # Delete without merging
```

## Tools to Make Life Easier

### Package.json Scripts
Add these to make deployment easier:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy-check": "npm run build && echo 'Build successful - ready to tag and deploy'",
    "tag-release": "read -p 'Version (e.g., v1.2.3): ' version && git tag -a $version -m \"Release $version\" && git push origin $version"
  }
}
```

Usage:
```bash
npm run deploy-check  # Quick build test
npm run tag-release   # Interactive tag creation
```

### Simple CHANGELOG.md
Keep track of what you deployed:
```markdown
# Changelog

## v1.3.0 - 2025-10-02
- Added interactive elevation chart
- Fixed POI search bug with empty results
- Improved mobile responsive design

## v1.2.0 - 2025-09-28
- Added OSM POI provider
- Enhanced route selection with search
- Fixed authentication flow issues
```

## Monitoring (Keep It Simple)

### Essential Monitoring
- Set up basic uptime monitoring (UptimeRobot is free)
- Use your platform's built-in analytics (Vercel Analytics)
- Check error logs in your platform dashboard

### When to Check
- After each deployment
- Weekly health check
- When users report issues

## Key Principles

1. **Keep `main` stable** - Don't push broken code
2. **Tag when ready** - Only tag versions you'd be happy to deploy
3. **Small frequent releases** - Better than big scary deployments
4. **Test before tagging** - Run the essential checks
5. **Document what changed** - Future you will thank you

This approach gives you stable deployments without the complexity of managing multiple long-lived branches or complicated workflows.