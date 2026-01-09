import {
  RoundCreated,
  BetPlaced,
  RoundStarted,
  RoundClosed,
  RoundCancelled,
  BetClaimed,
  BetRefunded,
  PayoutsCalculated
} from "../generated/CFTPredictionMarket/CFTPredictionMarket";

import { 
  User, 
  Bet, 
  Round, 
  DailyStats, 
  GlobalStats,
  Transaction,
  UserRound
} from "../generated/schema";

import { BigInt, Address, BigDecimal } from "@graphprotocol/graph-ts";

// Constants
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);
const SECONDS_PER_DAY = BigInt.fromI32(86400);

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = 0;
    stats.totalBets = 0;
    stats.totalVolume = ZERO;
    stats.totalRounds = 0;
    stats.openRounds = 0;
    stats.liveRounds = 0;
    stats.closedRounds = 0;
    stats.cancelledRounds = 0;
    stats.upBets = 0;
    stats.downBets = 0;
    stats.upVolume = ZERO;
    stats.downVolume = ZERO;
    stats.totalClaimed = ZERO;
    stats.totalRefunded = ZERO;
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
    user.totalBets = ZERO;
    user.totalAmount = ZERO;
    user.totalWinnings = ZERO;
    user.totalLosses = ZERO;
    user.totalClaimed = ZERO;
    user.winRate = BigDecimal.fromString("0");
    user.profitLoss = ZERO;
    user.createdAt = timestamp;
    user.upBets = 0;
    user.downBets = 0;
    user.wonBets = 0;
    user.lostBets = 0;
    user.refundedBets = 0;
    user.lastBetTime = ZERO;
    user.lastClaimTime = ZERO;
    user.currentBalance = ZERO; // Initialize with zero balance
    
    // Update global user count
    let globalStats = getOrCreateGlobalStats();
    globalStats.totalUsers = globalStats.totalUsers + 1;
    globalStats.save();
  }
  
  user.lastActivityAt = timestamp;
  return user;
}

// Helper function to get or create daily stats
function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  let dayTimestamp = timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);
  let dayId = dayTimestamp.toString();
  
  let stats = DailyStats.load(dayId);
  if (!stats) {
    stats = new DailyStats(dayId);
    let date = new Date(dayTimestamp.toI32() * 1000);
    stats.date = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    stats.totalBets = 0;
    stats.totalVolume = ZERO;
    stats.uniqueUsers = 0;
    stats.roundsCreated = 0;
    stats.roundsClosed = 0;
    stats.upVolume = ZERO;
    stats.downVolume = ZERO;
    stats.newUsers = 0;
    stats.activeUsers = 0;
    stats.totalClaimed = ZERO;
    stats.totalRefunded = ZERO;
  }
  return stats;
}

// Helper function to get asset string - matches contract enum Asset { Eth, Arb, Aave, Btc, Sol, Xrp, Bnb, Doge, Pepe, Shib }
function getAssetString(asset: number): string {
  if (asset == 0) return "ETH";
  if (asset == 1) return "ARB";
  if (asset == 2) return "AAVE";
  if (asset == 3) return "BTC";
  if (asset == 4) return "SOL";
  if (asset == 5) return "XRP";
  if (asset == 6) return "BNB";
  if (asset == 7) return "DOGE";
  if (asset == 8) return "PEPE";
  if (asset == 9) return "SHIB";
  return "ETH"; // default fallback
}

// Helper function to get position string - matches contract enum Position { Unset, Up, Down }
function getPositionString(position: number): string {
  if (position == 0) return "UNSET";
  if (position == 1) return "UP";
  if (position == 2) return "DOWN";
  return "UNSET";
}

// Helper function to get round status string - matches contract enum RoundStatus { Open, Live, Closed, Cancelled }
function getRoundStatusString(status: number): string {
  if (status == 0) return "OPEN";
  if (status == 1) return "LIVE";
  if (status == 2) return "CLOSED";
  if (status == 3) return "CANCELLED";
  return "OPEN";
}

