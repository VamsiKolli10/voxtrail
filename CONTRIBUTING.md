# Contributing to VoxTrail

VoxTrail is a personal project. Focus improvements on the MVP journeys: translate, save phrases, discover places/stays, and stay prepared.

## Before you start

- Use Node.js 22 and npm 10 or newer.
- Read [README](README.md), [MVP plan](MVP_PLAN.md), and the relevant API/environment docs.
- Never commit `.env` files, service-account JSON, API keys, emulator data, or build output.

## Development workflow

1. Create a focused branch from `main`.
2. Install with `npm run install:all`.
3. Make the smallest end-to-end change that solves the issue.
4. Add or update tests for behavior changes.
5. Run the checks below before opening a pull request.

```bash
npm run test
npm run build
npm run test:emulators
npm audit --prefix travel-app-fe --audit-level=high
npm audit --prefix travel-app-be --audit-level=high
```

## Pull requests

Describe user impact, test coverage, environment changes, and provider/API cost implications. Include screenshots or a short recording for visual changes. Keep unrelated formatting or dependency upgrades out of feature pull requests.

CI must pass before merge. Production deployment is restricted to the protected `main` branch.

## Reporting bugs

Include the affected route, browser/device, reproduction steps, expected versus actual behavior, relevant request IDs, and whether the issue reproduces against emulators or staging. Remove tokens, personal data, and secrets from reports.
