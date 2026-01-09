import {
  CFTRoulette,
  TableCreated,
  PlayerJoined,
  PlayerLeft,
  PlayerKicked,
  PlayerReady,
  GameStarted,
  TurnPlayed,
  RandomnessRequested,
  RandomWordsFulfilled,
  PlayerEliminated,
  PlayerTurnChanged,
  PlayerTimedOut,
  GameFinished,
  PayoutClaimed,
  TableCancelled,
} from "../generated/CFTRoulette/CFTRoulette";

import {
  User,
  Table,
  TablePlayer,
  Turn,
  Payout,
  GlobalStats,
} from "../generated/schema";

import { BigInt, Address, store } from "@graphprotocol/graph-ts";

// Constants
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);

function onChainTableStatusToString(status: number): string {
  if (status == 0) return "Open";
  if (status == 1) return "InProgress";
  if (status == 2) return "WaitingRandom";
  if (status == 3) return "Finished";
  if (status == 4) return "Cancelled";
  // Defensive default
  return "Open";
}

function syncOpenTablePlayerPositions(
  contract: CFTRoulette,
  tableId: string,
  timestamp: BigInt
): number {
  let playerAddress = contract.getTablePlayers(BigInt.fromString(tableId));

  for (let i = 0; i < playerAddress.length; i++) {
    let playerId = playerAddress[i].toHex().toLowerCase();
    let tablePlayerId = tableId + "-" + playerId;
    let tablePlayer = TablePlayer.load(tablePlayerId);
    if (tablePlayer) {
      tablePlayer.position = i;
      tablePlayer.save();
    }
  }

  // Keep table.playerCount in sync with on-chain order length.
  let table = Table.load(tableId);
  if (table) {
    table.playerCount = playerAddress.length;
    table.save();
  }

  return playerAddress.length;
}

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = 0;
    stats.totalTables = 0;
    stats.totalTurns = 0;
    stats.totalVolume = ZERO;
    stats.totalWinnings = ZERO;
    stats.totalRefunds = ZERO;
    stats.openTables = 0;
    stats.inProgressTables = 0;
    stats.finishedTables = 0;
    stats.cancelledTables = 0;
    stats.lastUpdated = ZERO;
  }
  return stats;
}

// Helper function to get or create user
function getOrCreateUser(userAddress: Address, timestamp: BigInt): User {
  let userId = userAddress.toHex().toLowerCase();
  let user = User.load(userId);

  if (!user) {
    user = new User(userId);
    user.tablesJoined = 0;
    user.tablesWon = 0;
    user.totalBetAmount = ZERO;
    user.totalWinnings = ZERO;
    user.totalRefunds = ZERO;
    user.createdAt = timestamp;

    // Update global user count
    let globalStats = getOrCreateGlobalStats();
    globalStats.totalUsers = globalStats.totalUsers + 1;
    globalStats.save();
  }

  user.lastActivityAt = timestamp;
  return user;
}

