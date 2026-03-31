# Faucet Contract Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-31
- Scope: TokenFaucet contract and the off-chain reward system that drives it
- Network: Arbitrum One

## Abstract

The CFT.live reward system distributes CFT tokens to users who complete defined platform actions such as connecting a wallet, completing a contributor profile, answering questions, or sharing content. The on-chain settlement layer is the `TokenFaucet` contract, which holds a pre-funded pool of CFT and allows users to claim their earned allocation directly. The off-chain layer is a backend service that validates actions, enforces per-user one-time limits, and calls the contract to register claimable balances.

This document describes the purpose and design of the reward system, the contract architecture, the security model, and the full flow from user action to on-chain token claim.

---

## 1. Purpose

The reward system serves a distinct purpose from the contribution system described in the main CFT.live whitepaper. Where the contribution system compensates builders for approved feature work using CP-weighted token distributions, the reward system compensates users for lightweight platform engagement actions: discovery, profiling, and learning. These are not work deliverables — they are engagement milestones that lower the barrier to participation and introduce users to the value of CFT.

The two systems are intentionally separate:

| System | Who earns | How | On-chain settlement |
|---|---|---|---|
| Contribution system | Builders | Approved task work, CP-weighted feature distributions | `ContributorDistributor` mints new CFT |
| Reward system | All users | One-time engagement actions | `TokenFaucet` distributes pre-funded CFT |

Using pre-funded tokens for rewards keeps the two value flows independent. The `ContributorDistributor` mints new supply for contribution work. The `TokenFaucet` distributes existing supply for engagement, capping reward exposure to the amount deliberately deposited by the admin.

---

## 2. Reward Action Types

The following action types are defined and enforced by the backend:

| Action type | Trigger | Verification |
|---|---|---|
| `WALLET_CONNECT` | User completes SIWE sign-in | Verified implicitly — wallet address confirmed by signature |
| `PROFILE_COMPLETION` | User fills bio and profile image | Backend checks contributor record has both fields populated |
| `QUESTION_ANSWER` | User responds to an active question | Any non-empty response is accepted — questions are for feedback and engagement, not testing |
| `SOCIAL_SHARE` | User submits a share URL | `share_url` required in request context |

Each reward type has an associated `RewardDefinition` record in the database that specifies the token amount. Token amounts are always sourced from the database — they are never accepted from the client.

New reward types can be added in the future by creating a new `RewardDefinition` with the corresponding `action_type` enum value and updating the verification logic in `trigger-reward.ts`. No contract changes are required.

---

## 3. Contract Architecture

### 3.1 TokenFaucet

The `TokenFaucet` contract is a single-token distribution contract. It holds a balance of one ERC-20 token (CFT on Arbitrum One) and maintains a per-address claimable balance mapping. Users call `claim()` to withdraw up to their recorded allowance.

**Contract**: `TokenFaucet.sol`  
**Solidity version**: `^0.8.34`  
**OpenZeppelin base contracts**: `AccessControl`, `Pausable`, `ReentrancyGuard`, `SafeERC20`

### 3.2 Roles

The contract uses OpenZeppelin `AccessControl` with two roles:

**`DEFAULT_ADMIN_ROLE`** (deployer/multisig)
- Grant and revoke roles
- Withdraw tokens from the faucet (`withdrawUnusedTokens`)
- Pause and unpause the contract

**`ALLOCATOR_ROLE`** (backend service wallet)
- Call `addClaimAmount`, `setClaimAmount`, and `batchAddClaimAmount`
- Cannot withdraw or pause

Separating these roles means a compromised backend key cannot drain the faucet — it can only increase user allowances that are bounded by the total faucet balance.

### 3.3 Token Source

The faucet is **pre-funded**: the admin mints or transfers CFT tokens to the faucet address before any rewards are distributed. The faucet does not hold `MINTER_ROLE` on the CFT token.

This is a deliberate security boundary. If the backend allocator key were compromised, the maximum damage is bounded by the faucet's current token balance. An attacker cannot trigger unlimited minting. The admin controls the supply available for rewards by managing the faucet deposit separately.