// Handle RoundCreated event: RoundCreated(indexed uint128 roundId, uint64 lockAt, uint64 closeAt, Asset asset)
export function handleRoundCreated(event: RoundCreated): void {
  let roundId = event.params.roundId.toString();
  
  let round = new Round(roundId);
  round.status = "OPEN";
  round.createdAt = event.block.timestamp;
  round.lockAt = event.params.lockAt;
  round.closeAt = event.params.closeAt;
  round.asset = getAssetString(event.params.asset);
  
  round.lockPrice = ZERO;
  round.closePrice = ZERO;
  round.upAmount = ZERO;
  round.downAmount = ZERO;
  round.finalPosition = "UNSET"; // 0 = no outcome yet, 1 = Up won, 2 = Down won
  round.waitingForStart = true; // Initially waiting for start price
  round.waitingForEnd = false; // Not waiting for end price yet

  round.totalAmount = ZERO;
  round.upBetsCount = 0;
  round.downBetsCount = 0;
  round.totalBetsCount = 0;
  round.priceChange = ZERO;
  round.priceChangePercent = BigDecimal.fromString("0");
  round.payoutUp = ZERO;
  round.payoutDown = ZERO;
  round.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalRounds = globalStats.totalRounds + 1;
  globalStats.openRounds = globalStats.openRounds + 1;
  globalStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.roundsCreated = dailyStats.roundsCreated + 1;
  dailyStats.save();
}

