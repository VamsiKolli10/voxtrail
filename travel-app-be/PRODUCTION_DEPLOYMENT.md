# VoxTrail - Production Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [API Keys Setup](#api-keys-setup)
6. [Security Configuration](#security-configuration)
7. [Deployment Steps](#deployment-steps)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

## Overview

VoxTrail is a full-stack web application providing:

- Real-time text translation
- AI-generated travel phrasebooks
- Accommodation search and booking
- Points of Interest (POI) discovery
- Personal phrase saving and management

**Architecture:**

- **Frontend**: React with Material-UI
- **Backend**: Node.js/Express API
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **External APIs**: Google Places, OpenRouter AI

## Prerequisites

### Required Services

1. **Firebase Project** (with Authentication and Firestore)
2. **Google Cloud Platform** (for Places API)
3. **OpenRouter Account** (for AI phrase generation)

### System Requirements

- Node.js 22 (required by the repository runtime policy)
- npm or yarn
- 2GB+ RAM for production
- 1GB+ storage

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `travel-app-be` directory:

```bash
# Server Configuration
APP_PORT=8000
NODE_ENV=production
FIRESTORE_PREFER_REST=true

# Firebase Configuration (local/non-Google environments only; choose one)
FB_ADMIN_CREDENTIALS=<base64-encoded-firebase-admin-credentials-json>
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
FBAPP_API_KEY=<your-firebase-web-api-key>
FBAPP_AUTH_DOMAIN=<your-project>.firebaseapp.com
FBAPP_PROJECT_ID=<your-project-id>
FBAPP_STORAGE_BUCKET=<your-project>.appspot.com
FBAPP_MESSAGING_SENDER_ID=<sender-id>
FBAPP_APP_ID=<app-id>

# External API Keys
GOOGLE_PLACES_API_KEY=<your-google-places-api-key>
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_MODEL=x-ai/grok-4.1-fast:free

# Security
REQUEST_SIGNING_SECRET=<your-random-secret-string>
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting & Quotas
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
STAYS_PER_USER_PER_HOUR=60
STAYS_SEARCH_MAX_PER_IP=15
POI_PER_USER_PER_HOUR=120
PHRASEBOOK_MAX_REQUESTS_PER_HOUR=25
ITINERARY_MAX_REQUESTS_PER_HOUR=20
USAGE_ALERT_FALLBACK=500

# Application Settings
REQUEST_BODY_LIMIT=256kb
MAX_TRANSLATION_CHARS=500
```

> **Credential handling:** Firebase Functions and Cloud Run use Application Default Credentials, so do not deploy a second service-account key there. For local or non-Google environments, use either a base64-encoded `FB_ADMIN_CREDENTIALS` value or point `GOOGLE_APPLICATION_CREDENTIALS` at a readable file. Never commit the file or encoded value.

### Frontend Environment Variables

Create a `.env` file in the `travel-app-fe` directory:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=<your-firebase-web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>

# API Configuration
VITE_API_URL=https://your-api-domain.com
```

## Database Setup

### Firebase Firestore Security Rules

Deploy these rules to your Firebase project:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /saved_phrases/{phraseId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Firestore Indexes

Create these composite indexes in Firebase Console:

1. **saved_phrases collection**:
   - Fields: `userId` (asc), `createdAt` (desc)

## API Keys Setup

### Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API and Places Photos API
3. Create API key and restrict to your domain
4. Add to environment variables

### OpenRouter API

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get API key from dashboard
3. Add to environment variables
4. Set model to `gpt-4o-mini` for cost optimization, or provide `OPENROUTER_MODEL_CHAIN` (comma-separated) to fall back automatically if a model is unavailable.

### Firebase

1. Create Firebase project
2. Enable Authentication (Email/Password, Google)
3. Enable Firestore Database
4. Download service account key for admin credentials
5. Get web config for frontend

## Security Configuration

### 1. Rate Limiting

- **Anonymous users**: 20 requests/minute
- **Authenticated users**: 60 requests/minute
- **Admins**: 120 requests/minute
- **Endpoint-specific limits**:
  - Translation: 30/min
  - Phrasebook generation: 10/min
  - User management: 20/min
  - Stay search/photo proxy: 15/min per IP + 60/hour per user
  - POI search: 30/min per IP + 120/hour per user
  - Itinerary generation: 20/hour per user (protects OpenRouter spend)

### 2. CORS Configuration

```javascript
const allowedOrigins = ["https://yourdomain.com", "https://www.yourdomain.com"];
```

### 3. Security Headers

- Content Security Policy configured
- XSS Protection enabled
- Clickjacking protection
- HTTPS enforcement

### 4. Authentication

- JWT token validation
- Token expiration checking
- Role-based access control
- IP validation (optional)
- Stays search, POI search/details, and itinerary generation now require valid Firebase ID tokens (or signed server-to-server credentials). Keep this requirement when adding new Google/OpenRouter frontends.

### 5. Request Signing

- `REQUEST_SIGNING_SECRET` is mandatory in every environment.
- Server-to-server clients must include `x-timestamp` (epoch ms) and `x-request-signature` (hex HMAC of `method:path:body:timestamp`).
- Requests carrying a `Bearer` token skip signature validation (the token is then validated by auth middleware), so prefer sending Firebase ID tokens for user-facing traffic. Only automation or tooling that cannot send ID tokens should rely on signed requests.

### 6. Quota Monitoring

- Use the provided `STAYS_*`, `POI_*`, `PHRASEBOOK_MAX_REQUESTS_PER_HOUR`, and `ITINERARY_MAX_REQUESTS_PER_HOUR` env vars to throttle per-user access before hitting Google/OpenRouter.
- `USAGE_ALERT_FALLBACK` controls when the in-process monitor emits warnings (visible in logs) for runaway usage.

## Deployment Steps

### Backend Deployment

#### Firebase Functions (canonical deployment)

```bash
# Install Firebase CLI
npm install -g firebase-tools@15.28.2

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy functions
firebase deploy --only functions:backend
```

The repository deploys the Express API from the `backend` Functions codebase
(`travel-app-be/`) using Node.js 22. The historical `functions/` directory is
archived and is not part of the production deployment.

Before staging or production deployment, exercise the configured Hosting,
Functions, Firestore, and Auth topology locally:

```bash
cd travel-app-be
npm run emulators:test
```

The pinned Firebase CLI requires Java 21 or newer for the Firestore emulator.

#### Option 2: Traditional Server

```bash
# Install dependencies
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

#### Option 3: Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["node", "server.js"]
```

### Frontend Deployment

#### Option 1: Firebase Hosting

```bash
# Build React app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

#### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option 3: Netlify

```bash
# Build React app
npm run build

# Deploy build folder to Netlify
```

### Combined Firebase Hosting + Backend Functions Deploy

Run the repository-level helper to automate the React build, asset sync, and Firebase deploy:

```bash
./scripts/firebase-deploy.sh --project your-firebase-project
```

The script expects `firebase-tools` to be installed and authenticated, reuses `.firebaserc` when `--project` is omitted, and will fail fast if the frontend build artifacts are missing.

### CI/CD (GitHub Actions)

- **Workflows** live in `.github/workflows/ci.yml` (PR/main tests, audits, and build) and `.github/workflows/deploy.yml`. Production deployment runs only after a successful `CI` push run on `main`, or by manual dispatch from `main`, and calls `scripts/firebase-deploy.sh`.
- **Required GitHub secrets for deploy**:
  - `FIREBASE_SERVICE_ACCOUNT`: full JSON for a service account that can deploy Hosting and the `backend` Functions codebase. Grant the minimal Firebase Hosting/Functions roles.
  - `FIREBASE_PROJECT_ID`
  - Frontend build vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_API_URL`.
- **CI defaults**: The CI workflow injects dummy keys so Jest/Vitest can run offline; provide env overrides in repository or environment secrets if you need integration tests against real services.

## Monitoring & Logging

### Application Monitoring

1. **Firebase Console**

   - Monitor Firestore usage
   - Track authentication metrics
   - View function logs

2. **Application Logs**

   - All errors are logged with structured data
   - Rate limit violations tracked
   - Security events monitored

3. **Performance Monitoring**
   - Response times tracked
   - API usage analytics
   - Error rate monitoring

### Recommended Monitoring Tools

- **Firebase Performance**: Built-in monitoring
- **Sentry**: Error tracking
- **DataDog**: APM and monitoring
- **LogRocket**: User session replay

## Troubleshooting

### Common Issues

1. **Rate Limiting Issues**

   ```bash
   # Check rate limit headers in responses
   X-RateLimit-Limit: 20
   X-RateLimit-Remaining: 15
   X-RateLimit-Reset: 1640995200
   ```

2. **Authentication Errors**

   - Verify Firebase configuration
   - Check token expiration
   - Validate CORS settings

3. **API Key Issues**

   - Verify all required API keys are set
   - Check API key restrictions
   - Monitor quota usage

4. **Database Connection Issues**
   - Check Firebase service account permissions
   - Verify Firestore rules
   - Monitor connection limits

### Health Check Endpoints

- `GET /api/stays/search` - Public endpoint health
- `GET /api/poi/search` - POI service health
- `GET /api/translate/warmup` - Translation service health (admin only)

## Performance Optimization

### Caching Strategy

1. **Translation Cache**: Models cached by language pair
2. **Photo Proxy**: Browser caching enabled (24h)
3. **API Responses**: Implement Redis for frequently accessed data

### Database Optimization

1. **Firestore Indexes**: Ensure proper indexes for queries
2. **Connection Pooling**: Configure connection limits
3. **Query Optimization**: Limit result sets and use pagination

### API Optimization

1. **Rate Limiting**: Prevents abuse and ensures availability
2. **Request Batching**: Combine multiple requests where possible
3. **Compression**: Enable gzip compression
4. **CDN**: Serve static assets via CDN

## Support

For production support:

1. Check application logs first
2. Review Firebase console for service issues
3. Monitor API quota usage
4. Check external service status pages

### Emergency Contacts

- Firebase Support: [Console](https://console.firebase.google.com/)
- Google Cloud Support: [Console](https://console.cloud.google.com/)
- OpenRouter Support: [Dashboard](https://openrouter.ai/)

---

**Last Updated**: 2025-11-11  
**Version**: 1.0.0  
**Environment**: Production Ready