### 3.4 Functions

**`claim(uint256 amount)`**  
Called by users. Transfers `amount` tokens to the caller.
- Reverts if `amount == 0`
- Reverts if `amount > claimableAmount[msg.sender]`
- Reverts if `amount > token.balanceOf(address(this))`
- Uses CEI pattern (checks and effects before the external transfer)
- Protected by `ReentrancyGuard` and `whenNotPaused`

**`addClaimAmount(address user, uint256 amountToAdd)`**  
Adds to a user's existing allowance. Called by `ALLOCATOR_ROLE` when a new reward is granted.

**`setClaimAmount(address user, uint256 newAmount)`**  
Overwrites a user's allowance directly. Used for corrections or manual adjustments.

**`batchAddClaimAmount(address[] calldata users, uint256[] calldata amounts)`**  
Batch version of `addClaimAmount`. Used for bulk reward distributions.

**`withdrawUnusedTokens(address to, uint256 amount)`**  
Withdraws tokens from the faucet. Only `DEFAULT_ADMIN_ROLE`. Used to rebalance or recover unused inventory.

**`pause()` / `unpause()`**  
Emergency stop mechanism. Pausing prevents all `claim()` calls. Only `DEFAULT_ADMIN_ROLE`.

**`faucetTokenBalance()`**  
View function returning the faucet's current token balance.

### 3.5 Events

| Event | Emitted when |
|---|---|
| `Claimed(user, amount)` | A user successfully claims tokens |
| `ClaimAmountAdded(user, amountAdded, newTotal)` | An allocator increases a user's allowance |
| `ClaimAmountSet(user, newAmount)` | An allocator sets a user's allowance directly |
| `TokensWithdrawn(to, amount)` | The admin withdraws tokens from the faucet |

---

## 4. Off-Chain Reward System

### 4.1 Architecture

The off-chain system sits between user actions and the contract. It runs as a set of AWS Lambda functions behind an API Gateway and is backed by three DynamoDB tables.

```
User action  →  Next.js API route  →  Lambda (trigger-reward)
                                             │
                        ┌────────────────────┤
                        ▼                    ▼
              DynamoDB conditional     Validate action
              write (one-time guard)   against DB state
                        │
                        ▼
              addClaimAmount() via viem
              (Secrets Manager key, Arbitrum)
                        │
                        ▼
              Update UserReward status → ALLOCATED or FAILED
```

### 4.2 DynamoDB Tables

**`CFT-RewardDefinitions`**  
Defines available reward types. Admins create and activate/deactivate reward definitions through the admin panel. Each record has an `action_type`, a `token_amount`, and a `status`.

**`CFT-UserRewards`**  
Tracks every granted reward. The critical index is `wallet_address-reward_def-index` (partition key: `wallet_address`, sort key: `reward_definition_id`). This index makes the one-time enforcement query an O(1) lookup. Records have a `status` field: `PENDING` → `ALLOCATED` or `FAILED`.

**`CFT-RewardQuestions`**  
Stores admin-defined questions. Each question is linked to a `RewardDefinition` with `action_type: QUESTION_ANSWER`. Questions may have a defined `options` list (multiple choice) or allow free text for open-ended responses. All responses are accepted — there are no correct or incorrect answers. Questions are a low-threshold way for users to contribute opinions and feedback to the platform.

### 4.3 Reward Trigger Flow

1. **Session validation** — The Next.js route handler reads the SIWE session cookie. The `wallet_address` forwarded to the Lambda is always the address verified by the SIWE signature. Clients cannot substitute a different address.

2. **Reward definition lookup** — The Lambda queries `CFT-RewardDefinitions` for an active record matching the `action_type`. If none exists or the definition is inactive, the request returns 404.

3. **Action verification** — For each action type, the Lambda applies business logic verification:
   - `WALLET_CONNECT`: passes implicitly (SIWE session proves wallet ownership)
   - `PROFILE_COMPLETION`: checks the contributor record for `bio` and `profile_image_url`
   - `QUESTION_ANSWER`: passes for any non-empty answer — verification is not about correctness, only that the user responded
   - `SOCIAL_SHARE`: requires `share_url` in the action context

