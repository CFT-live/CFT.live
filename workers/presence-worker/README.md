# CFT Presence Worker

A small Cloudflare Worker + Durable Object that tracks roughly “how many users are online” by counting unique client IDs that ping within a time window.

## Endpoints

- `GET /presence?clientId=...` -> `{ count, timestamp }`
- `GET /health` -> `{ status: "ok" }`

## Dev

```bash
cd workers/presence-worker
pnpm install
pnpm dev
```

## Deploy

```bash
cd workers/presence-worker
pnpm deploy-worker
```
