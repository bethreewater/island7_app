# Island 7 Engineering Management System

Vite + React + TypeScript web app for case management, field execution, analytics, and map visualization.

## Prerequisites

- Node.js 20+
- npm 10+

## Environment Variables

Create `.env` in project root:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Optional: geocoding proxy endpoint (recommended)
# Example: Supabase Edge Function URL
VITE_GEOCODE_PROXY_URL=...
```

## Run Locally

```bash
npm install
npm run dev
```

Default dev server: `http://localhost:3000`

## Build & Verification

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## CI

GitHub Actions workflow is configured at:

- `.github/workflows/ci.yml`

It runs:

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
