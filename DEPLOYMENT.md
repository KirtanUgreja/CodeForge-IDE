# Landing Page Deployment Guide

## Overview
Landing page runs separately on port 3000, frontend app on port 4000. All CTAs redirect to frontend.

## Local Development

### Option 1: Run Both Services
```powershell
.\start-dev.ps1
```

### Option 2: Run Separately
```bash
# Terminal 1 - Landing Page
cd landing-page
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Access:
- Landing: http://localhost:3000
- App: http://localhost:4000

## Production Deployment

### Docker Build
```bash
# Landing page
docker build --build-arg NEXT_PUBLIC_APP_URL=https://app.yourdomain.com -t landing-page ./landing-page

# Or use docker-compose
docker-compose up -d
```

### Environment Variables
Landing page needs only:
- `NEXT_PUBLIC_APP_URL` - Frontend app URL

## Benefits
✅ Separate deployment - Update landing without touching app
✅ Reduced bandwidth - Static landing page is lightweight
✅ Proper redirects - All buttons/links go to frontend
✅ Standalone builds - Optimized production bundles
✅ Independent scaling - Scale landing page separately

## URL Structure
- `/` - Landing page (marketing)
- `/app/*` - Proxied to frontend (if needed)
- Direct links redirect to `NEXT_PUBLIC_APP_URL`
