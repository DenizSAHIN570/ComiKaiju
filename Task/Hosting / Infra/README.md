# Hosting / Infra Implementation

## Frontend Hosting

- **Platform**: Netlify free tier
- **Type**: Static, PWA
- **Status**: Works fine as-is

## Backend Hosting

- **Platform**: Self-hosted VPS (not serverless/PaaS to avoid cold starts)
- **Recommended**: Hetzner CX22 (~€3.79/mo)
  - More than enough for ASP.NET Core API + SQLite workload
- **Alternative**: Oracle Cloud Always Free tier ($0/mo)
  - Trade-offs: account verification hassle, occasional idle-instance reclamation

## Tech Stack

- **Backend**: ASP.NET Core Web API
- **Auth**: ASP.NET Core Identity
- **ORM**: EF Core
- **Database**: SQLite
- **Philosophy**: One language, one codebase, no third-party auth SaaS

## Architecture Goals

- Keep privacy story intact
- No data handed to Auth0/Clerk/Firebase/Supabase
- Flat, predictable costs
- No cold-start spin-down delays

## Deployment Considerations

- Backend runs on VPS with persistent resources
- Frontend remains static on Netlify
- Zero-knowledge encryption handled client-side
- Sync API endpoints on VPS only
