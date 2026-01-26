# CFT.live - Web3 Smart Contract Hub

## Architecture Overview

This is a monorepo hosting a Web3 smart contract interaction hub with verified protocols (Prediction Market, Lotto, Roulette) deployed on Arbitrum One. The architecture consists of:

- **Client** (`client/`): Next.js 15 app deployed to Cloudflare Workers via OpenNext
- **Smart Contracts** (`smartcontracts/{prediction,lotto,roulette}/`): Solidity contracts using Hardhat
- **Cloudflare Workers** (`workers/{chat-worker,advance-worker}/`): Durable Object-based microservices
- **Contract Bot** (`cft-contract-bot/`): TypeScript automation service

### Key Technologies
- Next.js 15 (App Router) + React 19 + TypeScript
- Cloudflare Workers + Durable Objects + KV
- Viem + Wagmi (Ethereum interaction)
- TanStack Query (data fetching)
- The Graph (blockchain indexing via subgraphs)
- Hardhat + Solidity 0.8.30 (smart contracts)
- Chainlink VRF (verifiable randomness)
- Pyth Network (price oracles)

## Project Structure

```
client/                       # Next.js frontend (deployed to Cloudflare)
├── app/                     
│   ├── {lotto,prediction,roulette}/  # Game-specific pages
│   ├── api/                 # Next.js API routes
│   ├── components/          # React components (shadcn/ui based)
│   ├── hooks/               # Custom React hooks (prefixed use*)
│   ├── lib/
│   │   ├── api/actions*.ts  # Server actions for blockchain interactions
│   │   ├── contracts/       # Contract ABIs and addresses
│   │   └── durable-objects/ # Cloudflare Durable Object implementations
│   ├── queries/             # GraphQL queries for The Graph subgraphs
│   └── providers/           # React context providers
├── custom-worker.ts         # Cloudflare Worker entry (exports Durable Objects)
└── wrangler.jsonc          # Cloudflare deployment config

smartcontracts/{game}/       # Hardhat projects per game
├── contracts/              # Solidity source files
├── ignition/modules/       # Hardhat Ignition deployment modules
├── scripts/                # Deployment and utility scripts
└── subgraph/               # The Graph subgraph definitions

workers/                     # Standalone Cloudflare Workers
├── chat-worker/            # Global chat with Durable Objects
└── advance-worker/         # Cron-based prediction market automation
```

## Development Workflows

### Client Development
```bash
cd client
pnpm dev              # Start Next.js dev server (uses wrangler.dev.jsonc)
pnpm build            # Build for production
pnpm deploy           # Deploy to Cloudflare via OpenNext
pnpm cf-typegen       # Generate CloudflareEnv types from wrangler.jsonc
```

**Important**: Local dev (`pnpm dev`) uses `wrangler.dev.jsonc` which excludes Durable Objects to prevent warnings. Production uses `wrangler.jsonc` with full Durable Object configuration.

### Smart Contract Development
Each game has its own Hardhat project. Navigate to `smartcontracts/{game}/`:

```bash
pnpm contract:build           # Compile Solidity contracts
pnpm contract:test            # Run Hardhat tests
pnpm contract:deploy          # Deploy to Arbitrum One with verification
pnpm contract:deploy:force    # Wipe existing deployment and redeploy
pnpm subgraph:build          # Generate subgraph code and build
pnpm subgraph:deploy:studio  # Deploy to The Graph Studio
```

Contracts use Hardhat Ignition for deterministic deployments (see `ignition/modules/*.ts`).

### Worker Development
```bash
cd workers/{worker-name}
pnpm dev              # Start local development server
pnpm deploy-worker    # Deploy to Cloudflare
pnpm tail             # Stream live logs
```

## Critical Conventions

### Contract Interaction Patterns

**Server Actions** (`client/app/lib/api/actions*.ts`): All blockchain writes that require a private key happen in Next.js server actions. These use a singleton wallet client to manage nonce properly:

```typescript
// Example from actions.ts
const walletClient = getWalletClient(); // Singleton instance
const hash = await walletClient.writeContract({
  address: PREDICTION_MARKET_ADDRESS,
  abi: PREDICTION_MARKET_ABI,
  functionName: "someFunction",
  args: [...]
});
```

**Client-Side Reads**: Use hooks in `client/app/hooks/` that wrap Wagmi's contract read hooks:
- `useContractMetadata()` - Read contract configuration
- `useAssetPrice()` - Fetch real-time price data
- Pattern: hooks are named `use{Action}` and optionally accept `onSuccess` callback

**Client-Side Writes**: User-initiated transactions use custom hooks like `useSafeWriteContract*()` which wrap Wagmi and handle transaction states.

### Data Fetching Architecture

1. **Blockchain Events → Subgraph**: Smart contracts emit events indexed by The Graph subgraphs
2. **Subgraph → Client**: GraphQL queries in `client/app/queries/*.ts` fetch indexed data
3. **Real-time Updates**: TanStack Query with polling for dynamic data

GraphQL endpoint is defined per environment and queried via `graphql-request`.

### Environment Variables

Managed in `.env` at monorepo root. Critical variables:
- `NEXT_PUBLIC_*`: Client-side accessible
- `ARBITRUM_ONE_PRIVATE_KEY`: Server-side bot wallet
- `NEXT_PUBLIC_SITE_INFURA_API_URL`: Arbitrum RPC endpoint
- `NEXT_PUBLIC_{GAME}_CONTRACT_ADDRESS`: Deployed contract addresses
- `ADVANCE_API_KEY`: Shared secret between advance worker and API

Contract addresses are exported from `client/app/lib/contracts/index.ts`.

### Cloudflare-Specific Patterns

**Durable Objects**: Used for stateful services:
- `UserPresence` (`client/app/lib/durable-objects/UserPresence.ts`): Tracks active users with in-memory state
- `Chat` (`workers/chat-worker/src/chat.ts`): Stores last 100 chat messages

**Custom Worker** (`client/custom-worker.ts`): Re-exports OpenNext handler and Durable Object classes. This is required to bridge Next.js with Cloudflare Durable Objects.

**Deployment**: Uses `@opennextjs/cloudflare` adapter. Build outputs to `.open-next/` directory.

### Type Safety Patterns

- Contract ABIs are auto-generated in `client/app/lib/contracts/abis/` from compiled Hardhat artifacts
- Shared types defined in `client/app/types.ts` (Asset, Position, RoundStatus, etc.)
- Viem provides full type inference for contract calls when using proper `as const` on ABIs

### UI Design System

- **Theme**: Minimalistic, early 2000s hacker aesthetic - use monospace fonts, terminal-like interfaces, orange/black color schemes
- **Components**: Built on shadcn/ui (Radix UI primitives + Tailwind)
- **Responsive**: All components must work on mobile and desktop
- **Animation**: Uses Framer Motion for state transitions

## Common Pitfalls

1. **Don't run the project during code generation** - Use static analysis instead. The project requires blockchain connections that won't work in isolated environments.

2. **Nonce Management**: When adding server actions that write to blockchain, always use the singleton `getWalletClient()` pattern to avoid nonce conflicts.

3. **Durable Objects in Dev**: If you see Durable Object warnings in `next dev`, this is expected - they only work in production or with `pnpm preview`.

4. **Contract Address Updates**: After deploying new contracts, update both:
   - Environment variables (`.env`)
   - Subgraph configuration (`smartcontracts/{game}/subgraph.yaml`)

5. **GraphQL Schema**: Subgraph schema changes require rebuilding and redeploying the subgraph before client queries will work.

6. **Windows Environment**: Use `;` not `&&` in Git Bash commands for chaining.

## Contribution System (CFT Contribute)

This repo includes a transparent, wallet-authenticated contribution system used to coordinate work and distribute CFT token rewards fairly.

### Core Entities

