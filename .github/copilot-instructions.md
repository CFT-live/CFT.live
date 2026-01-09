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

## External Integrations

- **Reown AppKit** (formerly WalletConnect): Wallet connection UI configured in `client/app/config/index.tsx`
- **Chainlink VRF**: Lottery winner selection (configured in Lotto contract constructor)
- **Pyth Network**: Real-time price feeds for prediction markets
- **The Graph**: Indexes contract events via subgraphs (3 separate subgraphs, one per game)