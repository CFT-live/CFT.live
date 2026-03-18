# CFT Roulette Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-13
- Scope: [contracts/Roulette.sol](contracts/Roulette.sol), [contracts/Roulette.t.sol](contracts/Roulette.t.sol), and [ignition/modules/Roulette.ts](ignition/modules/Roulette.ts)
- Network target: Arbitrum One
- Randomness source: Chainlink VRF v2.5
- Payment asset: USDC-compatible ERC-20 configured at deployment

## Disclaimer

This document describes the currently implemented behavior of the roulette contract in this repository. It is not legal, financial, or tax advice, and it does not guarantee future governance, parameter values, oracle availability, or economic outcomes. If this document and deployed code differ, deployed code governs.

## Abstract

CFT Roulette is a multiplayer, turn-based elimination game settled in USDC. Players gather at a table, mark themselves ready, and then take turns placing bets. Each turn combines a player-chosen number from 0 to 9 with a Chainlink VRF-generated server number from 0 to 9. If the numbers match, the acting player is eliminated. If they do not match, the player survives and the game advances to the next active player. The last surviving player wins the total pot, less any configured protocol fee.

If Chainlink VRF does not fulfill a randomness request in time, or if all players are eliminated, the game resolves without a winner and eligible players may claim refunds equal to their own contributed amounts.

## Design Goals

The contract is built around six principles:

1. Use verifiable randomness rather than operator-controlled elimination outcomes.
2. Keep the game state explicit through table, player, and turn-specific storage.
3. Let players fund the pot incrementally through actual turns rather than requiring full buy-in on join.
4. Separate game progression from payout collection so settlement remains simple and auditable.
5. Provide timeout recovery for stuck turns awaiting VRF.
6. Support multiple table sizes with configurable minimum and maximum bet parameters.

## System Overview

At a high level, the system operates as follows:

1. A player creates a table with an initial minimum bet, max increment rule, and player cap.
2. Additional players join the open table.
3. Each player marks themselves ready.
4. Once every seated player is ready and at least two players remain, the game starts.
5. The current player places a USDC bet and submits a number from 0 to 9.
6. The contract requests a Chainlink VRF random word.
7. When fulfilled, the server random is reduced modulo 10 and compared to the player's chosen number.
8. If they match, the acting player is eliminated.
9. If more than one player remains, the turn advances to the next live player.
10. If exactly one player remains, that player is the winner and may claim the pot.
11. If no players remain, the game finishes without a winner and contributors may claim refunds.

## Contract Architecture

The system is implemented in a single contract, `CFTRoulette`, which integrates:

1. Table creation and player seating
2. Turn-by-turn betting and pot accounting
3. Chainlink VRF-based elimination checks
4. Timeout handling for inactive turns and delayed randomness
5. Winner payouts and refund processing

The contract uses:

- `VRFConsumerBaseV2Plus`
- `SafeERC20`
- `ReentrancyGuard`
- `Pausable`

## Core State Model

### Table Status

Each table moves through the following `TableStatus` states:

1. `Open`: players may join or leave; the game has not started.
2. `InProgress`: the game is active and awaiting the current player's action.
3. `WaitingRandom`: a turn has been played and the table is waiting for VRF fulfillment.
4. `Finished`: the game has resolved with a winner or a no-winner outcome.
5. `Cancelled`: defined in the enum, but the current implementation typically resolves timeout and failure cases by setting `Finished` with `winner = address(0)` rather than using the `Cancelled` status.

### Player Status

Each player at a table has one of three `PlayerStatus` values:

1. `Waiting`: seated but not ready.
2. `Playing`: ready and currently alive in the game.
3. `Dead`: eliminated or treated as having left after the game began.

### Table Structure

Each table stores:

- creator address
- current status
- current minimum bet for the next turn
- maximum bet increase rule
- total pot size
- max player count
- current player index in turn order
- pending turn data for the current VRF request
- last player and server random values
- fulfillment flag
- winner address
- payout-claimed flag

Player order is maintained in an array per table, and each player's data is stored in a nested mapping.

## Table Lifecycle

### Table Creation

Players create a table through:

