# CFT Prediction Market Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-13
- Scope: [contracts/PredictionMarket.sol](contracts/PredictionMarket.sol), [contracts/PredictionMarket.t.sol](contracts/PredictionMarket.t.sol), and [ignition/modules/PredictionMarket.ts](ignition/modules/PredictionMarket.ts)
- Network target: Arbitrum One
- Oracle source: Pyth Network price feeds
- Payment asset: USDC-compatible ERC-20 configured at deployment

## Disclaimer

This document describes the implemented behavior of the prediction market contract in this repository. It is not legal, financial, or tax advice, and it is not a guarantee of future governance, parameter values, token listings, oracle availability, or user returns. If this document differs from deployed contract code, the deployed code governs.

## Abstract

CFT Prediction Market is an on-chain, ERC-20-settled directional market where users predict whether an asset price will move up or down between a round's lock time and close time. Users first deposit the payment token into an internal ledger, then place bets on open rounds. When a round reaches its lock time, the protocol records the lock price from Pyth and moves the round live. When the round reaches close time, the protocol fetches the close price, resolves the winning side, and allows winners to claim their proportional payout. If oracle data is unavailable, stale, late, or the round lacks balanced participation, the round is canceled and bettors are refunded.

The system is designed as a discrete, round-based market rather than a continuous order book. It prioritizes deterministic settlement, configurable market cadence, and simple payout accounting.

## Design Goals

The contract is built around seven core goals:

1. Settle bets in a stable ERC-20 asset rather than native gas token exposure.
2. Use externally sourced market data from Pyth rather than owner-supplied prices.
3. Keep round creation, round start, and round close as explicit on-chain states.
4. Allow anyone to advance eligible rounds, reducing dependence on a single operator for routine progression.
5. Provide cancel-and-refund behavior when oracle conditions or market structure make fair settlement impossible.
6. Expose payout multipliers transparently on-chain.
7. Separate external token custody from betting balance accounting through an internal user ledger.

## System Overview

At a high level, the market works as follows:

1. A user deposits the payment token into the contract.
2. A user creates a new open round and places the first bet, or joins an existing open round with a bet.
3. While the round remains open and before the lock buffer window, users can bet either `Up` or `Down`.
4. Once the round reaches `lockAt`, anyone may call `advance()` to try to start it.
5. If valid oracle data is available and both sides have liquidity, the contract stores the lock price and marks the round `Live`.
6. Once the round reaches `closeAt`, anyone may call `advance()` again to try to close it.
7. If valid oracle data is available and the close price differs from the lock price, the contract marks the winning direction and closes the round.
8. Users claim refunds for canceled rounds or proportional winnings for successful rounds.
9. Claimed winnings are credited to the user's internal balance, which can later be withdrawn.

This model separates market resolution from token withdrawal. Claiming a winning bet increases a user's internal ledger balance; a separate withdrawal is required to move tokens back to the wallet.

## Supported Assets

The contract defines ten supported assets via the `Asset` enum:

1. ETH
2. ARB
3. AAVE
4. BTC
5. SOL
6. XRP
7. BNB
8. DOGE
9. PEPE
10. SHIB

Each asset is mapped to a dedicated Pyth price feed id. The constructor requires all feed ids to be non-zero, and the owner may later update each feed id individually.

## Contract Architecture

The system is implemented in a single contract, `CFTPredictionMarket`, which combines:

1. ERC-20 deposit and withdrawal accounting
2. Round creation and state progression
3. Bet storage and claim processing
4. Oracle-based resolution via Pyth
5. Protocol fee accrual

The contract uses:

- `SafeERC20` for token transfers
- a custom non-reentrancy guard
- Pyth's `getPriceNoOlderThan` interface for price retrieval

## State Model

### Rounds

Each `Round` stores:

- `creator`: address that created the round
- `lockAt`: timestamp when the round should start and lock betting
- `closeAt`: timestamp when the round should resolve
- `lockPrice`: price captured at round start
- `status`: `Open`, `Live`, `Closed`, or `Cancelled`
- `asset`: asset being predicted
- `upAmount`: total amount bet on `Up`
- `downAmount`: total amount bet on `Down`
- `closePrice`: price captured at round close
- `finalPosition`: `Up`, `Down`, or `Unset`

### Bets

Each `Bet` stores:

- `roundId`
- `position`
- `amount`
- `claimed`
- `user`

Bet ids are sequential and begin at 1.

### Internal Ledger

Users do not bet directly from wallet balances. Instead, the contract maintains:

```solidity
mapping(address => uint128) public balanceOf;
```

