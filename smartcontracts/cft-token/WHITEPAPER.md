# CFT Token System Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-13
- Scope: [contracts/CftToken.sol](contracts/CftToken.sol), [contracts/ContributorDistributor.sol](contracts/ContributorDistributor.sol), and [contracts/RedemptionPool.sol](contracts/RedemptionPool.sol)
- Network target: Arbitrum One via the deployment module in [ignition/modules/CFT.ts](ignition/modules/CFT.ts)

## Abstract

The CFT token system is a narrowly scoped reward-and-redemption design composed of three contracts:

1. `CFTToken`, an ERC-20 token with permit support and role-gated minting and burning.
2. `ContributorDistributor`, a payout contract that mints CFT rewards for approved contributor tasks and prevents duplicate payment for the same task identifier.
3. `RedemptionPool`, a non-custodial redemption contract that holds USDC revenue and lets CFT holders redeem tokens for a pro-rata share of the pool.

The design separates issuance, payout authorization, and redemption settlement into distinct contracts with explicit role boundaries. This reduces surface area per component, supports auditable payout logic, and makes the redemption formula transparent.

## Design Goals

The system is designed around five principles:

1. Transparent issuance. CFT enters circulation only through addresses that hold `MINTER_ROLE` on the token contract.
2. Explicit contributor accounting. Task rewards are minted through a dedicated distributor that marks each task id as paid exactly once.
3. Pro-rata redemption. USDC held by the pool is redeemable against the outstanding CFT supply using an on-chain formula.
4. Minimal privileged actions. Minting and burning are isolated behind role checks rather than unrestricted owner functions.
5. Wallet-compatible UX. Permit-enabled redemption supports a one-transaction flow for compatible wallets.

## System Overview

At a high level, the system operates as follows:

1. An admin deploys `CFTToken` and becomes `DEFAULT_ADMIN_ROLE`.
2. An admin deploys `ContributorDistributor` against the token and grants the distributor `MINTER_ROLE` on `CFTToken`.
3. An admin deploys `RedemptionPool` against the token and a USDC contract, then grants the pool `BURNER_ROLE` on `CFTToken`.
4. Approved contribution tasks are paid by calling `ContributorDistributor.payout(to, amount, taskId)`.
5. Treasury or revenue operators deposit USDC into `RedemptionPool` via `depositRevenue(usdcAmount)`.
6. Contributors redeem CFT for a proportional share of pool USDC via `redeem(...)` or `redeemWithPermit(...)`.
7. During redemption, CFT is transferred into the pool, burned by the pool, and the corresponding USDC amount is sent to the redeemer.

This architecture intentionally decouples off-chain contribution approval from on-chain settlement. The smart contracts do not decide whether a task deserves payment; they only enforce role authorization and one-time settlement per task id.

## Contract Components

### 1. CFTToken

`CFTToken` is the protocol asset used for contributor rewards and redemption claims.

Implemented standards and features:

- `ERC20` from OpenZeppelin
- `ERC20Permit` for EIP-2612 approvals by signature
- `AccessControl` for role-based permissions

Defined roles:

- `DEFAULT_ADMIN_ROLE`: can grant and revoke roles
- `MINTER_ROLE`: can mint new CFT
- `BURNER_ROLE`: can invoke the restricted burn function

#### Minting

Only addresses with `MINTER_ROLE` can call:

```solidity
function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE)
```

This is the only issuance path in the token contract.

#### Burning

Burning is intentionally constrained through:

```solidity
function burnFromRole(address from, uint256 amount) external onlyRole(BURNER_ROLE)
```

The function additionally requires `from == msg.sender`. This means a burner-role address may only burn tokens that it itself currently holds. It cannot burn arbitrary user balances, even if it has the burner role.

This design is important for the redemption pool. The pool first receives CFT via `transferFrom`, then burns only the tokens already transferred into its own balance.

#### Admin Model

The constructor grants only `DEFAULT_ADMIN_ROLE` to the configured admin. It does not automatically grant the admin mint or burn permissions. Those must be granted explicitly after deployment. This is a safer default because it forces role wiring to be intentional and visible.

### 2. ContributorDistributor

`ContributorDistributor` is the controlled payout layer for contributor work.

It stores:

- An immutable token reference, `cft`
- A `taskPaid` mapping keyed by `bytes32 taskId`

It defines:

- `PAYOUT_ROLE`, which controls who may authorize payouts

The constructor grants both `DEFAULT_ADMIN_ROLE` and `PAYOUT_ROLE` to the configured admin.

#### Payout Flow

Authorized operators call:

```solidity
function payout(address to, uint256 amount, bytes32 taskId)
```

The contract enforces the following conditions before minting:

1. `to` must not be the zero address.
2. `amount` must be non-zero.
3. `taskId` must not already be marked as paid.
4. The caller must hold `PAYOUT_ROLE`.

If checks pass:

1. `taskPaid[taskId]` is set to `true`.
2. The distributor calls `cft.mint(to, amount)`.
3. A `Paid(to, amount, taskId)` event is emitted.