// Handle TableCreated event
export function handleTableCreated(event: TableCreated): void {
  let tableId = event.params.tableId.toString();
  let creatorAddress = event.params.creator;
  let creatorId = creatorAddress.toHex().toLowerCase();

  // Get or create creator user
  let creator = getOrCreateUser(creatorAddress, event.block.timestamp);
  creator.tablesJoined = creator.tablesJoined + 1;
  creator.save();

  // Create table
  let table = new Table(tableId);
  table.creator = creatorId;
  table.status = "Open";
  table.initialBetAmount = event.params.betAmount;
  table.currentBetAmount = event.params.betAmount;
  table.maxIncrement = event.params.maxIncrement;
  table.maxPlayers = event.params.maxPlayers;
  table.totalPool = ZERO;
  table.currentPlayerIndex = 0;
  table.playerCount = 1; // Creator is the first player
  table.alivePlayerCount = 0; // Will be set when game starts
  table.turnStartTime = null;
  table.winner = null;
  table.payoutClaimed = false;
  table.requestId = null;
  table.createdAt = event.block.timestamp;
  table.startedAt = null;
  table.finishedAt = null;
  table.cancelReason = null;
  table.blockNumber = event.block.number;
  table.transactionHash = event.transaction.hash;
  table.save();

  // Create TablePlayer for creator
  let tablePlayerId = tableId + "-" + creatorId;
  let tablePlayer = new TablePlayer(tablePlayerId);
  tablePlayer.table = tableId;
  tablePlayer.user = creatorId;
  tablePlayer.position = 0;
  tablePlayer.status = "Waiting";
  tablePlayer.totalBetAmount = ZERO;
  tablePlayer.turnsPlayed = 0;
  tablePlayer.isReady = false;
  tablePlayer.eliminated = false;
  tablePlayer.eliminatedAt = null;
  tablePlayer.joinedAt = event.block.timestamp;
  tablePlayer.leftAt = null;
  tablePlayer.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalTables = globalStats.totalTables + 1;
  globalStats.openTables = globalStats.openTables + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle PlayerJoined event
export function handlePlayerJoined(event: PlayerJoined): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  // Check if this is the creator (already handled in handleTableCreated)
  let tablePlayerId = tableId + "-" + playerId;
  let existingTablePlayer = TablePlayer.load(tablePlayerId);
  if (existingTablePlayer) {
    // Player rejoining after leaving - reset their status
    existingTablePlayer.status = "Waiting";
    existingTablePlayer.isReady = false;
    existingTablePlayer.leftAt = null;
    existingTablePlayer.joinedAt = event.block.timestamp;
    existingTablePlayer.save();

    // Update user activity
    let user = getOrCreateUser(playerAddress, event.block.timestamp);
    user.tablesJoined = user.tablesJoined + 1;
    user.save();
    return;
  }

  // Get or create user
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  user.tablesJoined = user.tablesJoined + 1;
  user.save();

  // Get table to determine position
  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  // Get position from playerCount (incremented after this)
  let position = table.playerCount;
  table.playerCount = table.playerCount + 1;
  table.save();

  // Create TablePlayer
  let tablePlayer = new TablePlayer(tablePlayerId);
  tablePlayer.table = tableId;
  tablePlayer.user = playerId;
  tablePlayer.position = position;
  tablePlayer.status = "Waiting";
  tablePlayer.totalBetAmount = ZERO;
  tablePlayer.turnsPlayed = 0;
  tablePlayer.isReady = false;
  tablePlayer.eliminated = false;
  tablePlayer.eliminatedAt = null;
  tablePlayer.joinedAt = event.block.timestamp;
  tablePlayer.leftAt = null;
  tablePlayer.save();
}

// Handle PlayerLeft event
export function handlePlayerLeft(event: PlayerLeft): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }

  // Update user activity
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  user.save();

  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  // If game hasn't started yet, remove player completely from the table
  if (table.status == "Open") {
    // Decrement tablesJoined since player is completely removed
    user.tablesJoined = user.tablesJoined - 1;
    user.save();

    // Update table player count
    // We'll re-sync to on-chain ordering below.
    table.playerCount = table.playerCount - 1;
    table.save();

    // Delete the TablePlayer entity - player can rejoin later
    store.remove("TablePlayer", tablePlayerId);

    // Contract swaps/pops the player order array and rewrites positions.
    // Mirror that here to keep `position` consistent for the remaining players.
    let contract = CFTRoulette.bind(event.address);
    let remaining = syncOpenTablePlayerPositions(
      contract,
      tableId,
      event.block.timestamp
    );

    // If no players left, the contract deletes the table; remove it here too.
    if (remaining == 0) {
      store.remove("Table", tableId);

      let globalStats = getOrCreateGlobalStats();
      if (globalStats.openTables > 0) {
        globalStats.openTables = globalStats.openTables - 1;
      }
      globalStats.lastUpdated = event.block.timestamp;
      globalStats.save();
    }
    return;
  }

  // Game has started - mark player as eliminated
  tablePlayer.leftAt = event.block.timestamp;
  tablePlayer.status = "Dead";
  // Do not set eliminated flags here; the contract emits PlayerEliminated in the
  // same transaction and that handler is the single source of truth.
  tablePlayer.save();
}

// Handle PlayerKicked event
export function handlePlayerKicked(event: PlayerKicked): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }

  // Update user - decrement tablesJoined since player is kicked before game starts
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  user.tablesJoined = user.tablesJoined - 1;
  user.save();

  // Update table player count
  let table = Table.load(tableId);
  if (table) {
    table.playerCount = table.playerCount - 1;
    table.save();
  }

  // Delete the TablePlayer entity - kicked players are completely removed
  store.remove("TablePlayer", tablePlayerId);

  // Keep ordering/positions in sync for the remaining players.
  let contract = CFTRoulette.bind(event.address);
  let remaining = syncOpenTablePlayerPositions(
    contract,
    tableId,
    event.block.timestamp
  );

  // If no players left, the contract deletes the table; remove it here too.
  if (remaining == 0) {
    store.remove("Table", tableId);

    let globalStats = getOrCreateGlobalStats();
    if (globalStats.openTables > 0) {
      globalStats.openTables = globalStats.openTables - 1;
    }
    globalStats.lastUpdated = event.block.timestamp;
    globalStats.save();
  }
}

// Handle PlayerReady event
export function handlePlayerReady(event: PlayerReady): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }

  // Update user activity
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  user.save();

  // Mark player as ready
  tablePlayer.status = "Playing";
  tablePlayer.isReady = true;
  tablePlayer.save();
}

