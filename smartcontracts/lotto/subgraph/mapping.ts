import {
  DrawStarted,
  TicketsPurchased,
  DrawClosed,
  RandomnessRequested,
  WinnerSelected,
  WinningsClaimed,
  DrawCancelled,
  RefundClaimed
} from "../generated/CFTLotto/CFTLotto";

import {
  User,
  Draw,
  TicketPurchase,
  Claim,
  Refund,
  GlobalStats
} from "../generated/schema";

import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";

// Constants
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = 0;
    stats.totalDraws = 0;
    stats.totalTickets = ZERO;
    stats.totalVolume = ZERO;
    stats.totalWinnings = ZERO;
    stats.totalRefunds = ZERO;
    stats.openDraws = 0;
    stats.closedDraws = 0;
    stats.cancelledDraws = 0;
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
    user.totalTicketsBought = ZERO;
    user.totalAmountSpent = ZERO;
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

// Handle DrawStarted event
export function handleDrawStarted(event: DrawStarted): void {
  let drawId = event.params.drawId.toString();

  let draw = new Draw(drawId);
  draw.startTime = event.block.timestamp;
  draw.ticketPrice = event.params.ticketPrice;
  draw.potSize = ZERO;
  draw.ticketCount = ZERO;
  draw.open = true;
  draw.winnerChosen = false;
  draw.winner = null;
  draw.claimed = false;
  draw.closeTime = null;
  draw.requestId = null;
  draw.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalDraws = globalStats.totalDraws + 1;
  globalStats.openDraws = globalStats.openDraws + 1;
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle TicketsPurchased event
export function handleTicketsPurchased(event: TicketsPurchased): void {
  let drawId = event.params.drawId.toString();
  let userAddress = event.params.buyer;
  let userId = userAddress.toHex().toLowerCase();
  let amount = event.params.amount;

  // Get or create user
  let user = getOrCreateUser(userAddress, event.block.timestamp);

  // Update user stats
  user.totalTicketsBought = user.totalTicketsBought.plus(amount);
  user.save();

  // Load draw
  let draw = Draw.load(drawId);
  if (!draw) {
    // If draw doesn't exist, create it with minimal data
    draw = new Draw(drawId);
    draw.startTime = event.block.timestamp;
    draw.ticketPrice = ZERO; // Unknown, will be updated later
    draw.potSize = ZERO;
    draw.ticketCount = ZERO;
    draw.open = true;
    draw.winnerChosen = false;
    draw.winner = null;
    draw.claimed = false;
    draw.closeTime = null;
    draw.requestId = null;
  }

  // Update draw
  let totalCost = draw.ticketPrice.times(amount);
  draw.potSize = draw.potSize.plus(totalCost);
  draw.ticketCount = draw.ticketCount.plus(amount);
  draw.save();

  // Create ticket purchase
  let purchaseId = drawId + "-" + userId + "-" + event.transaction.hash.toHex();
  let purchase = new TicketPurchase(purchaseId);
  purchase.user = userId;
  purchase.draw = drawId;
  purchase.amount = amount;
  purchase.totalCost = totalCost;
  purchase.createdAt = event.block.timestamp;
  purchase.blockNumber = event.block.number;
  purchase.transactionHash = event.transaction.hash;
  purchase.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalTickets = globalStats.totalTickets.plus(amount);
  globalStats.totalVolume = globalStats.totalVolume.plus(totalCost);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle DrawClosed event
export function handleDrawClosed(event: DrawClosed): void {
  let drawId = event.params.drawId.toString();
  let draw = Draw.load(drawId);
  if (draw) {
    draw.open = false;
    draw.closeTime = event.block.timestamp;
    draw.save();

    // Update global stats
    let globalStats = getOrCreateGlobalStats();
    globalStats.openDraws = globalStats.openDraws - 1;
    globalStats.closedDraws = globalStats.closedDraws + 1;
    globalStats.lastUpdated = event.block.timestamp;
    globalStats.save();
  }
}

// Handle RandomnessRequested event
export function handleRandomnessRequested(event: RandomnessRequested): void {
  let drawId = event.params.drawId.toString();
  let draw = Draw.load(drawId);
  if (draw) {
    draw.requestId = event.params.requestId;
    draw.save();
  }
}

// Handle WinnerSelected event
export function handleWinnerSelected(event: WinnerSelected): void {
  let drawId = event.params.drawId.toString();
  let draw = Draw.load(drawId);
  if (draw) {
    draw.winner = event.params.winner;
    draw.winnerChosen = true;
    draw.save();
  }
}

// Handle WinningsClaimed event
export function handleWinningsClaimed(event: WinningsClaimed): void {
  let drawId = event.params.drawId.toString();
  let userAddress = event.params.winner;
  let userId = userAddress.toHex().toLowerCase();
  let amount = event.params.amount;

  // Get or create user
  let user = getOrCreateUser(userAddress, event.block.timestamp);
  user.totalWinnings = user.totalWinnings.plus(amount);
  user.save();

  // Load draw
  let draw = Draw.load(drawId);
  if (draw) {
    draw.claimed = true;
    draw.save();
  }

  // Create claim
  let claimId = drawId + "-" + userId + "-" + event.transaction.hash.toHex();
  let claim = new Claim(claimId);
  claim.user = userId;
  claim.draw = drawId;
  claim.amount = amount;
  claim.createdAt = event.block.timestamp;
  claim.blockNumber = event.block.number;
  claim.transactionHash = event.transaction.hash;
  claim.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalWinnings = globalStats.totalWinnings.plus(amount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Handle DrawCancelled event
export function handleDrawCancelled(event: DrawCancelled): void {
  let drawId = event.params.drawId.toString();
  let draw = Draw.load(drawId);
  if (draw) {
    draw.winnerChosen = true;
    draw.winner = null; // Cancelled, no winner
    draw.save();

    // Update global stats
    let globalStats = getOrCreateGlobalStats();
    if (draw.open) {
      globalStats.openDraws = globalStats.openDraws - 1;
    } else {
      globalStats.closedDraws = globalStats.closedDraws - 1;
    }
    globalStats.cancelledDraws = globalStats.cancelledDraws + 1;
    globalStats.lastUpdated = event.block.timestamp;
    globalStats.save();
  }
}

// Handle RefundClaimed event
export function handleRefundClaimed(event: RefundClaimed): void {
  let drawId = event.params.drawId.toString();
  let userAddress = event.params.user;
  let userId = userAddress.toHex().toLowerCase();
  let amount = event.params.amount;

  // Get or create user
  let user = getOrCreateUser(userAddress, event.block.timestamp);
  user.totalRefunds = user.totalRefunds.plus(amount);
  user.save();

  // Create refund
  let refundId = drawId + "-" + userId + "-" + event.transaction.hash.toHex();
  let refund = new Refund(refundId);
  refund.user = userId;
  refund.draw = drawId;
  refund.amount = amount;
  refund.createdAt = event.block.timestamp;
  refund.blockNumber = event.block.number;
  refund.transactionHash = event.transaction.hash;
  refund.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalRefunds = globalStats.totalRefunds.plus(amount);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}