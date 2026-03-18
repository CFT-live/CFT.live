# CFT Lotto Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-13
- Scope: [contracts/Lotto.sol](contracts/Lotto.sol), [contracts/Lotto.t.sol](contracts/Lotto.t.sol), and [ignition/modules/Lotto.ts](ignition/modules/Lotto.ts)
- Network target: Arbitrum One
- Randomness source: Chainlink VRF v2.5
- Payment asset: USDC-compatible ERC-20 configured at deployment

## Disclaimer

This document describes the implemented behavior of the lotto contract in this repository. It is not legal, regulatory, financial, or tax advice, and it does not guarantee future upgrades, governance changes, or economic outcomes. Where this document differs from deployed bytecode, the deployed contract governs.

## Abstract

CFT Lotto is a USDC-denominated on-chain lottery that groups ticket purchases into sequential draws. Each draw accepts ticket purchases for a minimum configured duration, then closes and requests verifiable randomness from Chainlink VRF. One ticket index is selected as the winner, the winner claims the prize manually, and a configurable platform fee may be withheld into a separate fee pool. If VRF does not resolve in time, the draw can be canceled and participants may claim refunds.

The design favors simple state transitions, public draw visibility, and externally verifiable winner selection over complex jackpot logic or multiple prize tiers.

## Design Goals

The contract is built around six core goals:

1. Price tickets in a stable settlement asset rather than a volatile native token.
2. Use verifiable randomness for winner selection.
3. Keep each draw isolated, with explicit open, closed, finalized, and claimed states.
4. Allow the winner to claim funds without forcing payout during the VRF callback.
5. Support operational recovery when VRF fulfillment fails or stalls.
6. Expose enough on-chain data for frontends, analytics, and indexers to reconstruct draw history.

## System Overview

At a high level, the lottery flow is:

1. The contract is deployed with USDC, Chainlink VRF settings, ticket price, fee settings, and timing limits.
2. The constructor starts draw 1 immediately.
3. Players buy one or more tickets in the active draw by paying USDC.
4. After the minimum round duration has passed, anyone may close the draw.
5. Closing the draw requests a random number from Chainlink VRF.
6. When VRF fulfills, one ticket index is chosen and the corresponding ticket owner becomes the winner.
7. The winner claims the prize manually.
8. The next draw is not created automatically on finalization; it starts lazily on the next ticket purchase after the previous draw is finalized.

If VRF does not fulfill within the configured timeout window, the owner can cancel the draw and participants can claim refunds instead of prize settlement.

## Contract Architecture

The system is implemented as a single lottery contract, `CFTLotto`, which integrates four functional areas:

1. Draw management
2. Ticket accounting
3. Chainlink VRF randomness requests and fulfillment
4. Fee accrual and prize settlement

Imported building blocks include:

- `VRFConsumerBaseV2Plus`
- `SafeERC20`
- `ReentrancyGuard`
- `Pausable`

## Core State Model

Each draw is stored in a `Draw` struct with the following fields:

- `id`: sequential draw id
- `startTime`: timestamp when the draw was created
- `ticketPrice`: per-ticket USDC price locked in for that draw
- `potSize`: total USDC collected for that draw
- `ticketCount`: total tickets sold
- `open`: whether ticket sales are still open
- `winnerChosen`: whether the draw has been finalized, either by selecting a winner or canceling after timeout
- `winner`: the selected winner, or the zero address if canceled
- `claimed`: whether the winning payout was already claimed

Ticket ownership is recorded by appending one address per ticket to an array per draw. This means each ticket corresponds to an index position, and the winning index is selected as:

$$
\text{winningIndex} = \text{randomWord} \bmod \text{ticketCount}
$$

The holder stored at that index wins the draw.

## Draw Lifecycle

### Draw Creation

The constructor calls `_startNewDraw()`, which initializes draw 1 with the currently configured `ticketPrice` and the current block timestamp.

Subsequent draws are not started at draw close time or winner selection time. Instead, `_ensureOpenDraw()` creates the next draw only when a later `buyTickets()` call sees that the current draw is no longer open and already finalized.

This lazy creation model means there may be idle time between finalized draws if no player initiates the next purchase.

### Ticket Purchase

Players enter using:

```solidity
function buyTickets(uint256 amount)
```

The function enforces:

1. `amount` must be greater than zero.
2. `amount` must not exceed `maxTicketAmount`.
3. The contract must not be paused.
4. There must be an open draw, or the previous draw must already be finalized so a new one can be created.
5. The buyer must have approved the contract to transfer enough USDC.

On success:

1. The contract transfers `ticketPrice * amount` USDC from the buyer.
2. The active draw's `potSize` and `ticketCount` are increased.
3. The buyer's address is appended once per ticket to the draw's ticket array.
4. `TicketsPurchased(drawId, buyer, amount)` is emitted.

Because one address is stored per ticket, gas cost and storage usage scale linearly with ticket quantity.

### Draw Close

Any address may close the active draw through:

```solidity
function closeDraw()
```

The function requires:

1. The draw is still open.
2. At least one ticket has been sold.
3. `block.timestamp >= startTime + minRoundDurationSeconds`.

On success:

1. The draw is marked closed.
2. The close timestamp is recorded.
3. A Chainlink VRF request is submitted.
4. The returned request id is mapped to the draw id.

This emits both `DrawClosed(drawId)` and `RandomnessRequested(drawId, requestId)`.

### Winner Selection

When Chainlink VRF fulfills, `fulfillRandomWords()`:

1. Resolves the associated draw via `requestToDraw`.
2. Computes `winningIndex = randomWords[0] % draw.ticketCount`.
3. Reads the winner from `drawTickets[drawId][winningIndex]`.
4. Stores the winner and marks `winnerChosen = true`.
5. Emits `WinnerSelected(drawId, winner, prize)`.

The VRF callback does not transfer funds. This is a deliberate safety property because it keeps the callback side-effect light and avoids payout failure inside the randomness settlement path.

### Prize Claim

The winner withdraws manually via:

```solidity
function claimWinnings(uint256 drawId)
```

The function requires:

1. The draw must be finalized with a winner.
2. The caller must equal the stored winner.
3. The prize must not already be claimed.

At claim time:

1. The full `potSize` is loaded.
2. If `feeCollector != address(0)` and `feeBps > 0`, a fee is calculated and added to `feePool`.
3. The remaining amount is transferred to the winner in USDC.
4. `claimed` is set to true.
5. `WinningsClaimed(drawId, winner, amount)` is emitted.

The fee formula is:

$$
\text{feeAmount} = \left\lfloor \frac{\text{potSize} \times \text{feeBps}}{10000} \right\rfloor
$$

and the winner payout is:

$$
\text{payout} = \text{potSize} - \text{feeAmount}
$$

## Randomness and Recovery Paths

### Chainlink VRF Parameters

The contract stores:

- `keyHash`
- `subscriptionId`
- `requestConfirmations`
- `callbackGasLimit`

These are owner-configurable. The deployment module in [ignition/modules/Lotto.ts](ignition/modules/Lotto.ts) currently defaults to:

- USDC Arbitrum One address
- `ticketPrice = 1_000_000` or 1 USDC
- `maxTicketAmount = 1000`
- `minRoundDurationSeconds = 600`
- `feeBps = 100` or 1%
- `callbackGasLimit = 500000`

### VRF Retry

If a draw is closed but not yet fulfilled, the owner may retry randomness after one hour using:

```solidity
function retryVRFRequest(uint256 drawId)
```

This allows a fresh VRF request to be submitted without reopening the draw or mutating ticket ownership.

### VRF Timeout Cancellation

If a closed draw still has no fulfillment after `VRF_TIMEOUT`, currently set to 24 hours, the owner may cancel the draw:

```solidity
function cancelDrawAfterTimeout(uint256 drawId)
```

Cancellation finalizes the draw by setting:

- `winnerChosen = true`
- `winner = address(0)`

This makes the draw refund-eligible and allows the system to move on to future draws.

## Refund Mechanics

If a draw is canceled after VRF timeout, participants recover funds using:

```solidity
function claimRefund(uint256 drawId)
```

The function requires:

1. The draw is finalized.
2. The draw has no winner, meaning `winner == address(0)`.
3. The caller still has unclaimed tickets recorded in the draw ticket array.

The function scans the entire ticket array, counts tickets owned by the caller, zeroes those entries out to prevent double refunds, and transfers:

$$
\text{refundAmount} = \text{userTickets} \times \text{ticketPrice}
$$

This design is straightforward but has an important consequence: refund gas grows with total draw size because the contract loops across the full ticket array for each claimant.

## Fee Model

Fees are optional and only applied when the winner claims. The contract stores accumulated fees in a separate `feePool`, and the owner may withdraw them to `feeCollector`.

Important fee properties:

1. If `feeCollector` is the zero address or `feeBps` is zero, no fee is taken from the prize claim.
2. Fees are not transferred continuously; they accumulate in `feePool` and require explicit withdrawal.
3. `withdrawCollectedFees()` transfers only accrued fees, not player pot balances from unresolved draws.

This separation reduces the chance of mixing operator fees with unresolved draw funds in accounting logic.

## Admin Controls and Trust Assumptions