This ledger represents deposited but not currently wagered funds, plus any claimed winnings or refunds that have not yet been withdrawn.

## Deposits and Withdrawals

### Deposits

Users deposit via:

```solidity
function deposit(uint128 amount)
```

The function:

1. Requires the contract not to be paused.
2. Requires `amount > 0`.
3. Transfers tokens from the user to the contract.
4. Credits the user's internal balance.
5. Emits `Deposited(user, amount)`.

### Withdrawals

Users withdraw their entire available balance via:

```solidity
function withdrawAll()
```

The function:

1. Requires a positive internal balance.
2. Transfers that full amount back to the user.
3. Emits `Withdrawn(user, amount)`.
4. Sets the internal balance to zero.

There is no partial-withdraw function in the current implementation.

## Round Lifecycle

### Round Creation

Rounds can be created through:

```solidity
function createOpenRoundAndBet(
    uint64 lockAt,
    uint64 closeAt,
    Asset asset,
    Position position,
    uint128 amount
)
```

This is the public user-facing entry point that both creates a round and places the creator's initial bet.

The contract enforces:

1. The contract must not be paused.
2. The caller must not be a contract or proxy.
3. The initial amount must fall within min and max bet limits.
4. The caller must have enough internal balance.
5. The caller must not exceed `maxOpenRoundsPerUser` among currently open rounds they created.
6. `lockAt` must be sufficiently in the future.
7. `closeAt` must be sufficiently after `lockAt`.

The timing validation is:

$$
lockAt > now + minLockTime
$$

and

$$
closeAt > lockAt + minOpenTime
$$

If valid, the round is created in `Open` status and the initial bet is placed immediately.

### Betting on Open Rounds

Users enter existing rounds through:

```solidity
function placeBet(uint128 roundId, Position position, uint128 amount)
```

The function requires:

1. The contract must not be paused.
2. The caller must not be a contract or proxy.
3. `position` must be `Up` or `Down`.
4. The amount must satisfy configured bet limits.
5. The user must have enough internal balance.
6. The round must exist.
7. The round must still be `Open`.
8. The current time must be before `lockAt - betLockBuffer`.

If successful:

1. The bet is stored under the next bet id.
2. The user's internal balance is reduced.
3. The round's `upAmount` or `downAmount` is increased.
4. `BetPlaced(...)` is emitted.
5. `PayoutsCalculated(roundId, payoutUp, payoutDown)` is emitted using the current round totals.

The same user may place multiple bets on the same round. The current implementation does not prevent this.

### Starting a Round

An open round moves live when `_startRound(roundId)` succeeds. This happens via public `advance()` or owner-only `startRound(roundId)`.

The round can start only when:

1. It is still `Open`.
2. The current time is at or after `lockAt`.
3. It has not aged beyond `lockAt + dataWaitWindow`.
4. Both `upAmount` and `downAmount` are non-zero.
5. Pyth returns valid, non-stale, positive price data.

If both-sided liquidity is missing, or the round is too late to start, the round is canceled instead of started.

If price retrieval fails within the allowed window, the round remains open and can be retried by a later `advance()` call.

On successful start:

1. `lockPrice` is stored.
2. Status changes from `Open` to `Live`.
3. The round id is removed from `openRoundIds` and added to `liveRoundIds`.
4. `RoundStarted(roundId, lockPrice)` is emitted.

### Closing a Round

A live round resolves through `_closeRound(roundId)`, triggered by public `advance()` or owner-only `closeRound(roundId)`.

The round can close only when:

1. It exists.
2. Its status is `Live`.
3. The current time is at or after `closeAt`.

If the close attempt happens after `closeAt + dataWaitWindow`, the round is canceled.

If price retrieval fails but the call is still within the wait window, the round remains live and can be retried later.

If a valid close price is fetched:

1. `closePrice` is stored.
2. The final direction is computed by comparing `closePrice` against `lockPrice`.
3. If `closePrice > lockPrice`, the final position is `Up`.
4. If `closePrice < lockPrice`, the final position is `Down`.
5. If prices are equal, the round is canceled as a tie.

Successful close emits:

```solidity
RoundClosed(roundId, closePrice, finalPosition)
```

Canceled close emits:

```solidity
RoundCancelled(roundId)
```

## Public Advancement Model

The contract exposes:

```solidity
function advance()
```

This function is permissionless, but rate-limited by `advanceCooldown`. On each call it:

1. Starts every eligible open round.
2. Closes every eligible live round.
3. Updates `lastAdvanceTimestamp`.

This pattern reduces reliance on a centralized operator for routine lifecycle transitions, but the protocol still depends on some actor calling `advance()` when rounds become eligible.