// Handle GameStarted event
export function handleGameStarted(event: GameStarted): void {
  let tableId = event.params.tableId.toString();
  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  table.status = "InProgress";
  table.startedAt = event.block.timestamp;
  table.turnStartTime = event.block.timestamp; // First turn starts now
  table.alivePlayerCount = table.playerCount; // All players start alive
  table.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.openTables = globalStats.openTables - 1;
  globalStats.inProgressTables = globalStats.inProgressTables + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle TurnPlayed event
export function handleTurnPlayed(event: TurnPlayed): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();
  let betAmount = event.params.betAmount;
  let playerRandom = event.params.playerRandom;
  let turnNumber = event.params.turnNumber;

  // Update user
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  user.totalBetAmount = user.totalBetAmount.plus(betAmount);
  user.save();

  // Update table
  let table = Table.load(tableId);
  if (!table) {
    return;
  }
  table.totalPool = table.totalPool.plus(betAmount);
  table.currentBetAmount = betAmount; // Update current bet amount for next turn
  table.status = "WaitingRandom";
  table.save();

  // Update table player
  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }
  tablePlayer.totalBetAmount = tablePlayer.totalBetAmount.plus(betAmount);
  tablePlayer.turnsPlayed = tablePlayer.turnsPlayed + 1;
  tablePlayer.save();

  // Create turn entity with proper turn number
  let turnId = tableId + "-" + turnNumber.toString();
  let turn = new Turn(turnId);
  turn.table = tableId;
  turn.tablePlayer = tablePlayerId;
  turn.player = playerId;
  turn.turnNumber = turnNumber.toI32();
  turn.betAmount = betAmount;
  turn.playerRandom = playerRandom;
  turn.serverRandom = null;
  turn.eliminated = false;
  turn.requestId = null;
  turn.randomFulfilled = false;
  turn.createdAt = event.block.timestamp;
  turn.fulfilledAt = null;
  turn.blockNumber = event.block.number;
  turn.transactionHash = event.transaction.hash;
  turn.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalTurns = globalStats.totalTurns + 1;
  globalStats.totalVolume = globalStats.totalVolume.plus(betAmount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle RandomnessRequested event
export function handleRandomnessRequested(event: RandomnessRequested): void {
  let tableId = event.params.tableId.toString();
  let requestId = event.params.requestId;
  let turnNumber = event.params.turnNumber;

  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  table.requestId = requestId;
  table.save();

  // Update the turn with the requestId
  let turnId = tableId + "-" + turnNumber.toString();
  let turn = Turn.load(turnId);
  if (turn) {
    turn.requestId = requestId;
    turn.save();
  }
}

// Handle RandomWordsFulfilled event
export function handleRandomWordsFulfilled(event: RandomWordsFulfilled): void {
  let tableId = event.params.tableId.toString();
  let serverRandom = event.params.serverRandom;
  let turnNumber = event.params.turnNumber;

  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  // Update table status back to InProgress (if not finished)
  if (table.status != "Finished") {
    table.status = "InProgress";
  }

  table.save();

  // Update the turn with the server random number
  let turnId = tableId + "-" + turnNumber.toString();
  let turn = Turn.load(turnId);
  if (turn) {
    turn.serverRandom = serverRandom;
    turn.randomFulfilled = true;
    turn.fulfilledAt = event.block.timestamp;

    // Check if player was eliminated (playerRandom == serverRandom)
    if (turn.playerRandom.equals(serverRandom)) {
      turn.eliminated = true;
    }

    turn.save();
  }
}

// Handle PlayerEliminated event
export function handlePlayerEliminated(event: PlayerEliminated): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }

  // Update user activity
  let user = User.load(playerId);
  if (user) {
    user.lastActivityAt = event.block.timestamp;
    user.save();
  }

  // Mark player as eliminated
  let wasEliminated = tablePlayer.eliminated;
  tablePlayer.status = "Dead";
  tablePlayer.eliminated = true;
  tablePlayer.eliminatedAt = event.block.timestamp;
  tablePlayer.save();

  // Update table state. This fixes a contract/subgraph mismatch when the current
  // player leaves or times out: the contract advances currentPlayerIndex but does
  // not emit PlayerTurnChanged in that path.
  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  let previousIndex = table.currentPlayerIndex;

  let contract = CFTRoulette.bind(event.address);
  let onChainTable = contract.getTable(BigInt.fromString(tableId));
  let newStatus = onChainTableStatusToString(onChainTable.status);
  let newIndex = onChainTable.currentPlayerIndex;

  table.status = newStatus;
  table.currentPlayerIndex = newIndex;

  // The contract sets tableTurnStartTime to block.timestamp when it advances the
  // turn due to elimination (leave/timeout). Mirror that when we detect an index change.
  if (newStatus == "InProgress" && newIndex != previousIndex) {
    table.turnStartTime = event.block.timestamp;
  }

  // Keep alivePlayerCount consistent and idempotent.
  if (!wasEliminated && table.alivePlayerCount > 0) {
    table.alivePlayerCount = table.alivePlayerCount - 1;
  }

  table.save();
}

