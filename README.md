# channel-maker

A virtual television station engine.

This NestJS application builds and maintains continuous, rule-driven playlists/channels. It combines:

- Deterministic scheduling rules
- LLM-assisted curation (via Ollama)
- On-demand media from a NAS
- Live sources (IPTV / TVHeadend)

The system maintains an inspectable multi-day schedule and exposes it as consumable streams (M3U, etc.) for VLC, Smart TVs, and other players.

## Current status

Early skeleton. Basic NestJS app with health endpoint.

## Development

# Install dependencies, set up db, start in dev / locally

```
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev
```

App: http://localhost:3000
Health: http://localhost:3000/health

## Testing

Integration tests use [Testcontainers](https://testcontainers.com/) to spin up a real Postgres instance.

### health test:

- http://localhost:3000/health → should return the JSON health response

On this Fedora host the Testcontainers Ryuk helper cannot access the Docker socket (permissions/SELinux). Run e2e tests with:

```bash
TESTCONTAINERS_RYUK_DISABLED=true pnpm test:e2e
```

Cleanup still happens via afterAll(). If a test process is killed hard, orphaned containers can be removed with docker container prune.

## Tech stack

NestJS + TypeScript (strict)
pnpm
Node.js (managed with fnm)