```solidity
function createTable(uint256 betAmount, uint256 maxIncrement, uint8 maxPlayers)
```

The function requires:

1. The contract is not paused.
2. `betAmount` is within the configured global min and max bet range.
3. `maxPlayers` is between 2 and 10 inclusive.

On success:

1. A new table id is assigned.
2. The caller becomes the creator and first seated player.
3. The creator is inserted into turn order at position 0.
4. The table starts in `Open` status.

The creator does not contribute funds during table creation. Funds only enter the pot when turns are played.

### Joining a Table

Players join an open table through:

```solidity
function joinTable(uint256 tableId)
```

The function requires:

1. The table exists.
2. The table is still `Open`.
3. The caller is not already seated at that table.
4. The table is not full.

Joining does not require payment. It only adds the player to seating order in `Waiting` status.

### Leaving a Table

Players leave using:

```solidity
function leaveTable(uint256 tableId)
```

Behavior depends on game phase:

1. Before the game starts, the player is removed entirely from the table.
2. If the last seated player leaves an open table, the table is deleted.
3. After the game has started, leaving is treated as elimination and the player forfeits future participation.

This means leaving after the game begins is not a refund mechanism. It is effectively a self-elimination action.

### Ready Check and Game Start

Players become active using:

```solidity
function markPlayerReady(uint256 tableId)
```

Each call moves a seated player from `Waiting` to `Playing`. Once all seated players are marked ready, the game starts automatically if there are at least two active players.

On game start:

1. Table status becomes `InProgress`.
2. `currentPlayerIndex` is set to 0.
3. `tableTurnStartTime` is recorded.
4. `GameStarted(tableId)` is emitted.

## Turn Mechanics

### Playing a Turn

The current player takes their turn via:

```solidity
function playTurn(uint256 tableId, uint256 betAmount, uint256 playerRandom)
```

The function requires:

1. The table exists.
2. The table is in `InProgress` state.
3. The caller is the current player in turn order.
4. The caller is alive with `PlayerStatus.Playing`.
5. `playerRandom` is between 0 and 9 inclusive.
6. `betAmount` is at least the current table minimum bet.
7. If `maxIncrement > 0`, `betAmount` is not greater than `table.betAmount + maxIncrement`.

On success:

1. The contract transfers `betAmount` USDC from the player.
2. The player's `playedAmount` increases.
3. The table's `totalPool` increases.
4. Pending turn fields are updated.
5. The table moves to `WaitingRandom`.
6. A VRF request is sent and mapped back to the table.

### Bet Escalation Rule

After each turn resolves, the table's next minimum bet is set to the previous turn's actual bet amount:

```solidity
table.betAmount = table.pendingBet;
```

This creates an escalating minimum if players choose to increase stakes.

Important implementation note:

The code treats `maxIncrement == 0` as no upper limit on bet increases, because the upper-bound check is skipped entirely when `maxIncrement` is zero. This differs from the function comment that says `0 = fixed bet`. The implemented behavior is therefore:

1. `maxIncrement > 0`: enforce an upper bound.
2. `maxIncrement == 0`: allow any bet greater than or equal to the current minimum.

Integrators should rely on the code behavior, not the inline comment.

## Randomness and Elimination

### VRF Request Lifecycle

After a turn is played, the contract requests one random word from Chainlink VRF v2.5. The request id is mapped to:

- the table id
- the turn number

The table stores the request timestamp so timeout recovery can be enforced.

### Elimination Rule

When `fulfillRandomWords()` executes, the contract computes:

$$
serverRandom = randomWords[0] \bmod 10
$$

The acting player is eliminated if:

$$
playerRandom = serverRandom
$$

Otherwise the player survives.

The elimination probability per turn is therefore nominally:

$$
P(\text{elimination}) = \frac{1}{10}
$$

assuming unbiased VRF output and a uniformly chosen player input.

### Post-Fulfillment Flow

After VRF fulfillment:

1. The server random is stored.
2. If the player is eliminated, `_eliminatePlayer()` marks them dead.
3. The next minimum bet is updated to the pending bet.
4. If the game is not over, the next live player becomes current player.
5. `tableTurnStartTime` resets for the new turn.

If only one live player remains, the table moves to `Finished` and that player becomes the winner.