- **Feature**: A project-sized unit of work with a fixed token pool (`total_tokens_reward`). Features contain many Tasks and have a status (`OPEN | IN_PROGRESS | COMPLETED | CANCELLED`).
- **Task**: A discrete unit of work. Tasks may belong to a Feature via `feature_id`. Tasks can be **claimed** by at most one contributor at a time.
- **Contribution**: A submission for a task (URL + notes, optional PR number) that can be reviewed by core team. Approved contributions earn **Contribution Points (CP)**.
- **Distribution (FeatureDistribution)**: A public ledger entry that records how many tokens a contributor should receive for a Feature and the on-chain proof (Arbitrum tx hash + status).

### Identity & Authentication

- **Identity** is a wallet address.
- Any write (claim, submit, approve, create/update feature, create/update distribution) uses the **signed request headers** pattern:
  - `x-cft-message` + `x-cft-signature`
  - The Edge/API route verifies signature and treats the signer address as the `*_id` of the actor (contributor/approver/creator).
- **Admin / core team** actions are restricted based on contributor roles (existing convention).

### User Flows

**Contributor flow**

1. Browse Features and Tasks.
2. Claim a Task (exclusive claim).
3. Submit work (URL + optional notes / PR number).
4. Wait for review; if approved, CP is awarded and is used for leaderboards and distribution.

**Core team flow**

1. Create a Feature with a fixed token pool.
2. Create Tasks under that Feature.
3. Review Contributions for tasks:
   - APPROVED: set `cp_awarded` + optional `approval_notes`.
   - CHANGES_REQUESTED / REJECTED: optional notes, no CP.
4. When a Feature is complete, create Distribution ledger entries proportional to approved CP totals.
5. Perform manual on-chain transfers on Arbitrum and record the tx hashes publicly in the Distribution ledger.

### CP Guidelines (Public)

The UI includes a shared CP guideline card. Keep these ranges in sync with product expectations:

- **Code Implementation**: 50–200 CP
- **Code Review**: 30–100 CP
- **Documentation**: 30–80 CP
- **Discussion & Planning**: 5–30 CP
- **Community & Ecosystem**: 20–60 CP
- **Design & UI/UX**: 40–120 CP

### Key Client Surfaces

- **Task page** includes:
  - Claim / Unclaim controls
  - Submit work form
  - Public list of contributions
  - Admin review controls (approve/reject/request-changes + CP + notes)
- **Features pages** include:
  - Feature list / detail dashboard
  - Task list per feature
  - CP leaderboard computed from approved contributions
  - Distribution ledger and Arbitrum tx hash links

### Proxy API Routing (Client → Edge → Backend)

- The Next.js app uses Edge API routes under `client/app/api/**` as a proxy layer to the backend API.
- Reads may be public; writes require signature verification.
- Keep backend payloads minimal and always derive sensitive actor IDs from the signer in the Edge route.

### Claim Semantics

- Only one contributor can claim a task at a time.
- Claim/unclaim is explicit via an `action` (e.g. `CLAIM | UNCLAIM`).
- Unclaim is only allowed by the current claimant.

### Distribution Semantics

- Distribution records are a public ledger. Transfers remain manual on Arbitrum.
- Store:
  - `tokens_rewarded`
  - `transaction_hash` (Arbitrum)
  - `transaction_status` (e.g. pending/confirmed/failed)

### Implementation Conventions

- Prefer extending existing types in `client/app/features/contribute/v1/api/types.ts` when adding fields.
- Add new API calls in `client/app/features/contribute/v1/api/api.ts` and route them via `client/app/api/**`.
- Keep contributor-facing transparency: approvals (approver id + notes), CP totals, and distributions should be publicly visible.

## External Integrations

- **Reown AppKit** (formerly WalletConnect): Wallet connection UI configured in `client/app/config/index.tsx`
- **Chainlink VRF**: Lottery winner selection (configured in Lotto contract constructor)
- **Pyth Network**: Real-time price feeds for prediction markets
- **The Graph**: Indexes contract events via subgraphs (3 separate subgraphs, one per game)