## Oracle Model

The contract uses:

```solidity
pyth.getPriceNoOlderThan(priceFeedId, priceMaxAge)
```

The price fetch succeeds only if:

1. The asset's feed id is configured.
2. Pyth returns a non-stale update within `priceMaxAge`.
3. The returned price is positive.
4. The confidence field is not equal to `type(uint64).max`.

If these checks fail, `_fetchPrice()` returns `(false, 0)` and the calling lifecycle function either retries later or cancels the round depending on timing.

This gives the system a controlled fail-safe path for missing or unreliable data rather than forcing resolution on invalid oracle inputs.

## Payout Mechanics

### Payout Multipliers

For each round, the contract computes payout multipliers as:

$$
payoutUp = \frac{(upAmount + downAmount) \times SCALE}{upAmount}
$$

when `upAmount > 0`, and:

$$
payoutDown = \frac{(upAmount + downAmount) \times SCALE}{downAmount}
$$

when `downAmount > 0`, where:

$$
SCALE = 10^{18}
$$

These multipliers represent the gross proportional return per unit bet for the winning side.

### Claiming

Users claim one or more bets at once through:

```solidity
function claim(uint128[] calldata betIds)
```

For each bet id supplied:

1. If the bet does not exist, already claimed, or belongs to another user, it is skipped.
2. If the round is `Cancelled`, the original bet amount is refunded.
3. If the round is `Closed` and the bet is on the winning side, the user receives the proportional payout.
4. Losing bets receive nothing.

Importantly, the function does not transfer funds to the wallet directly. It adds the total claim value to `balanceOf[msg.sender]`. The user must call `withdrawAll()` to exit funds.

### Winning Bet Formula

If a winning bet amount is `b`, and the applicable payout multiplier is `m`, then the gross round payout is:

$$
grossPayout = \frac{m \times b}{SCALE}
$$

If fees are enabled, the fee is:

$$
feeAmount = \left\lfloor \frac{grossPayout \times feeBps}{10000} \right\rfloor
$$

and the credited user payout is:

$$
netPayout = grossPayout - feeAmount
$$

Fee amounts accumulate in `feePool`.

## Cancellation and Refund Conditions

Rounds may be canceled under several conditions:

1. The round fails to start before `lockAt + dataWaitWindow`.
2. The round has no `Up` bets or no `Down` bets when start is attempted.
3. The round fails to close before `closeAt + dataWaitWindow`.
4. The close price equals the lock price, creating a tie.

Canceled rounds refund principal only. Users must still claim the refund through `claim(...)`; refunds are not pushed automatically.

## Fee Model

The contract supports an optional protocol fee using:

- `feeCollector`
- `feeBps`
- `feePool`

Fees are charged only on winning claims, not on deposits, round creation, losing bets, or refunds.

The owner may withdraw accumulated fees via:

```solidity
function withdrawCollectedFees()
```

This requires a non-zero fee collector address. If `feeCollector == address(0)` or `feeBps == 0`, winners receive the full gross payout and no fee is accrued.

## Deployment Defaults

The Hardhat Ignition module in [ignition/modules/PredictionMarket.ts](ignition/modules/PredictionMarket.ts) currently defaults to:

- Arbitrum One USDC as the payment token
- Arbitrum One Pyth contract as the oracle source
- Pyth feed ids for ETH, ARB, AAVE, BTC, SOL, XRP, BNB, DOGE, PEPE, and SHIB
- `betLockBuffer = 10` seconds
- `dataWaitWindow = 15` seconds
- `feeBps = 100` or 1%
- `minBetAmount = 1 USDC`
- `maxBetAmount = 1000 USDC`
- `maxOpenRoundsPerUser = 5`
- `minOpenTime = 60` seconds
- `minLockTime = 60` seconds
- `advanceCooldown = 5` seconds
- `priceMaxAge = 60` seconds

These values are operational defaults, not immutable protocol constants.

## Admin Controls and Trust Assumptions

The owner can:

- change bet limits
- change fee collector and fee basis points
- update each asset's price feed id
- pause and unpause the market
- change bet-lock buffer and data-wait window
- change advance cooldown and price max age
- change max open rounds per user
- change minimum open and lock times
- start and close rounds manually
- withdraw protocol fees
- recover unrelated ERC-20 tokens sent by mistake
- transfer ownership

This means the system is operationally centralized at the owner layer. Users must trust the owner not to abuse parameters, misconfigure feeds, or interfere with round management.

## Security Properties

The implementation includes several useful safety properties:

