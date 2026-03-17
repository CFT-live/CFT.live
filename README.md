# CFT.live — Web3 Smart Contract Hub

Monorepo for a Web3 smart contract interaction hub (Prediction Market, Lotto, Roulette) deployed on Arbitrum One.

- Frontend: Next.js 15 (App Router) + React 19 + TypeScript, deployed to Cloudflare Workers via OpenNext
- Backend services: Cloudflare Workers + Durable Objects (chat, presence, automation)
- Smart contracts: Solidity (Hardhat) + The Graph subgraphs

## Repo Layout

- `client/` — Next.js app (OpenNext/Cloudflare)
- `workers/` — standalone Cloudflare Workers (chat, presence, automation)
- `smartcontracts/` — Hardhat projects per game + subgraphs

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See `LICENSE`.

## Quick Start (Frontend)

Prereqs:

- Node.js 20+
- pnpm (see `client/package.json` for the pinned version)

1) Create a local env file:

```bash
cp .env.example .env
```

2) Install and run the Next.js dev server:

```bash
cd client
pnpm install
pnpm dev
```

Notes:

- `pnpm dev` runs Next.js locally. Production deploy is Cloudflare/OpenNext (see `client/wrangler.jsonc`, `client/open-next.config.ts`).
- Do not commit `.env`, `.dev.vars`, or any secret material.

## Environment Variables

The app expects configuration via `.env` at the repo root (see `.env.example` for placeholders). 

## Cloudflare Workers

Each worker is a standalone project:

```bash
cd workers/chat-worker
pnpm install
pnpm dev
```

Secrets for Workers should be configured using Wrangler secrets, e.g. in `workers/advance-worker`:

```bash
pnpm setup-api-key
```

## Smart Contracts

Each game has its own Hardhat project:

```bash
cd smartcontracts/lotto
pnpm install
pnpm contract:test
```

## Security

If you believe you’ve found a security issue, please follow `SECURITY.md`.

## Contributing

See `CONTRIBUTING.md`.