Because the distributor itself calls `mint`, the distributor contract address must hold `MINTER_ROLE` on the token. Without that grant, payouts will revert.

#### Task Idempotency

The `taskPaid` mapping is the core anti-double-pay mechanism. A task id may be any `bytes32` identifier, commonly a hash of an off-chain task key. Once paid, the same task id cannot be paid again.

This guarantees one-time on-chain settlement per task id, but it does not validate the quality, ownership, or fairness of the task itself. Those remain off-chain operational responsibilities.

### 3. RedemptionPool

`RedemptionPool` is the settlement layer that converts outstanding CFT into a claim on deposited USDC.

It stores two immutable references:

- `usdc`: the payout asset, any ERC-20 compatible token address configured at deployment
- `cft`: the CFT token interface used for total supply and burning

The contract uses:

- `SafeERC20` for transfers
- `ReentrancyGuard` for redemption entry points
- `Math.mulDiv` for precise pro-rata calculation

#### Revenue Deposits

Any address may deposit USDC revenue by calling:

```solidity
function depositRevenue(uint256 usdcAmount) external
```

Requirements:

1. `usdcAmount` must be non-zero.
2. The caller must already have approved the pool to transfer the given USDC amount.

The function transfers USDC into the pool and emits `RevenueDeposited(from, amount)`.

There is no role restriction on deposits. This is appropriate because deposits only add backing to the pool and do not create a direct withdrawal path for the depositor.

#### Quote Function

The redemption quote is defined as:

$$
\text{usdcOut} = \left\lfloor \frac{\text{cftAmountIn} \times U}{C} \right\rfloor
$$

Where:

- $U$ is the current USDC balance of the pool
- $C$ is the current total supply of CFT

In code, this is:

```solidity
usdcOut = Math.mulDiv(cftAmountIn, U, C);
```

If `cftAmountIn == 0`, `U == 0`, or `C == 0`, the quote returns zero.

This formula gives each CFT a proportional claim on the pool based on the current outstanding supply. As redemptions occur, both the USDC balance and CFT supply decrease, preserving proportional treatment for remaining holders, subject to integer rounding.

#### Redemption with Approval

The standard redemption path is:

```solidity
function redeem(uint256 cftAmountIn, uint256 minUsdcOut)
```

The internal sequence is:

1. Reject zero `cftAmountIn`.
2. Compute `usdcOut = quote(cftAmountIn)`.
3. Revert if `usdcOut < minUsdcOut`.
4. Revert if `usdcOut == 0`.
5. Transfer `cftAmountIn` from the user into the pool.
6. Burn the received CFT from the pool balance.
7. Transfer `usdcOut` USDC from the pool to the redeemer.
8. Emit `Redeemed(redeemer, cftIn, usdcOut)`.

The `minUsdcOut` parameter provides slippage protection against state changes between quote observation and transaction execution.

#### Redemption with Permit

For wallets that support EIP-2612, the pool also exposes:

```solidity
function redeemWithPermit(
    uint256 cftAmountIn,
    uint256 minUsdcOut,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
)
```

This first submits a permit against the CFT token, setting allowance for the pool, and then executes the same redemption logic. The result is a one-transaction UX without a separate `approve` transaction.

Because `CFTToken` inherits `ERC20Permit`, this flow is natively supported.

## End-to-End Token Lifecycle

The lifecycle of value through the system is:

1. Contributor work is approved off-chain by protocol operators.
2. The operator computes or records a unique `taskId`.
3. The operator calls the distributor to mint CFT to the contributor.
4. CFT circulates as the claim token representing contributor reward entitlement.
5. Protocol revenue is collected in USDC and deposited into the redemption pool.
6. A contributor redeems some or all of their CFT against the pool.
7. Redeemed CFT is burned, shrinking total supply.
8. The contributor receives a proportional amount of USDC from the pool.

The system therefore links issuance to contribution and links redemption value to actual USDC revenue accumulated in the pool.

## Roles and Trust Assumptions

The contracts are simple, but the trust model is not trustless in the pure sense. The main assumptions are:

### Admin Trust

The default admin of `CFTToken` can grant or revoke `MINTER_ROLE` and `BURNER_ROLE`. The default admin of `ContributorDistributor` can grant or revoke `PAYOUT_ROLE`.

This means governance or operator security around admin keys is critical. A compromised admin can:

- Grant mint permission to an unintended address
- Grant payout permission to an unintended address
- Revoke legitimate operator roles

### Off-Chain Task Approval Trust

The distributor does not verify work completion, contributor identity, or reward sizing. Those are defined by off-chain business logic and operator policy.

The smart-contract guarantee is narrow and precise: if an authorized payout is submitted for a new task id, the reward is minted exactly once.

### Treasury Solvency Trust

The redemption pool does not guarantee a fixed price floor. CFT redemption value is determined solely by the current ratio of USDC in the pool to CFT supply outstanding.

If USDC deposits are low relative to supply, redemption output is low. If no USDC is available, redemption reverts with `ZeroUsdcOut`.

## Security Properties

The current design provides several useful safety properties:

### Role Separation