4. **Atomic one-time write** — The Lambda attempts to write a `UserReward` record with a DynamoDB `ConditionExpression: attribute_not_exists(id)`. Before the write, it queries the GSI to check whether a reward for this `wallet_address + reward_definition_id` combination already exists. If either check fails, the request returns 409 and no further action is taken. This prevents double-grants even under concurrent requests.

5. **Contract call** — Using a viem wallet client backed by a private key loaded from AWS Secrets Manager, the Lambda calls `addClaimAmount(walletAddress, amount)` on the deployed faucet contract. It waits for the transaction receipt before continuing.

6. **Status update** — If the contract call succeeds, the `UserReward` record is updated to `ALLOCATED` with an `allocated_date`. If it fails, the record is updated to `FAILED` with an `error_message`. A FAILED reward can be retried by an operator using `setClaimAmount` directly on the contract.

### 4.4 WALLET_CONNECT Integration

The `WALLET_CONNECT` reward triggers automatically on every SIWE verification success. The call is fire-and-forget inside the `/api/auth/siwe/verify` Next.js route handler — it does not block the sign-in response. Because the backend enforces one-time idempotency, subsequent sign-ins for the same wallet are silently ignored at step 4 above with a 409 response that is safely discarded.

### 4.5 Question Answer Flow

Question answering uses a dedicated Lambda (`answer-reward-question`) rather than the generic `trigger-reward` path:

1. User selects an option or types a free-text response and submits via `/api/rewards/questions/answer`
2. Lambda loads the question and verifies `status === "ACTIVE"`
3. Any non-empty submission is accepted — there are no correct or incorrect answers. Questions are deliberately open-ended (e.g. "Which logo do you prefer?" or "What would you improve on this page?") to collect genuine user feedback.
4. The flow continues as a standard reward trigger, writing a `UserReward` record with `action_context: { question_id, answer }`
5. The one-time guard prevents the same user from answering the same question twice

---

## 5. Security Model

### 5.1 Threat Boundaries

| Threat | Mitigation |
|---|---|
| User claims reward twice | DynamoDB conditional write (`attribute_not_exists`) plus GSI pre-check — atomic at the database level |
| Client spoofs wallet address | `wallet_address` always sourced from SIWE session (HMAC-signed cookie) — never from request body |
| Client inflates token amount | `token_amount` always read from `RewardDefinition` in the database — never from client input |
| Client fabricates action completion | Backend verifies action state independently (DB state, not client assertion) |
| Backend allocator key compromise | Faucet is pre-funded — attacker can call `addClaimAmount` but cannot mint new tokens; loss capped at faucet balance |
| Unlimited minting via faucet | Faucet does not hold `MINTER_ROLE` — it cannot mint; it can only distribute what has been deposited |
| Reentrancy on claim | `ReentrancyGuard` on `claim()` and `withdrawUnusedTokens()` |
| Contract left in bad state | `Pausable` — admin can halt all claims via `pause()` at any time |
| Unauthorized admin operations | `requireAdminRole` check in all admin Lambda handlers validates ADMIN or CORE role on contributor record |
| Nonce collisions under concurrent Lambda calls | Each Lambda invocation uses viem's automatic nonce management; sequential processing is enforced per wallet address |

### 5.2 Key Management

The backend allocator wallet private key is stored as a secret in AWS Secrets Manager. Lambda functions that sign transactions load the key at cold-start and cache it in Lambda memory for the lifetime of the execution environment. The key is never logged or written to any persistent store. Rotation requires updating the secret, redeploying the Lambdas, and calling `grantRole(ALLOCATOR_ROLE, newAddress)` on the contract followed by `revokeRole(ALLOCATOR_ROLE, oldAddress)`.

### 5.3 Faucet Funding Discipline

The `DEFAULT_ADMIN_ROLE` holder is responsible for maintaining an adequate faucet balance. If the faucet balance falls below the amount needed to cover pending allocations, `claim()` calls will revert with `InsufficientFaucetBalance`. Monitoring the faucet balance and topping it up proactively is an operational responsibility, not a contract guarantee.

