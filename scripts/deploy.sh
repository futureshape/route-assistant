#!/bin/bash
set -e

echo "🚀 Deploying to production..."
echo ""

# Ensure we're on main and up to date
echo "Checking out main branch..."
git checkout main
git pull origin main
echo "✅ Main branch updated"
echo ""

# Run build check
echo "Testing build..."
npm run build
echo "✅ Build successful"
echo ""

# Merge to production
echo "Merging to production branch..."
git checkout production
git pull origin production
git merge main --no-edit
echo "✅ Merged main into production"
echo ""

# Push to trigger deployment
echo "Pushing to production (this will trigger deployment)..."
git push origin production
echo "✅ Pushed to production branch - deployment triggered!"
echo ""

# Back to main
git checkout main
echo "✅ Back on main branch"
echo ""
echo "🎉 Deployment complete! Check your platform's dashboard for deployment status."
