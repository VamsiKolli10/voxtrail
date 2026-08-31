# VoxTrail frontend

This directory contains the VoxTrail React client, built with Vite, Material UI, React Router, Redux Toolkit, Firebase Authentication, and MapLibre.

## Development

```bash
npm ci --prefix travel-app-fe
cp travel-app-fe/.env.example travel-app-fe/.env
npm run dev --prefix travel-app-fe
```

The Vite server runs on [http://localhost:5173](http://localhost:5173). For the full API and emulator setup, see the root [README](../README.md).

## Commands

```bash
npm run dev       # start Vite
npm run build     # create a production bundle
npm run preview   # preview the production bundle
npm test          # run Vitest once
npm run test:watch
npm run test:coverage
```

## Environment

Copy `.env.example` to `.env`. `VITE_API_URL` must include the backend `/api` path. Firebase web configuration values are required for authentication. Vite exposes only variables prefixed with `VITE_`; never put admin credentials or provider API keys here.

## Structure

- `src/components/` — pages, layouts, and reusable UI
- `src/contexts/` — authentication, appearance, analytics, and feature flags
- `src/services/` — API and Firebase service wrappers
- `src/store/` — Redux Toolkit state
- `src/theme.js` and `src/styles/` — design system and global styles

Keep network access in `src/services`, add loading/error/empty states, and cover user-visible behavior with Vitest/React Testing Library tests.
