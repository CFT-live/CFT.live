export type Asset =
  | "ETH"
  | "ARB"
  | "AAVE"
  | "BTC"
  | "SOL"
  | "XRP"
  | "BNB"
  | "DOGE"
  | "PEPE"
  | "SHIB";

export type Position = "UNSET" | "UP" | "DOWN";

export type RoundStatus = "OPEN" | "LIVE" | "CLOSED" | "CANCELLED";

export type TransactionType = 
  | "DEPOSIT"
  | "WITHDRAW"
  | "BET_PLACED"
  | "BET_CLAIMED"
  | "BET_REFUNDED";

export type ContractPriceFeeds = Record<Asset, string>;

export interface User {
  id: string;
  totalBets: string;
  totalAmount: string;
  totalWinnings: string;
  totalLosses: string;
  totalClaimed: string;
  winRate: string;
  profitLoss: string;
  bets: Bet[];
  createdAt: string;
  lastActivityAt: string;
  
  upBets: number;
  downBets: number;
  wonBets: number;
  lostBets: number;
  refundedBets: number;
  
  lastBetTime: string;
  lastClaimTime: string;
  
  currentBalance: string;
}

export interface ContractMetadata {
  ownerAddress: string;
  paymentTokenAddress: string;
  betLockBufferInSeconds: number;
  dataWaitWindowInSeconds: number;
  feeCollectorAddress: string;
  feeBpsPercentage: number;
  minBetAmount: number;
  maxBetAmount: number;
  maxOpenRoundsPerUser: number;
  minOpenTimeInSeconds: number;
  minLockTimeInSeconds: number;
  advanceCooldownInSeconds: number;
  priceMaxAge: number;
  paused: boolean;
}

export interface Round {
  id: string;
  creator?: string;
  asset: Asset;
  status: RoundStatus;
  lockPrice: bigint;
  closePrice: bigint;
  upAmount: string;
  downAmount: string;
  createdAt: string;
  lockAt: string;
  liveAt?: string;
  closeAt: string;
  finalPosition: Position;
  
  waitingForStart: boolean;
  waitingForEnd: boolean;
  
  bets: Bet[];
  
  totalAmount: string;
  upBetsCount: number;
  downBetsCount: number;
  totalBetsCount: number;
  
  priceChange: string;
  priceChangePercent: string;
  
  payoutUp: bigint;
  payoutDown: bigint;
}

export interface Bet {
  id: string;
  user: User;
  round: Round;
  position: Position;
  amount: string;
  claimedAmount: string;
  claimed: boolean;
  createdAt: string;
  claimedAt?: string;
  blockNumber: string;
  transactionHash: string;
  
  isWinner: boolean;
  isRefund: boolean;
  payout: string;
  profit: string;
  
  userRoundId: string;
  userTimestamp: string;
}

export interface DailyStats {
  id: string;
  date: string;
  totalBets: number;
  totalVolume: string;
  uniqueUsers: number;
  roundsCreated: number;
  roundsClosed: number;
  
  upVolume: string;
  downVolume: string;
  
  newUsers: number;
  activeUsers: number;
  
  totalClaimed: string;
  totalRefunded: string;
}

export interface GlobalStats {
  id: string;
  totalUsers: number;
  totalBets: number;
  totalVolume: string;
  totalRounds: number;
  totalClaimed: string;
  totalRefunded: string;
  
  openRounds: number;
  liveRounds: number;
  closedRounds: number;
  cancelledRounds: number;
  
  upBets: number;
  downBets: number;
  upVolume: string;
  downVolume: string;
  
  lastUpdated: string;
}

export interface UserDailyStats {
  id: string;
  user: User;
  date: string;
  bets: number;
  volume: string;
  profit: string;
  
  upBets: number;
  downBets: number;
  wonBets: number;
  lostBets: number;
}

export interface UserRound {
  id: string;
  user: User;
  round: Round;
  totalAmount: string;
  betCount: number;
  upAmount: string;
  downAmount: string;
  claimed: boolean;
  totalPayout: string;
  totalProfit: string;
  createdAt: string;
  lastBetAt: string;
}

export interface Transaction {
  id: string;
  user: User;
  type: TransactionType;
  amount: string;
  timestamp: string;
  blockNumber: string;
  
  bet?: Bet;
  round?: Round;
}