// Handle PlayerTurnChanged event
export function handlePlayerTurnChanged(event: PlayerTurnChanged): void {
  let tableId = event.params.tableId.toString();
  let currentPlayerIndex = event.params.currentPlayerIndex;
  let turnStartTime = event.params.turnStartTime;

  let table = Table.load(tableId);
  if (table) {
    table.currentPlayerIndex = currentPlayerIndex;
    table.turnStartTime = turnStartTime;
    table.save();
  }
}

// Handle PlayerTimedOut event
export function handlePlayerTimedOut(event: PlayerTimedOut): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();

  let tablePlayerId = tableId + "-" + playerId;
  let tablePlayer = TablePlayer.load(tablePlayerId);
  if (!tablePlayer) {
    return;
  }

  // Update user activity
  let user = User.load(playerId);
  if (user) {
    user.lastActivityAt = event.block.timestamp;
    user.save();
  }

  // Mark player as eliminated due to timeout
  tablePlayer.status = "Dead";
  // Do not set eliminated flags here; the contract emits PlayerEliminated in the
  // same transaction and that handler will update both player + table state.
  tablePlayer.save();
}

// Handle GameFinished event
export function handleGameFinished(event: GameFinished): void {
  let tableId = event.params.tableId.toString();
  let winner = event.params.winner;
  let totalPool = event.params.totalPool;

  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  table.status = "Finished";
  table.winner = winner;
  table.totalPool = totalPool;
  table.finishedAt = event.block.timestamp;
  table.save();

  // Update winner stats if there is a winner
  if (winner.toHex() != "0x0000000000000000000000000000000000000000") {
    let winnerId = winner.toHex().toLowerCase();
    let user = User.load(winnerId);
    if (user) {
      user.tablesWon = user.tablesWon + 1;
      user.lastActivityAt = event.block.timestamp;
      user.save();
    }
  }

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.inProgressTables = globalStats.inProgressTables - 1;
  globalStats.finishedTables = globalStats.finishedTables + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle PayoutClaimed event
export function handlePayoutClaimed(event: PayoutClaimed): void {
  let tableId = event.params.tableId.toString();
  let playerAddress = event.params.player;
  let playerId = playerAddress.toHex().toLowerCase();
  let amount = event.params.amount;
  let isRefund = event.params.isRefund;

  // Update table
  let table = Table.load(tableId);
  if (table) {
    table.payoutClaimed = true;
    table.save();
  }

  // Update user
  let user = getOrCreateUser(playerAddress, event.block.timestamp);
  if (isRefund) {
    user.totalRefunds = user.totalRefunds.plus(amount);
  } else {
    user.totalWinnings = user.totalWinnings.plus(amount);
  }
  user.save();

  // Create payout entity
  let payoutId =
    tableId + "-" + playerId + "-" + event.transaction.hash.toHex();
  let payout = new Payout(payoutId);
  payout.table = tableId;
  payout.user = playerId;
  payout.amount = amount;
  payout.isRefund = isRefund;
  payout.createdAt = event.block.timestamp;
  payout.blockNumber = event.block.number;
  payout.transactionHash = event.transaction.hash;
  payout.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  if (isRefund) {
    globalStats.totalRefunds = globalStats.totalRefunds.plus(amount);
  } else {
    globalStats.totalWinnings = globalStats.totalWinnings.plus(amount);
  }
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle TableCancelled event
export function handleTableCancelled(event: TableCancelled): void {
  let tableId = event.params.tableId.toString();
  let reason = event.params.reason;

  let table = Table.load(tableId);
  if (!table) {
    return;
  }

  // Track previous status for stats update
  let previousStatus = table.status;

  table.status = "Cancelled";
  table.cancelReason = reason;
  table.finishedAt = event.block.timestamp;
  table.save();

  // Update global stats based on previous status
  let globalStats = getOrCreateGlobalStats();
  if (previousStatus == "Open") {
    globalStats.openTables = globalStats.openTables - 1;
  } else if (previousStatus == "InProgress" || previousStatus == "WaitingRandom") {
    globalStats.inProgressTables = globalStats.inProgressTables - 1;
  }
  globalStats.cancelledTables = globalStats.cancelledTables + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}