If zero live players remain, the table also moves to `Finished`, but `winner` is set to the zero address and the game becomes refund-only.

## Timeout and Recovery Paths

### VRF Timeout

If a table is in `WaitingRandom` and VRF has not fulfilled within `VRF_TIMEOUT`, currently 10 minutes, anyone may call:

```solidity
function cancelTableAfterTimeout(uint256 tableId)
```

This requires:

1. The table exists.
2. The table is still `WaitingRandom`.
3. Random words have not already been fulfilled.
4. The timeout threshold has been reached.

On success:

1. The table is forced to `Finished`.
2. `winner` is set to the zero address.
3. The game becomes refundable for contributors with non-zero `playedAmount`.

### Turn Timeout

If the current player does not act within `TURN_TIMEOUT`, currently 10 minutes, anyone may call:

```solidity
function eliminateInactivePlayer(uint256 tableId)
```

This eliminates the inactive current player and advances the table just as if the player had been removed during gameplay.

This mechanism ensures tables do not stall indefinitely due to inactivity.

## Payout and Refund Mechanics

### Winner Payout

When a table finishes with a winner, the winner claims via:

```solidity
function claimWinnings(uint256 tableId)
```

The function requires:

1. The table exists.
2. The table is `Finished`.
3. The caller is the recorded winner.
4. The payout has not already been claimed.

The payout starts as the full `totalPool`. If fees are enabled, the protocol fee is deducted:

$$
feeAmount = \left\lfloor \frac{totalPool \times feeBps}{10000} \right\rfloor
$$

and the winner receives:

$$
payout = totalPool - feeAmount
$$

### Refunds

If a table finishes with `winner == address(0)`, eligible players may claim refunds using:

```solidity
function claimRefund(uint256 tableId)
```

The refund requires:

1. The table exists.
2. The table is `Finished`.
3. There is no winner.
4. The caller is a player at that table.
5. The caller has `playedAmount > 0`.

The refund amount equals the caller's own contributed total:

$$
refundAmount = playedAmount
$$

After refund, `playedAmount` is set to zero to prevent double claims.

This refund design means players recover only what they personally contributed, not a pro-rata share of the full table pool.

## Fee Model

The contract stores:

- `feeCollector`
- `feeBps`
- `feePool`

Fees are applied only when the winner claims the final payout. They are not charged on joining, on each turn, or on refunds.

Collected fees accumulate in `feePool` and may be withdrawn by the owner to `feeCollector` via:

```solidity
function withdrawCollectedFees()
```

If `feeCollector == address(0)` or `feeBps == 0`, the winner receives the full pot and no fees accrue.

## Deployment Defaults

The Hardhat Ignition module in [ignition/modules/Roulette.ts](ignition/modules/Roulette.ts) currently defaults to:

- Arbitrum One USDC as the payment token
- Chainlink VRF coordinator for Arbitrum One
- the configured VRF key hash and subscription id in the module
- `minBetAmount = 1 USDC`
- `maxBetAmount = 1000 USDC`
- `feeBps = 100` or 1%
- `callbackGasLimit = 500000`

These defaults are deployment parameters, not immutable protocol constants.

## Admin Controls and Trust Assumptions

The owner can:

- change min and max bet amounts
- change fee collector and fee basis points
- change VRF key hash, subscription id, and confirmation count
- change callback gas limit
- withdraw accrued protocol fees
- pause and unpause the contract
- kick unready players from open tables

This means the system is not fully trustless. Users must trust the owner to manage fees, VRF configuration, and moderation powers responsibly.

Notably, the owner can kick players from open tables before the game starts, including the creator, provided those players have not yet marked themselves ready.

## Security Properties

The implementation includes several useful safety properties:

1. Table creation, joining, leaving, playing turns, claiming winnings, refunds, timeout eliminations, and kicks are protected with `nonReentrant` where value-sensitive.
2. Elimination outcomes depend on Chainlink VRF rather than owner-provided randomness.
3. Tables cannot continue using a stalled VRF request indefinitely because a timeout path exists.
4. Inactive current players can be removed permissionlessly after a timeout.
5. Winner payout is single-claim only.
6. Refunds are also protected against double-claim through `playedAmount = 0`.