1. Deposits, withdrawals, creation-plus-bet, and claims are protected by a reentrancy guard.
2. Market resolution uses Pyth oracle data rather than owner-submitted price values.
3. Tie outcomes do not force arbitrary winner selection; they cancel and refund instead.
4. Failed price fetches do not automatically corrupt rounds; within the wait window they are retryable.
5. Users claim in batches and skipped invalid bet ids do not revert the entire claim flow.
6. Fee collection is accrued separately from user balances.

## Known Limitations and Risks

The current implementation is intentionally simple, but there are important tradeoffs.

### 1. Internal Ledger Custody Model

Users must trust the contract to safely hold deposited payment tokens until withdrawal. This is a custodial smart-contract balance model rather than direct wallet-to-bet settlement.

### 2. Round Progress Requires External Calls

`advance()` is permissionless, but rounds do not progress automatically. If no actor calls `advance()`, eligible rounds remain stale.

### 3. Owner Parameter Risk

The owner can materially change market operation through feed updates, timing windows, fee settings, and pause state.

### 4. Contract Wallet Restriction

Public betting functions block contracts and proxies using `extcodesize` and `tx.origin`. This excludes many smart wallets, account abstraction setups, and automation integrations.

### 5. Claims Credit Ledger, Not Wallet

Users may expect `claim()` to transfer funds directly. It does not. Claimed amounts are added to internal balance and require a later `withdrawAll()` call.

### 6. No Partial Withdrawals

The current implementation only supports full withdrawal of available internal balance.

### 7. No Round Creator Reward Logic

The round creator is stored, and open-round creation is rate-limited per creator, but creators do not receive any special payout or fee share in the current contract.

### 8. Oracle Availability Dependency

If oracle data is stale or unavailable, rounds may remain retryable for a period and eventually cancel. This protects fairness, but it can delay resolution.

## Recommended Web3 Best Practices

For production usage, the following practices are recommended:

1. Put ownership behind a multisig rather than an EOA.
2. Monitor Pyth freshness, confidence, and publication latency continuously.
3. Run an automation service that calls `advance()` shortly after lock and close deadlines.
4. Surface internal balance, claimable value, and withdrawal requirement clearly in the frontend.
5. Publish transparent policies for ties, stale oracle handling, and canceled-round refunds.
6. Track all owner parameter changes off-chain.
7. Use conservative `priceMaxAge` and wait-window settings appropriate to each asset's oracle behavior.
8. Consider whether `notContract` restrictions align with the intended wallet support policy.
9. Index all round, bet, claim, and refund events for analytics and support tooling.
10. Complete an external security review before scaled mainnet operation.

## Integration Guidance

### For Frontends

- Explain the two-step fund flow: deposit first, then bet.
- Show betting cutoff as `lockAt - betLockBuffer`, not just `lockAt`.
- Display whether a resolved claim must still be withdrawn from internal balance.
- Surface `getNextAdvanceDeadline()` so operators or keepers know when the next lifecycle action is due.
- Show current payout multipliers from `calculateRoundPayouts(roundId)` while rounds remain open.

### For Indexers and Analytics

Track at minimum:

- `RoundCreated`
- `BetPlaced`
- `RoundStarted`
- `RoundClosed`
- `RoundCancelled`
- `BetClaimed`
- `BetRefunded`
- `Deposited`
- `Withdrawn`
- `PayoutsCalculated`

Useful derived metrics include:

- total betting volume by asset
- win-rate skew by side
- cancellation rate by asset
- average time from lock to start and close to resolution
- fee revenue over time
- claim lag and withdrawal lag
- concentration of round creation by user

## Invariants Summary

If the system is operated as intended, the following invariants hold:

1. Bets can only be placed on `Open` rounds before the lock buffer cutoff.
2. A round can only move `Open -> Live` after a valid lock price is obtained.
3. A round can only move `Live -> Closed` after a valid close price is obtained and the direction is non-tied.
4. Canceled rounds refund principal only.
5. Closed rounds pay only the winning side.
6. Claims credit internal balances rather than transferring immediately to wallets.
7. Fee deductions apply only to winning payouts.

## Conclusion

CFT Prediction Market is a discrete, oracle-settled directional betting protocol built around internal token balances, round-based lifecycle control, transparent payout math, and deterministic cancellation rules. Its strongest properties are explicit state transitions, retryable oracle handling, and clean separation between claim accounting and token withdrawal. Its main risks are owner control, oracle dependence, external advancement requirements, and user-experience complexity around the internal ledger.

Used with disciplined operations, multisig ownership, reliable round advancement, and clear frontend disclosures, the contract provides a practical foundation for a stablecoin-settled on-chain prediction market.