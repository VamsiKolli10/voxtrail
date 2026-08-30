# Environment Variables Configuration

## Table of Contents

1. [Overview](#overview)
2. [Backend Variables](#backend-variables)
3. [Frontend Variables](#frontend-variables)
4. [Required vs Optional](#required-vs-optional)
5. [Security Considerations](#security-considerations)
6. [Development vs Production](#development-vs-production)

## Overview

Environment variables are crucial for configuring the VoxTrail application. They control everything from API connections to security settings.

## Backend Variables

### Server Configuration

| Variable                 | Description                                                  | Default                 | Required |
| ------------------------ | ------------------------------------------------------------ | ----------------------- | -------- |
| `APP_PORT`               | Server port number (local dev)                               | `8000`                  | No       |
| `NODE_ENV`               | Environment mode                                             | `development`           | No       |
| `FIRESTORE_PREFER_REST`  | Use REST API over gRPC                                       | `true`                  | No       |
| `REQUEST_BODY_LIMIT`     | Maximum request body size                                    | `256kb`                 | No       |
| `MAX_TRANSLATION_CHARS`  | Maximum text length for translation                          | `500`                   | No       |
| `TRANSLATION_WARM_PAIRS` | Comma-separated lang pairs to pre-warm (e.g., `en-es,es-en`) | _none_                  | No       |
| `TRANSLATION_CACHE_TTL_MS` | Cache TTL for translation responses (ms)                   | `600000` (10 minutes)   | No       |
| `TRANSLATION_MODEL_TIMEOUT_MS` | Model download/load timeout (ms)                       | `90000`                 | No       |
| `TRANSLATION_INFERENCE_TIMEOUT_MS` | Inference timeout before triggering fallback (ms)  | `20000`                 | No       |
| `TRANSLATION_FALLBACK_ENABLED` | Allow OpenRouter fallback when local model fails       | `true`                  | No       |
| `TRANSFORMERS_CACHE`     | Persistent cache path for `@huggingface/transformers` models | `./.cache/transformers` | No       |

> Translation fallback relies on `OPENROUTER_API_KEY`. Set `TRANSLATION_FALLBACK_ENABLED=false` to opt out if you want strictly on-device translations.

### Firebase Configuration

#### Admin Credentials (Backend)

| Variable               | Description                                                                                   | Format                | Required |
| ---------------------- | --------------------------------------------------------------------------------------------- | --------------------- | -------- |
| `FB_ADMIN_CREDENTIALS` | Base64-encoded (or raw JSON) Firebase service account (formerly `FIREBASE_ADMIN_CREDENTIALS`) | JSON string or base64 | Yes      |

> :warning: The backend no longer loads credentials from disk. Always inject the service account via `FB_ADMIN_CREDENTIALS` (renamed from `FIREBASE_ADMIN_CREDENTIALS`).

#### Client Configuration (Frontend Integration)

| Variable                    | Description          | Example                   | Required |
| --------------------------- | -------------------- | ------------------------- | -------- |
| `FBAPP_API_KEY`             | Firebase web API key | `AIzaSy...`               | Yes      |
| `FBAPP_AUTH_DOMAIN`         | Firebase auth domain | `project.firebaseapp.com` | Yes      |
| `FBAPP_PROJECT_ID`          | Firebase project ID  | `my-project`              | Yes      |
| `FBAPP_STORAGE_BUCKET`      | Storage bucket URL   | `project.appspot.com`     | Yes      |
| `FBAPP_MESSAGING_SENDER_ID` | Messaging sender ID  | `123456789`               | Yes      |
| `FBAPP_APP_ID`              | Firebase app ID      | `1:123456:web:abc`        | Yes      |

### External API Keys

| Variable                    | Description                                | Required                    |
| --------------------------- | ------------------------------------------ | --------------------------- |
| `GOOGLE_PLACES_API_KEY`     | Google Places / POI / Stays search key     | Yes                         |
| `OPENROUTER_API_KEY`        | OpenRouter API key for AI phrasebooks/etc. | Yes                         |
| `OPENROUTER_MODEL`          | Default AI model name                      | No (default: `gpt-4o-mini`) |
| `OPENROUTER_MODEL_CHAIN`    | Comma-separated fallback models to try     | No                          |
| `ITINERARY_MODEL`           | Optional dedicated itinerary model         | No                          |
| `ITINERARY_ENABLE_FALLBACK` | Enable static/sample itinerary fallback    | No (default: `true`)        |

### Security Settings

| Variable                 | Description                             | Default            | Required |
| ------------------------ | --------------------------------------- | ------------------ | -------- |
| `REQUEST_SIGNING_SECRET` | Secret for request signature validation | None               | Yes      |
| `CORS_ALLOWED_ORIGINS`   | Allowed CORS origins                    | `http://localhost` | Yes      |
| `RATE_LIMIT_WINDOW_MS`   | Rate limit window in milliseconds       | `60000`            | No       |
| `RATE_LIMIT_MAX`         | Default rate limit                      | `60`               | No       |

### Quotas & Monitoring

| Variable                           | Description                                             | Default |
| ---------------------------------- | ------------------------------------------------------- | ------- |
| `STAYS_PER_USER_PER_HOUR`          | Per-user stay search operations per hour                | `60`    |
| `STAYS_SEARCH_MAX_PER_IP`          | Stay search requests per minute per IP                  | `15`    |
| `POI_PER_USER_PER_HOUR`            | Per-user POI search quota                               | `120`   |
| `PHRASEBOOK_MAX_REQUESTS_PER_HOUR` | Phrasebook generations per user per hour                | `25`    |
| `ITINERARY_MAX_REQUESTS_PER_HOUR`  | Itinerary generations per user per hour                 | `20`    |
| `USAGE_ALERT_FALLBACK`             | Default threshold before emitting external usage alerts | `500`   |

### Advanced Configuration

| Variable                        | Description                   | Default | Notes                                         |
| ------------------------------- | ----------------------------- | ------- | --------------------------------------------- |
| `LOG_LEVEL`                     | Logging level                 | `info`  | `error`, `warn`, `info`, `debug`              |
| `ENABLE_REQUEST_LOGGING`        | Log all requests              | `true`  | Set to `false` in production                  |
| `ENABLE_PERFORMANCE_MONITORING` | Track performance metrics     | `false` | Enable for APM                                |
| `CACHE_TTL_SECONDS`             | Default cache TTL             | `3600`  | Cache duration in seconds                     |
| `CULTURE_BRIEF_CACHE_VERSION`   | Culture brief cache namespace | `1`     | Bump to invalidate cached briefs in Firestore |

## Frontend Variables

### Firebase Configuration

All frontend variables must be prefixed with `VITE_` to be accessible in the browser.

| Variable                            | Description          | Example                   | Required |
| ----------------------------------- | -------------------- | ------------------------- | -------- |
| `VITE_FIREBASE_API_KEY`             | Firebase web API key | `AIzaSy...`               | Yes      |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain | `project.firebaseapp.com` | Yes      |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID  | `my-project`              | Yes      |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Storage bucket URL   | `project.appspot.com`     | Yes      |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID  | `123456789`               | Yes      |
| `VITE_FIREBASE_APP_ID`              | Firebase app ID      | `1:123456:web:abc`        | Yes      |

### API Configuration

| Variable                        | Description                                      | Example                       | Required |
| ------------------------------- | ------------------------------------------------ | ----------------------------- | -------- |
| `VITE_API_URL`                  | Backend API base URL (include `/api` suffix)     | `https://api.example.com/api` | Yes      |
| `VITE_API_TIMEOUT`              | API request timeout (ms)                         | `30000`                       | No       |
| `VITE_ENABLE_OFFLINE_MODE`      | Enable offline caching utilities                 | `true`                        | No       |
| `VITE_ENABLE_ITINERARY_PLANNER` | Toggle Discover Itinerary planner (beta)         | `true`                        | No       |
| `VITE_ANALYTICS_WRITE_KEY`      | Analytics key (if using external analytics tool) | `env-specific`                | No       |

### Feature Flags

| Variable                             | Description                | Default | Notes                          |
| ------------------------------------ | -------------------------- | ------- | ------------------------------ |
| `VITE_ENABLE_ANALYTICS`              | Enable analytics tracking  | `true`  | Set to `false` for development |
| `VITE_ENABLE_ERROR_REPORTING`        | Enable error reporting     | `true`  | Use Sentry or similar          |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Track frontend performance | `false` | Enable for optimization        |

## Required vs Optional

### Backend Required Variables

```bash
# Minimal production setup
GOOGLE_PLACES_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
REQUEST_SIGNING_SECRET=your_secret_here
CORS_ALLOWED_ORIGINS=https://yourdomain.com
# Firebase
FB_ADMIN_CREDENTIALS=$(cat serviceAccount.json | base64)
```

### Frontend Required Variables

```bash
# Minimal production setup
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yourproject
VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc
VITE_API_URL=https://api.yourdomain.com
```

## Security Considerations

### Sensitive Data

- **Never commit** `.env` files to version control
- **Use different** secrets for development and production
- **Rotate** API keys regularly
- **Restrict** API keys to specific domains/IPs

### API Key Restrictions

#### Google Places API

- Enable Places API and Places Photos API
- Restrict to your domain in HTTP referrer restrictions
- Set usage quotas appropriate for your traffic

#### OpenRouter API

- Set model to `gpt-4o-mini` for cost optimization
- Monitor usage in OpenRouter dashboard
- Set spending limits if needed

#### Firebase

- Use service account with minimal required permissions
- Enable only required Firebase services
- Set up proper security rules

### Request Signing

- Configure a strong `REQUEST_SIGNING_SECRET` per environment and rotate regularly.
- Server-to-server clients must include `x-timestamp` and `x-request-signature` headers for protected routes.
- Any request with an `Authorization: Bearer <token>` header skips signature validation and will be validated by the auth middleware instead. Background jobs or tooling that cannot send ID tokens **must** use signed requests.

## CI/CD Secrets (GitHub Actions)

- CI workflow uses dummy keys for isolated Jest/Vitest runs and does not call external services.
- Deploy workflow (`.github/workflows/deploy.yml`) requires GitHub secrets:
  - `FIREBASE_SERVICE_ACCOUNT` (service account JSON for Hosting + Functions deploys)
  - `FIREBASE_PROJECT_ID`
  - Frontend build vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_API_URL`
- Use environment- or environment-specific secrets in GitHub to keep staging and production isolated.

### Environment-Specific Settings

#### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com
```

#### Production

```bash
NODE_ENV=production
LOG_LEVEL=error
ENABLE_REQUEST_LOGGING=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Development vs Production

### File Structure

#### Development

```
project/
├── .env.development
├── .env.local
└── travel-app-be/.env
```

#### Production

```
project/
├── .env.production
├── travel-app-be/.env.production
└── travel-app-fe/.env.production
```

### Environment File Setup

#### Backend `.env` template

```bash
# Copy this template and fill in your values

# Server
APP_PORT=8000
NODE_ENV=production
FIRESTORE_PREFER_REST=true

# Firebase
FB_ADMIN_CREDENTIALS=your_service_account_json_here
FBAPP_API_KEY=your_firebase_web_api_key
FBAPP_AUTH_DOMAIN=your-project.firebaseapp.com
FBAPP_PROJECT_ID=your-project-id
FBAPP_STORAGE_BUCKET=your-project.appspot.com
FBAPP_MESSAGING_SENDER_ID=123456789
FBAPP_APP_ID=1:123456:web:abc

# External APIs
GOOGLE_PLACES_API_KEY=your_google_places_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=x-ai/grok-4.1-fast:free
# Optional comma-separated fallbacks, tried in order
OPENROUTER_MODEL_CHAIN=x-ai/grok-4.1-fast:free,openai/gpt-4o-mini

# Security
REQUEST_SIGNING_SECRET=your_random_secret_string_here
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60

# Application
REQUEST_BODY_LIMIT=1mb
MAX_TRANSLATION_CHARS=500

# Firebase Functions Configuration (optional, defaults shown)
FUNCTION_REGION=us-central1
FUNCTION_MEMORY=2GB
FUNCTION_TIMEOUT=120
FUNCTION_MIN_INSTANCES=1
FUNCTION_MAX_INSTANCES=10

# Translation Model Configuration (optional)
TRANSLATION_MODEL_TIMEOUT_MS=90000
TRANSLATION_WARM_PAIRS=en-es,en-fr
TRANSLATION_CACHE_TTL_MS=600000
```

#### Frontend `.env` template

```bash
# Copy this template and fill in your values

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc

# API
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=false
```

### Deployment Platform Specific

#### Vercel

```bash
# Backend (if using Vercel Functions)
vercel env add FB_ADMIN_CREDENTIALS
vercel env add GOOGLE_PLACES_API_KEY
# ... add all required variables

# Frontend
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_API_URL
# ... add all required variables
```

#### Netlify

```bash
# Backend
netlify env:set FB_ADMIN_CREDENTIALS "your_value"
netlify env:set GOOGLE_PLACES_API_KEY "your_value"

# Frontend
netlify env:set VITE_FIREBASE_API_KEY "your_value"
netlify env:set VITE_API_URL "your_value"
```

#### Firebase Hosting

```bash
# Use Firebase CLI to set environment variables
firebase functions:config:set firebase.admin_credentials="your_json"
firebase functions:config:set google.places_key="your_key"
```

### Validation

Add this script to validate environment variables:

```javascript
// validate-env.js
const requiredEnvVars = {
  "travel-app-be": [
    "GOOGLE_PLACES_API_KEY",
    "OPENROUTER_API_KEY",
    "REQUEST_SIGNING_SECRET",
    "CORS_ALLOWED_ORIGINS",
  ],
  "travel-app-fe": [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_API_URL",
  ],
};

function validateEnv() {
  const errors = [];

  Object.entries(requiredEnvVars).forEach(([app, vars]) => {
    vars.forEach((varName) => {
      if (!process.env[varName]) {
        errors.push(`Missing required variable: ${varName} in ${app}`);
      }
    });
  });

  if (errors.length > 0) {
    console.error("Environment validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log("✅ All required environment variables are set");
}

module.exports = { validateEnv };
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**

   - Check if the key is valid and not expired
   - Verify domain restrictions
   - Ensure billing is enabled for Google Cloud

2. **CORS Errors**

   - Check `CORS_ALLOWED_ORIGINS` includes your domain
   - Ensure no trailing spaces or typos
   - Include both `https://domain.com` and `https://www.domain.com`

3. **Firebase Connection Issues**

   - Verify service account permissions
   - Check if Firestore is enabled
   - Ensure project IDs match

4. **Rate Limiting Issues**
   - Check rate limit headers in responses
   - Verify user roles are correctly set
   - Monitor rate limit usage in logs

---

**Last Updated**: 2025-11-13
**Version**: 1.1.0