A recommended practice is to fund the faucet in tranches proportional to the number of active reward definitions and the expected user throughput, allowing the admin to withdraw unsettled inventory at any time via `withdrawUnusedTokens`.

---

## 6. Admin Operations

### 6.1 Creating a Reward Definition

Admins with `CORE` or `ADMIN` role create reward definitions through the admin panel (or directly via `POST /rewards/definitions/create`):

```json
{
  "name": "Welcome reward",
  "description": "Connect your wallet to earn your first CFT",
  "action_type": "WALLET_CONNECT",
  "token_amount": 10,
  "created_by_id": "<contributor_id>"
}
```

Only one active definition per `action_type` is intended at a time. Setting a definition to `INACTIVE` disables new grants without affecting already-allocated rewards.

### 6.2 Creating a Question

Questions are linked to a `RewardDefinition` with `action_type: QUESTION_ANSWER`:

```json
{
  "question_text": "Which logo do you prefer, A or B?",
  "options": ["Logo A", "Logo B"],
  "reward_definition_id": "<definition_id>",
  "created_by_id": "<contributor_id>"
}
```

Omitting `options` produces a free-text question (e.g. "If you could improve one thing on this page, what would it be?"). All responses earn the reward — there are no right or wrong answers. The collected responses are stored in the `action_context` field of the `UserReward` record and can be reviewed by the team.

### 6.3 Deployment Parameters

The faucet is deployed via Hardhat Ignition with two required parameters:

| Parameter | Description |
|---|---|
| `tokenAddress` | Address of the CFT token contract on Arbitrum One |
| `allocatorAddress` | Address of the backend signing wallet (granted `ALLOCATOR_ROLE`) |

The deployer account is automatically granted `DEFAULT_ADMIN_ROLE` at construction.

### 6.4 Required Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `FAUCET_ALLOCATOR_SECRET_ARN` | Backend Lambda | AWS Secrets Manager ARN for the allocator private key |
| `TOKEN_FAUCET_CONTRACT_ADDRESS` | Backend Lambda | Deployed faucet contract address |
| `ARBITRUM_RPC_URL` | Backend Lambda | RPC endpoint for transaction submission |
| `NEXT_PUBLIC_TOKEN_FAUCET_CONTRACT_ADDRESS` | Client | Faucet address for reading `claimableAmount` and calling `claim()` |

---

## 7. User Claim Flow

From the user's perspective:

1. User connects wallet and signs the SIWE message → `WALLET_CONNECT` reward is automatically allocated on-chain in the background.
2. User visits the Rewards page → the page reads `claimableAmount(address)` directly from the faucet contract to show the available balance.
3. User sees available one-time rewards and active questions. Cards already claimed are shown as completed.
4. User answers a question or triggers a profile completion reward through the UI → backend allocates the corresponding amount on-chain.
5. When the user has tokens to claim, they press **Claim Tokens** → the frontend calls `faucet.claim(amount)` via wagmi. This is a direct user-signed transaction on Arbitrum — the backend is not involved.
6. After the transaction confirms, `claimableAmount` drops to zero and the tokens appear in the user's wallet.

Users pay only the gas cost for step 5. All prior steps (allocation, verification) are handled off-chain at no cost to the user.

---

## 8. Relationship to the Broader CFT.live System

The faucet and reward system are additive to the existing platform — not a replacement for any existing mechanism.

```
Platform actions (engagement)
         │
         ▼
   Reward system
   (TokenFaucet)  ──────────────────────────────┐
                                                 │
                                                 ▼
                                           CFT token (ERC-20)
                                                 │
Platform work (contributions)                    ▼
         │                               Redemption pool
         ▼                               (CFT → USDC)
  Contribution system
  (ContributorDistributor
   mints new CFT)  ──────────────────────────────┘
```

Both paths converge at the CFT token and share the same USDC redemption mechanism. Engagement rewards distribute a bounded pre-funded supply. Contribution rewards mint new supply proportional to approved work. The redemption pool backs both with platform revenue.