## Known Limitations and Risks

The current implementation is intentionally simple, but it has important caveats.

### 1. Join Is Free, Pot Builds Only Through Turns

Players do not pay to sit at a table. Only completed turns add value to the pot. This means late-eliminated players may have contributed significantly more than early-eliminated players, and refunds in no-winner scenarios depend solely on each player's own contributions.

### 2. `maxIncrement == 0` Means Unlimited Increase

The code behavior conflicts with the function comment. In implementation, zero does not mean fixed bet; it means there is no enforced upper cap above the current minimum.

### 3. Table Status `Cancelled` Is Largely Unused

Although `Cancelled` exists in the enum, the main timeout failure path resolves to `Finished` with `winner = address(0)`. Integrators should key refund logic off actual state behavior, not enum naming assumptions.

### 4. Turn Order Uses a Persistent Player Array

Dead players remain in the player-order array and are skipped during turn advancement. This is efficient enough for small tables, but the implementation depends on iteration over that array to find the next live player.

### 5. Current Player May Self-Eliminate by Leaving

If a player leaves during an active game, they are marked dead. If it was their turn, turn advancement logic may immediately move to the next live player.

### 6. Game Requires External Progress Calls

Players or automation still need to call the relevant functions. There is no autonomous scheduler. If the current player never acts, someone else must call the timeout function.

### 7. No Table-Level Treasury Segregation

All USDC is held in the contract while accounting is tracked per table and per player. This is normal for a smart contract game, but it means operator and integrator tooling should monitor aggregate liabilities carefully.

## Recommended Web3 Best Practices

For production use, the following practices are recommended:

1. Put ownership behind a multisig.
2. Monitor VRF subscription health continuously.
3. Run operational automation that alerts on tables stuck in `WaitingRandom` or overdue active turns.
4. Surface the `maxIncrement == 0` behavior clearly in the frontend if it is retained.
5. Show players that joining does not fund the pot; only actual turns do.
6. Expose turn timeout countdowns and current-player state in the frontend.
7. Index `TableCreated`, `PlayerJoined`, `PlayerReady`, `TurnPlayed`, `RandomWordsFulfilled`, `PlayerEliminated`, `GameFinished`, `PayoutClaimed`, and `TableCancelled` for analytics and support.
8. Reconcile protocol fee withdrawals against emitted `FeesWithdrawn` events.
9. Use canonical USDC and verified Chainlink VRF endpoints only.
10. Complete an external security review before scaled mainnet use.

## Integration Guidance

### For Frontends

- Display turn ownership clearly so only the current player is prompted to act.
- Show the current minimum bet and any increment cap for the next turn.
- Explain that a player's chosen number is compared against a VRF-derived number modulo 10.
- Make refund and timeout states explicit to users.
- Show whether the table has a winner or is refund-only when finished.

### For Analytics and Indexers

Useful metrics include:

- tables created per day
- average players per table
- average turns per completed game
- total USDC volume wagered per table
- fee revenue over time
- timeout rate for turns and VRF requests
- proportion of tables ending with refunds versus winners

## Invariants Summary

If the system is operated as intended, the following invariants hold:

1. Only the current live player may play the next turn.
2. Each turn adds its actual bet amount to the pot exactly once.
3. The next turn's minimum bet becomes the previous turn's actual bet.
4. A player is eliminated if and only if their chosen digit matches the VRF-derived digit.
5. A finished table can be paid out only once to its winner.
6. A no-winner finished table allows refunds only to players with non-zero contributed amounts.
7. Fees are charged only when the winner claims the final payout.

## Conclusion

CFT Roulette is a compact, turn-based elimination game that combines user-selected inputs with Chainlink VRF to decide survival at each step. Its strengths are transparent state transitions, simple table mechanics, and clear winner-or-refund outcomes. Its main risks are operational rather than cryptographic: VRF reliability, timeout handling, owner moderation powers, and the subtle but important gap between documented and implemented bet-increment semantics.

Used with strong operational monitoring, multisig administration, accurate frontend disclosures, and external security review, the contract provides a workable base for a USDC-settled multiplayer roulette-style game.