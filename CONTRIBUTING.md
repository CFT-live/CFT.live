# Contributing

Thanks for your interest in contributing.

## Ground Rules

- Keep changes focused and small.
- Do not commit secrets or production credentials.
- For security issues, follow `SECURITY.md`.

## Development Prerequisites

- Node.js 20+
- pnpm (see the pinned version in `client/package.json`)
- Cloudflare Wrangler (usually installed via project devDependencies)

Optional (depending on what you work on):

- Hardhat toolchain for `smartcontracts/*`
- The Graph CLI for subgraphs (installed in smartcontracts devDependencies)

## Repo Structure

- `client/` — Next.js 15 app (OpenNext -> Cloudflare)
- `workers/` — standalone Cloudflare Workers
- `smartcontracts/` — Hardhat projects per game + subgraphs

## Setup

1) Create an env file at the repo root:

```bash
cp .env.example .env
```

2) Frontend:

```bash
cd client
pnpm install
pnpm dev
```

3) Workers:

```bash
cd workers/chat-worker
pnpm install
pnpm dev
```

4) Smart contracts:

```bash
cd smartcontracts/lotto
pnpm install
pnpm contract:test
```

## Environment Variables

- `.env` is expected at the repo root and is ignored by git.
- `NEXT_PUBLIC_*` variables are exposed to the browser by design.
- Never store private keys in `NEXT_PUBLIC_*`.

## Code Style

- Follow existing TypeScript/React patterns.
- Use `pnpm lint` in `client/` before opening a PR.
- Prefer type-safe patterns (no `any` unless unavoidable).

## Pull Requests

- Describe the change and why it’s needed.
- Include testing steps (what you ran locally).
- If you add new env vars, update `.env.example`.