- Minting authority is separated from the token contract admin by design.
- Payout authorization is separated into its own contract.
- Burning is constrained to burner-owned balances only.

### Double-Payment Prevention

`ContributorDistributor` prevents reuse of the same `taskId`.

### Reentrancy Protection

Both public redemption functions are protected with `nonReentrant`.

### Safe Token Transfers

`RedemptionPool` uses `SafeERC20` for ERC-20 interactions.

### Transparent Accounting

The quote function is deterministic and can be independently reproduced by integrators.

## Known Limitations and Operational Risks

The implementation is intentionally minimal. That simplicity comes with tradeoffs that integrators should understand.

### No On-Chain Governance Layer

The contracts do not include timelocks, multisig enforcement, DAO voting, upgrade hooks, or pausable controls. If governance is desired, it must be provided externally through deployment and key-management practices.

### No Emergency Recovery Flow in Pool

`RedemptionPool` does not include admin withdrawals, rescue functions, or circuit breakers. This minimizes privileged exits but also means operational mistakes involving the configured assets can be hard to correct without migration.

### Redemption Depends on Token Compatibility

The configured USDC address is treated as a standard ERC-20. The configured CFT token is expected to support permit and the restricted burn interface used by the pool.

### Rounding

`Math.mulDiv` rounds down. Very small redemption amounts may quote to zero and revert with `ZeroUsdcOut`. Frontends should preview quotes before submission.

### Key Management Is Critical

The protocol is only as safe as the admin and payout operator keys. Production deployments should use multisig administration and clear role separation between treasury, payout, and deployment functions.

## Recommended Web3 Best Practices

The following practices are recommended for production use:

1. Use a multisig as the admin for both the token and distributor.
2. Restrict `PAYOUT_ROLE` to a dedicated operator or automation account rather than the same account that holds default admin.
3. Publish task-id generation rules so payout uniqueness is auditable and deterministic.
4. Emit and index all payout and redemption events in analytics infrastructure.
5. Require off-chain review or approvals before operator wallets can call `payout`.
6. Surface the live redemption quote and minimum output in the frontend before signing.
7. Monitor role changes, token mint events, distributor payout events, and pool deposit activity in real time.
8. Prefer audited and canonical USDC addresses only.
9. Consider a timelock or governance wrapper around role administration if the system grows in scale.
10. Conduct an external security review before production mainnet scale-up.

## Deployment Notes

The Hardhat Ignition module in [ignition/modules/CFT.ts](ignition/modules/CFT.ts) currently deploys and wires the system in this order:

1. Deploy `CFTToken`
2. Deploy `ContributorDistributor`
3. Deploy `RedemptionPool`
4. Grant `MINTER_ROLE` on `CFTToken` to `ContributorDistributor`
5. Grant `BURNER_ROLE` on `CFTToken` to `RedemptionPool`

This module uses the deployer account as the initial admin for role wiring.

Operators should verify deployment parameters carefully. In particular, token name and symbol parameters in the current module are set to `TEST.live` and `TEST` rather than production branding, which should be reviewed before any mainnet deployment.

## Integration Guidance

### For Frontends

- Read `quote(cftAmountIn)` before presenting redemption output.
- Use `redeemWithPermit` where wallet support exists to avoid a two-step approval flow.
- Always set a user-defined `minUsdcOut` to protect against state changes during inclusion.
- Display both CFT and USDC token decimals correctly in UI formatting.

### For Indexers and Analytics

Track these events:

- `Paid(address to, uint256 amount, bytes32 taskId)`
- `RevenueDeposited(address from, uint256 amount)`
- `Redeemed(address redeemer, uint256 cftIn, uint256 usdcOut)`

Useful derived metrics include:

- cumulative CFT minted via contributor payouts
- outstanding CFT supply
- pool USDC balance
- implied redemption value per CFT
- paid-task count and unique task coverage

### For Treasury Operations

- Deposit only the intended payout asset into the pool.
- Reconcile USDC deposits against accounting records and expected redemption capacity.
- Avoid changing role configuration from hot wallets.

## Invariants Summary

If contracts are wired correctly, the following invariants hold:

1. CFT can only be minted by a `MINTER_ROLE` address.
2. Contributor payouts can only be executed by a `PAYOUT_ROLE` address.
3. A given `taskId` can only be paid once.
4. `RedemptionPool` can only burn CFT that it already holds.
5. Redemption output is always based on the current pro-rata share of pool USDC to total CFT supply.
6. If no USDC backing exists, redemption cannot extract value from the pool.

## Conclusion

The CFT token system is a compact web3 reward-and-redemption architecture built for contributor compensation rather than generalized tokenomics. `CFTToken` provides the asset layer, `ContributorDistributor` provides controlled issuance against unique work items, and `RedemptionPool` provides a transparent redemption sink backed by deposited USDC revenue.

Its strongest properties are simplicity, explicit role boundaries, and deterministic redemption math. Its primary risks are operational rather than algorithmic: admin key security, payout policy integrity, and treasury discipline. Used with strong key management, multisig administration, transparent event indexing, and external review, the design provides a clear foundation for contributor-aligned token rewards and revenue-backed redemption.