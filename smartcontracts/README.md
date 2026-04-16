# Smart Contracts

This folder contains the smart contracts for the CFT.live platform. Each contract lives in its own subfolder and includes a `WHITEPAPER.md` describing its purpose and design.

## Creating a New Contract

Copy the `example/` folder as a starting point:

```bash
cp -r example/ my-new-contract/
cd my-new-contract/
pnpm install
```

The example contract is a minimal, production-ready template that uses:
- **Hardhat v3** for compilation, testing, and deployment
- **Hardhat Ignition** for declarative deployments
- **OpenZeppelin contracts** for battle-tested base implementations
- **viem** for type-safe contract interaction in tests

Update the following to match your contract:

| File | What to change |
|---|---|
| `contracts/example.sol` | Rename and implement your contract |
| `ignition/modules/ignition.ts` | Update the module name and constructor arguments |
| `package.json` | Update the `name` field and adjust network scripts |
| `WHITEPAPER.md` | Document your contract's purpose and design |

---

## Environment Setup

All contracts share a single `.env` file at the **repository root** (`/.env`). Create it if it doesn't exist:

```bash
# at repo root
cp .env.example .env   # or create it manually
```

Populate it with the variables below. You need at least one RPC URL and its corresponding private key to deploy.

```env
# ── Sepolia testnet ──────────────────────────────────────────────
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=

# ── Arbitrum Sepolia testnet ─────────────────────────────────────
ARBITRUM_SEPOLIA_RPC_URL=
ARBITRUM_SEPOLIA_PRIVATE_KEY=

# ── Arbitrum One mainnet ─────────────────────────────────────────
SITE_INFURA_API_URL=
ARBITRUM_ONE_PRIVATE_KEY=

# ── Contract verification ────────────────────────────────────────
ETHERSCAN_API_KEY=
```

> **Security:** Never commit your `.env` file. It is already listed in `.gitignore`.

### Getting an RPC URL (Infura / MetaMask Developer)

1. Go to [https://developer.metamask.io/](https://developer.metamask.io/) and sign in or create a free account.
2. Click **Create API Key** and give it a name (e.g. `cft-live-dev`).
3. Open the key and copy the endpoint URL for the network you need (e.g. `Sepolia` or `Arbitrum One`).
4. Paste the full URL into the corresponding variable in your `.env`:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your-key>
   ```

### Setting Your Wallet Private Key

Export the private key from your deployer wallet. In MetaMask: **Account details → Export private key**.

> **Important:** Use a dedicated deployer wallet. Never use a wallet that holds significant funds.

```env
SEPOLIA_PRIVATE_KEY=0x<your-private-key>
```

### Funding Your Deployer Wallet

The deployer wallet must hold the **native token of the target network** to pay gas fees. Deployment will fail with an insufficient funds error if the balance is too low.

| Network | Token needed | How to get it |
|---|---|---|
| Sepolia testnet | Sepolia ETH | [Infura faucet](https://www.infura.io/faucet/sepolia) or [sepoliafaucet.com](https://sepoliafaucet.com) |
| Arbitrum Sepolia testnet | Arbitrum Sepolia ETH | [Alchemy faucet](https://www.alchemy.com/faucets/arbitrum-sepolia) |
| Arbitrum One mainnet | ETH (on Arbitrum) | Buy ETH and bridge it via [Arbitrum Bridge](https://bridge.arbitrum.io/) |

Testnet tokens are free. A small amount (e.g. 0.1 Sepolia ETH) is more than enough for deploying a contract.

---

## Deploying a Contract

Install dependencies and run one of the deployment scripts defined in `package.json`:

```bash
pnpm install

# Deploy to Sepolia testnet
pnpm contract:deploy:sepolia

# Deploy to Arbitrum One mainnet (includes verification)
pnpm contract:deploy
```

Deployment state is saved to `ignition/deployments/`. To start fresh, run:

```bash
pnpm contract:wipe
```

---

## Verifying a Contract

Verification publishes your source code to a block explorer (Etherscan / Arbiscan) so anyone can audit it.

### Getting an Etherscan API Key

1. Create a free account at [https://etherscan.io/](https://etherscan.io/).
2. Go to **My Account → API Keys** and click **Add**.
3. Copy the key and add it to your `.env`:
   ```env
   ETHERSCAN_API_KEY=<your-api-key>
   ```

### Running Verification

After a successful deployment, verify the contract with:

```bash
# Verify on Sepolia
pnpm contract:verify:sepolia

# Verify on Arbitrum One
pnpm contract:verify
```

Mainnet deployments (`pnpm contract:deploy`) automatically include `--verify`, so a separate step is only needed if verification failed during deployment.

---

## Testing

```bash
pnpm contract:test
```

Tests use Hardhat's built-in local network (no `.env` values needed). Add your tests to the `test/` folder. 

---

## Project Structure

```
my-contract/
├── contracts/          # Solidity source files
├── ignition/
│   ├── modules/        # Deployment module (ignition.ts)
│   └── deployments/    # Auto-generated deployment records (gitignored)
├── test/               # Hardhat tests
├── hardhat.config.ts   # Network and plugin configuration
├── package.json        # Scripts and dependencies
└── WHITEPAPER.md       # Contract design document
```

---

## Useful Resources

- [Hardhat v3 docs](https://hardhat.org/docs)
- [Hardhat Ignition docs](https://hardhat.org/ignition/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [viem docs](https://viem.sh/)
- [Solidity docs](https://docs.soliditylang.org/)
- [MetaMask Developer Portal](https://developer.metamask.io/)