// Handle BetPlaced event: BetPlaced(indexed uint128 betId, indexed uint128 roundId, indexed address user, uint8 position, uint128 amount)
export function handleBetPlaced(event: BetPlaced): void {
  let roundId = event.params.roundId.toString();
  let userAddress = event.params.user;
  let userId = userAddress.toHex().toLowerCase();
  let betId = event.params.betId.toString();

  // Get or create user
  let user = getOrCreateUser(userAddress, event.block.timestamp);
  
  // Update user stats
  user.totalBets = user.totalBets.plus(ONE);
  user.totalAmount = user.totalAmount.plus(event.params.amount);
  user.lastBetTime = event.block.timestamp;
  
  // Update position-specific stats
  if (event.params.position == 1) { // UP
    user.upBets = user.upBets + 1;
  } else if (event.params.position == 2) { // DOWN
    user.downBets = user.downBets + 1;
  }
  user.save();

  // Get or create round
  let round = Round.load(roundId);
  if (!round) {
    // If round doesn't exist, create it with minimal data
    round = new Round(roundId);
    round.status = "OPEN";
    round.lockPrice = ZERO;
    round.closePrice = ZERO;
    round.upAmount = ZERO;
    round.downAmount = ZERO;
    round.createdAt = event.block.timestamp;
    round.lockAt = ZERO;
    round.closeAt = ZERO;
    round.asset = "ETH"; // Default fallback
    round.finalPosition = "UNSET";
    round.waitingForStart = true; // Initially waiting for start price
    round.waitingForEnd = false; // Not waiting for end price yet

    round.totalAmount = ZERO;
    round.upBetsCount = 0;
    round.downBetsCount = 0;
    round.totalBetsCount = 0;
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
    round.payoutUp = ZERO;
    round.payoutDown = ZERO;
  }

  // Update round amounts and counts
  if (event.params.position == 1) { // UP
    round.upAmount = round.upAmount.plus(event.params.amount);
    round.upBetsCount = round.upBetsCount + 1;
  } else if (event.params.position == 2) { // DOWN
    round.downAmount = round.downAmount.plus(event.params.amount);
    round.downBetsCount = round.downBetsCount + 1;
  }
  round.totalAmount = round.upAmount.plus(round.downAmount);
  round.totalBetsCount = round.totalBetsCount + 1;
  round.save();

  // Create bet entity
  let bet = new Bet(betId);
  bet.user = userId;
  bet.round = roundId;
  bet.position = getPositionString(event.params.position);
  bet.amount = event.params.amount;
  bet.claimedAmount = ZERO;
  bet.claimed = false;
  bet.createdAt = event.block.timestamp;
  bet.blockNumber = event.block.number;
  bet.transactionHash = event.transaction.hash;
  bet.isWinner = false; // Will be updated when round resolves
  bet.isRefund = false; // Will be updated when round resolves
  bet.payout = ZERO;
  bet.profit = ZERO;
  bet.userRoundId = userId + "-" + roundId;
  bet.userTimestamp = userId + "-" + event.block.timestamp.toString();
  bet.save();
  
  // Update or create UserRound entity
  let userRoundId = userId + "-" + roundId;
  let userRound = UserRound.load(userRoundId);
  if (!userRound) {
    userRound = new UserRound(userRoundId);
    userRound.user = userId;
    userRound.round = roundId;
    userRound.totalAmount = ZERO;
    userRound.betCount = 0;
    userRound.upAmount = ZERO;
    userRound.downAmount = ZERO;
    userRound.claimed = false;
    userRound.totalPayout = ZERO;
    userRound.totalProfit = ZERO;
    userRound.createdAt = event.block.timestamp;
  }
  
  userRound.totalAmount = userRound.totalAmount.plus(event.params.amount);
  userRound.betCount = userRound.betCount + 1;
  userRound.lastBetAt = event.block.timestamp;
  
  if (event.params.position == 1) { // UP
    userRound.upAmount = userRound.upAmount.plus(event.params.amount);
  } else if (event.params.position == 2) { // DOWN
    userRound.downAmount = userRound.downAmount.plus(event.params.amount);
  }
  
  userRound.save();

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.user = userId;
  transaction.type = "BET_PLACED";
  transaction.amount = event.params.amount;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.bet = betId;
  transaction.round = roundId;
  transaction.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalBets = dailyStats.totalBets + 1;
  dailyStats.totalVolume = dailyStats.totalVolume.plus(event.params.amount);
  
  if (event.params.position == 1) { // UP
    dailyStats.upVolume = dailyStats.upVolume.plus(event.params.amount);
  } else if (event.params.position == 2) { // DOWN
    dailyStats.downVolume = dailyStats.downVolume.plus(event.params.amount);
  }
  dailyStats.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalBets = globalStats.totalBets + 1;
  globalStats.totalVolume = globalStats.totalVolume.plus(event.params.amount);
  
  if (event.params.position == 1) { // UP
    globalStats.upBets = globalStats.upBets + 1;
    globalStats.upVolume = globalStats.upVolume.plus(event.params.amount);
  } else if (event.params.position == 2) { // DOWN
    globalStats.downBets = globalStats.downBets + 1;
    globalStats.downVolume = globalStats.downVolume.plus(event.params.amount);
  }
  
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle RoundStarted(roundId, lockPrice)
export function handleRoundStarted(event: RoundStarted): void {
  let roundId = event.params.roundId.toString();
  let round = Round.load(roundId);
  if (!round) {
    round = new Round(roundId);
    round.createdAt = event.block.timestamp;
    round.lockAt = ZERO;
    round.closeAt = ZERO;
    round.asset = "ETH"; // Default fallback
    round.lockPrice = ZERO;
    round.closePrice = ZERO;
    round.upAmount = ZERO;
    round.downAmount = ZERO;
    round.totalAmount = ZERO;
    round.upBetsCount = 0;
    round.downBetsCount = 0;
    round.totalBetsCount = 0;
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
    round.payoutUp = ZERO;
    round.payoutDown = ZERO;
    round.finalPosition = "UNSET";
    round.status = "LIVE";
    round.waitingForStart = false;
    round.waitingForEnd = true;
  }

  round.lockPrice = event.params.lockPrice;
  round.liveAt = event.block.timestamp;
  round.status = "LIVE";
  round.waitingForStart = false;
  round.waitingForEnd = true;
  round.save();

  let globalStats = getOrCreateGlobalStats();
  if (globalStats.openRounds > 0) {
    globalStats.openRounds = globalStats.openRounds - 1;
  }
  globalStats.liveRounds = globalStats.liveRounds + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle RoundClosed(roundId, closePrice, finalPosition)
export function handleRoundClosed(event: RoundClosed): void {
  let roundId = event.params.roundId.toString();
  let round = Round.load(roundId);
  if (!round) {
    round = new Round(roundId);
    round.createdAt = event.block.timestamp;
    round.lockAt = ZERO;
    round.closeAt = ZERO;
    round.asset = "ETH"; // Default fallback
    round.lockPrice = ZERO;
    round.closePrice = ZERO;
    round.upAmount = ZERO;
    round.downAmount = ZERO;
    round.totalAmount = ZERO;
    round.upBetsCount = 0;
    round.downBetsCount = 0;
    round.totalBetsCount = 0;
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
    round.payoutUp = ZERO;
    round.payoutDown = ZERO;
    round.finalPosition = "UNSET";
    round.status = "CLOSED";
    round.waitingForStart = false;
    round.waitingForEnd = false;
  }

  round.closePrice = event.params.closePrice;
  round.finalPosition = getPositionString(event.params.finalPosition);
  round.status = "CLOSED";
  round.waitingForEnd = false;

  // compute priceChange and percent safely
  if (round.lockPrice.notEqual(ZERO)) {
    round.priceChange = round.closePrice.minus(round.lockPrice);
    let lockPriceBD = BigDecimal.fromString(round.lockPrice.toString());
    let changeBD = BigDecimal.fromString(round.priceChange.toString());
    round.priceChangePercent = changeBD.div(lockPriceBD).times(BigDecimal.fromString("100"));
  } else {
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
  }

  round.save();

  // Note: Individual bet payout calculations and status updates would require 
  // loading all bets for this round, which is expensive. This could be handled
  // via additional events from the contract or computed off-chain.

  let globalStats = getOrCreateGlobalStats();
  if (globalStats.liveRounds > 0) {
    globalStats.liveRounds = globalStats.liveRounds - 1;
  }
  globalStats.closedRounds = globalStats.closedRounds + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Note: per-bet payout resolution may require more detailed events; this sets round-level fields only.
}

// Handle RoundCancelled(roundId)
export function handleRoundCancelled(event: RoundCancelled): void {
  let roundId = event.params.roundId.toString();
  let round = Round.load(roundId);
  if (!round) {
    round = new Round(roundId);
    round.createdAt = event.block.timestamp;
    round.lockAt = ZERO;
    round.closeAt = ZERO;
    round.asset = "ETH"; // Default fallback
    round.lockPrice = ZERO;
    round.closePrice = ZERO;
    round.upAmount = ZERO;
    round.downAmount = ZERO;
    round.totalAmount = ZERO;
    round.upBetsCount = 0;
    round.downBetsCount = 0;
    round.totalBetsCount = 0;
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
    round.payoutUp = ZERO;
    round.payoutDown = ZERO;
    round.finalPosition = "UNSET";
    round.status = "CANCELLED";
    round.waitingForStart = false;
    round.waitingForEnd = false;
  }

  round.status = "CANCELLED";
  round.waitingForStart = false;
  round.waitingForEnd = false;
  round.save();

  let globalStats = getOrCreateGlobalStats();
  if (globalStats.openRounds > 0) {
    globalStats.openRounds = globalStats.openRounds - 1;
  }
  globalStats.cancelledRounds = globalStats.cancelledRounds + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle BetClaimed(betId, user, amount)
export function handleBetClaimed(event: BetClaimed): void {
  let betId = event.params.betId.toString();
  let userId = event.params.user.toHex().toLowerCase();

  // Load the bet to get the roundId
  let bet = Bet.load(betId);
  if (!bet) {
    // Bet not found, cannot proceed
    return;
  }
  
  let roundId = bet.round;
  
  // Update bet status
  bet.claimed = true;
  bet.claimedAmount = event.params.amount;
  bet.payout = event.params.amount;
  bet.profit = event.params.amount.minus(bet.amount);
  bet.isWinner = true;
  bet.save();

  let user = getOrCreateUser(event.params.user, event.block.timestamp);
  user.totalClaimed = user.totalClaimed.plus(event.params.amount);
  user.lastClaimTime = event.block.timestamp;
  
  // Update user statistics
  user.wonBets = user.wonBets + 1;
  user.totalWinnings = user.totalWinnings.plus(event.params.amount);
  
  // Recalculate profit/loss and win rate
  user.profitLoss = user.totalWinnings.minus(user.totalLosses);
  if (user.totalBets.gt(ZERO)) {
    let winRateBD = BigDecimal.fromString(user.wonBets.toString()).div(BigDecimal.fromString(user.totalBets.toString())).times(BigDecimal.fromString("100"));
    user.winRate = winRateBD;
  }
  user.save();

  let userRoundId = userId + "-" + roundId;
  let userRound = UserRound.load(userRoundId);
  if (userRound) {
    userRound.claimed = true;
    userRound.totalPayout = userRound.totalPayout.plus(event.params.amount);
    userRound.totalProfit = userRound.totalPayout.minus(userRound.totalAmount);
    userRound.save();
  }

  let tx = new Transaction(event.transaction.hash.toHex());
  tx.user = userId;
  tx.type = "BET_CLAIMED";
  tx.amount = event.params.amount;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number;
  tx.round = roundId;
  tx.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalClaimed = dailyStats.totalClaimed.plus(event.params.amount);
  dailyStats.save();

  let globalStats = getOrCreateGlobalStats();
  globalStats.totalClaimed = globalStats.totalClaimed.plus(event.params.amount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle BetRefunded(betId, user, amount)
export function handleBetRefunded(event: BetRefunded): void {
  let betId = event.params.betId.toString();
  let userId = event.params.user.toHex().toLowerCase();

  // Load the bet to get the roundId
  let bet = Bet.load(betId);
  if (!bet) {
    // Bet not found, cannot proceed
    return;
  }
  
  let roundId = bet.round;
  
  // Update bet status
  bet.isRefund = true;
  bet.claimed = true;
  bet.claimedAmount = event.params.amount;
  bet.payout = event.params.amount;
  bet.profit = ZERO; // Refunds are neutral
  bet.save();

  let user = getOrCreateUser(event.params.user, event.block.timestamp);
  user.totalClaimed = user.totalClaimed.plus(event.params.amount);
  user.refundedBets = user.refundedBets + 1;
  user.save();

  let userRoundId = userId + "-" + roundId;
  let userRound = UserRound.load(userRoundId);
  if (userRound) {
    userRound.claimed = true;
    userRound.totalPayout = userRound.totalPayout.plus(event.params.amount);
    userRound.totalProfit = ZERO; // Refunds are neutral
    userRound.save();
  }

  let tx = new Transaction(event.transaction.hash.toHex());
  tx.user = userId;
  tx.type = "BET_REFUNDED";
  tx.amount = event.params.amount;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number;
  tx.bet = betId;
  tx.round = roundId;
  tx.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.totalRefunded = dailyStats.totalRefunded.plus(event.params.amount);
  dailyStats.save();

  let globalStats = getOrCreateGlobalStats();
  globalStats.totalRefunded = globalStats.totalRefunded.plus(event.params.amount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle PayoutsCalculated(roundId, payoutUp, payoutDown)
export function handlePayoutsCalculated(event: PayoutsCalculated): void {
  let roundId = event.params.roundId.toString();
  let round = Round.load(roundId);
  
  if (!round) {
    // Round doesn't exist, create it with minimal data
    round = new Round(roundId);
    round.createdAt = event.block.timestamp;
    round.lockAt = ZERO;
    round.closeAt = ZERO;
    round.asset = "ETH"; // Default fallback
    round.lockPrice = ZERO;
    round.closePrice = ZERO;
    round.upAmount = ZERO;
    round.downAmount = ZERO;
    round.totalAmount = ZERO;
    round.upBetsCount = 0;
    round.downBetsCount = 0;
    round.totalBetsCount = 0;
    round.priceChange = ZERO;
    round.priceChangePercent = BigDecimal.fromString("0");
    round.finalPosition = "UNSET";
    round.status = "OPEN";
    round.waitingForStart = true;
    round.waitingForEnd = false;
  }
  
  // Update payout multipliers
  round.payoutUp = event.params.payoutUp;
  round.payoutDown = event.params.payoutDown;
  round.save();
}