The contract includes owner-controlled configuration for:

- ticket price
- maximum tickets per purchase
- minimum draw duration
- callback gas limit
- fee collector and fee basis points
- VRF key hash, subscription id, and confirmation count
- pause and unpause
- fee withdrawal
- VRF retry
- timeout cancellation

This means the system is not trustless. Users must trust the owner to operate the contract honestly, maintain a valid VRF subscription, and avoid abusive parameter changes.

## Security Properties

The implementation has several positive safety properties:

1. Ticket purchases and prize claims are protected with `nonReentrant`.
2. Funds are denominated in USDC rather than native ETH, reducing price volatility at settlement.
3. Winner selection is derived from Chainlink VRF rather than owner-controlled entropy.
4. The VRF callback performs state updates and event emission only, not payout transfer.
5. Cancellation and refund logic provide a recovery path if randomness stalls.

## Known Limitations and Risks

The current design also has material limitations that operators and users should understand.

### 1. Storage and Gas Growth Per Ticket

Each ticket is stored as one array entry. Large draws increase storage use, purchase gas, `getDrawTickets()` payload size, and refund scan cost.

### 2. Refund Claims Are O(n)

`claimRefund()` loops across every ticket in the draw. Large draws may make refunds more expensive for participants.

### 3. Owner-Centric Operations

The owner can change pricing, fees, VRF parameters, and timeout handling. Production use should therefore place ownership behind a multisig or governance wrapper.

### 4. Prize Claim Is Manual

Winnings are not automatically transferred on winner selection. If the winner never claims, funds remain in the contract for that draw.

### 5. New Draw Creation Is Lazy

The next draw only begins when a later purchase call triggers `_ensureOpenDraw()`. If there is no buyer activity, the system sits idle after a completed draw.

### 6. Per-Transaction Ticket Cap Only

`maxTicketAmount` limits one purchase call, not total tickets owned by an address across the whole draw.

### 7. Public Ticket Visibility

`getDrawTickets()` exposes the complete ticket owner array for a draw. This is transparent, but not private.

## Recommended Web3 Best Practices

For production operation, the following practices are recommended:

1. Use a multisig for ownership and operational controls.
2. Monitor VRF subscription funding continuously.
3. Publish clear fee, refund, and timeout policies to users.
4. Surface draw state, close timing, and live pot size in the frontend.
5. Display that winnings must be claimed manually.
6. Cap practical draw sizes or ticket volumes if refund gas becomes a concern.
7. Index `DrawStarted`, `TicketsPurchased`, `RandomnessRequested`, `WinnerSelected`, `WinningsClaimed`, `DrawCancelled`, and `RefundClaimed` for analytics.
8. Use canonical USDC addresses only.
9. Audit parameter changes and fee withdrawals off-chain.
10. Run an external security review before scaled mainnet use.

## Integration Guidance

### For Frontends

- Show draw status as one of open, awaiting VRF, winner selected, canceled, or claimed.
- Warn users that draw closing is permissionless and may be triggered by any caller after the minimum duration.
- Explain that refunds are only available if the draw is canceled after timeout.
- Show the configured ticket price, fee basis points, and draw minimum duration from on-chain state.

### For Analytics and Subgraphs

Useful metrics include:

- tickets sold per draw
- total pot size per draw
- fee revenue over time
- average time from draw close to fulfillment
- canceled draw count
- refund ratio per canceled draw
- winner concentration by address

### For Treasury and Operations

- Reconcile fee withdrawals against emitted `FeesWithdrawn` events.
- Monitor unclaimed winnings to understand locked-but-owed balances.
- Define an operational playbook for VRF retry and timeout cancellation.

## Invariants Summary

If the contract is operated as intended, the following invariants hold:

1. A draw cannot be closed before the configured minimum duration.
2. A draw with zero tickets cannot be closed.
3. Once a draw is closed, no further tickets can be sold into that draw.
4. Winner selection is based on a ticket index derived from Chainlink VRF output.
5. A winning draw can only be claimed once.
6. A canceled draw has no winner and only supports refunds, not prize claims.
7. Fees are deducted only when winnings are claimed, not when tickets are purchased or randomness is fulfilled.

## Conclusion

CFT Lotto is a straightforward USDC lottery contract built around sequential draws, Chainlink VRF winner selection, manual prize claiming, and a recoverable timeout path. Its strengths are transparent draw accounting, verifiable randomness, and operational simplicity. Its primary risks are owner trust, ticket-array scalability, and refund gas growth in large canceled draws.

Used with disciplined ownership, funded VRF infrastructure, clear frontend disclosure, and external review, the contract provides a practical base for a stablecoin-denominated on-chain lottery product.