import * as predictionKeys from '../features/prediction/v1/queries/keys';
import * as lottoKeys from '../features/lotto/v1/queries/keys';
import * as rouletteKeys from '../features/roulette/v1/queries/keys';

const keys = { ...predictionKeys, ...lottoKeys, ...rouletteKeys };
import { Asset, Bet, ContractMetadata, Position, Round, User } from '../types';

// Type definitions for mock data
interface MockDataStructure {
  [keys.CONTRACT_BALANCE_QUERY_KEY]: bigint;
  [keys.CONTRACT_METADATA_QUERY_KEY]: ContractMetadata;
  [keys.OPEN_ROUNDS_QUERY_KEY]: { rounds: Round[] };
  [keys.CLOSED_ROUNDS_QUERY_KEY]: { rounds: Round[] };
  [keys.LIVE_ROUNDS_QUERY_KEY]: { rounds: Round[] };
  [keys.USER_BETS_QUERY_KEY]: { bets: Bet[] };
}

// Helper to get current timestamp in seconds
const now = Math.floor(Date.now() / 1000);

const mockUser: User = {
  id: 'mock-user',
  totalBets: '0',
  totalAmount: '0',
  totalWinnings: '0',
  totalLosses: '0',
  totalClaimed: '0',
  winRate: '0',
  profitLoss: '0',
  bets: [],
  createdAt: '0',
  lastActivityAt: '0',
  upBets: 0,
  downBets: 0,
  wonBets: 0,
  lostBets: 0,
  refundedBets: 0,
  lastBetTime: '0',
  lastClaimTime: '0',
  currentBalance: '0'
}

export const MOCK_DATA: MockDataStructure = {
  [keys.CONTRACT_BALANCE_QUERY_KEY]: BigInt("1000000000"), // 1000 USDC in wei (6 decimals)

  [keys.CONTRACT_METADATA_QUERY_KEY]: {
    ownerAddress: "0x1234567890123456789012345678901234567890",
    paymentTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum
    betLockBufferInSeconds: 30,
    dataWaitWindowInSeconds: 60,
    feeCollectorAddress: "0x9876543210987654321098765432109876543210",
    feeBpsPercentage: 2.5, // 2.5%
    minBetAmount: 1, // $1
    maxBetAmount: 1000, // $1000
    maxOpenRoundsPerUser: 10,
    minOpenTimeInSeconds: 120,
    minLockTimeInSeconds: 60,
    advanceCooldownInSeconds: 15,
    priceMaxAge: 300,
    paused: false,
  },

  [keys.OPEN_ROUNDS_QUERY_KEY]: {
    rounds: [
      // ETH round opening in 2 minutes
      createMockRound({
        asset: "ETH",
        status: "OPEN",
        timeOffset: 120,
        upAmount: 500,
        downAmount: 300,
        upBetsCount: 5,
        downBetsCount: 3,
        lockDuration: 2000,
      }),
      // ARB round opening in 3 minutes
      createMockRound({
        asset: "ARB",
        status: "OPEN",
        timeOffset: 180,
        upAmount: 200,
        downAmount: 250,
        upBetsCount: 2,
        downBetsCount: 3,
        lockDuration: 1800,
      }),
      // BTC round opening in 5 minutes - heavily favored up
      createMockRound({
        asset: "BTC",
        status: "OPEN",
        timeOffset: 300,
        upAmount: 1200,
        downAmount: 400,
        upBetsCount: 12,
        downBetsCount: 4,
        lockDuration: 2400,
      }),
      // SOL round opening in 4 minutes - balanced
      createMockRound({
        asset: "SOL",
        status: "OPEN",
        timeOffset: 240,
        upAmount: 600,
        downAmount: 580,
        upBetsCount: 8,
        downBetsCount: 7,
        lockDuration: 2000,
      }),
      // DOGE round opening soon - low volume
      createMockRound({
        asset: "DOGE",
        status: "OPEN",
        timeOffset: 60,
        upAmount: 50,
        downAmount: 75,
        upBetsCount: 3,
        downBetsCount: 5,
        lockDuration: 1500,
      }),
    ],
  },

  [keys.LIVE_ROUNDS_QUERY_KEY]: {
    rounds: [
      // ETH live round - price going up
      createMockRound({
        asset: "ETH",
        status: "LIVE",
        timeOffset: -60,
        upAmount: 1000,
        downAmount: 800,
        upBetsCount: 10,
        downBetsCount: 8,
        lockPrice: BigInt("2500000000000"), // $2500
        closePrice: BigInt("2525000000000"), // $2525 (currently trending)
        lockDuration: 2000,
      }),
      // ARB live round - slight decline
      createMockRound({
        asset: "ARB",
        status: "LIVE",
        timeOffset: -45,
        upAmount: 400,
        downAmount: 600,
        upBetsCount: 6,
        downBetsCount: 9,
        lockPrice: BigInt("850000000"), // $0.85
        closePrice: BigInt("845000000"), // $0.845
        lockDuration: 1800,
      }),
      // BTC live round - strong upward movement
      createMockRound({
        asset: "BTC",
        status: "LIVE",
        timeOffset: -90,
        upAmount: 2000,
        downAmount: 1200,
        upBetsCount: 15,
        downBetsCount: 10,
        lockPrice: BigInt("6800000000000"), // $68000
        closePrice: BigInt("6850000000000"), // $68500
        lockDuration: 2400,
      }),
    ],
  },

  [keys.CLOSED_ROUNDS_QUERY_KEY]: {
    rounds: [
      // ETH closed - Up win
      createMockRound({
        asset: "ETH",
        status: "CLOSED",
        timeOffset: -3000,
        upAmount: 1500,
        downAmount: 1000,
        upBetsCount: 15,
        downBetsCount: 10,
        lockPrice: BigInt("2480000000000"), // $2480
        closePrice: BigInt("2520000000000"), // $2520
        finalPosition: "UP",
        lockDuration: 2000,
      }),
      // ARB closed - Down win
      createMockRound({
        asset: "ARB",
        status: "CLOSED",
        timeOffset: -8000,
        upAmount: 600,
        downAmount: 900,
        upBetsCount: 6,
        downBetsCount: 9,
        lockPrice: BigInt("85000000"), // $0.85
        closePrice: BigInt("83000000"), // $0.83
        finalPosition: "DOWN",
        lockDuration: 1800,
      }),
      // BTC closed - Up win (large volume)
      createMockRound({
        asset: "BTC",
        status: "CLOSED",
        timeOffset: -5000,
        upAmount: 3000,
        downAmount: 1500,
        upBetsCount: 20,
        downBetsCount: 12,
        lockPrice: BigInt("6700000000000"), // $67000
        closePrice: BigInt("6780000000000"), // $67800
        finalPosition: "UP",
        lockDuration: 2400,
      }),
      // SOL closed - Down win
      createMockRound({
        asset: "SOL",
        status: "CLOSED",
        timeOffset: -6000,
        upAmount: 700,
        downAmount: 500,
        upBetsCount: 10,
        downBetsCount: 8,
        lockPrice: BigInt("10500000000"), // $105
        closePrice: BigInt("10200000000"), // $102
        finalPosition: "DOWN",
        lockDuration: 2000,
      }),
      // XRP closed - Up win (tight margin)
      createMockRound({
        asset: "XRP",
        status: "CLOSED",
        timeOffset: -4000,
        upAmount: 400,
        downAmount: 380,
        upBetsCount: 7,
        downBetsCount: 6,
        lockPrice: BigInt("55000000"), // $0.55
        closePrice: BigInt("55500000"), // $0.555
        finalPosition: "UP",
        lockDuration: 1800,
      }),
      // AAVE closed - Down win
      createMockRound({
        asset: "AAVE",
        status: "CLOSED",
        timeOffset: -7000,
        upAmount: 800,
        downAmount: 1200,
        upBetsCount: 8,
        downBetsCount: 14,
        lockPrice: BigInt("16500000000"), // $165
        closePrice: BigInt("16200000000"), // $162
        finalPosition: "DOWN",
        lockDuration: 2200,
      }),
      // BNB closed - Up win
      createMockRound({
        asset: "BNB",
        status: "CLOSED",
        timeOffset: -9000,
        upAmount: 1000,
        downAmount: 600,
        upBetsCount: 11,
        downBetsCount: 7,
        lockPrice: BigInt("59000000000"), // $590
        closePrice: BigInt("59800000000"), // $598
        finalPosition: "UP",
        lockDuration: 2000,
      }),
      // PEPE closed - massive Down win (meme volatility)
      createMockRound({
        asset: "PEPE",
        status: "CLOSED",
        timeOffset: -10000,
        upAmount: 250,
        downAmount: 450,
        upBetsCount: 15,
        downBetsCount: 25,
        lockPrice: BigInt("120000"), // $0.000012
        closePrice: BigInt("108000"), // $0.0000108
        finalPosition: "DOWN",
        lockDuration: 1500,
      }),
    ],
  },

  [keys.USER_BETS_QUERY_KEY]: {
    bets: (() => {
      // Generate bets for closed rounds
      const closedRound1 = createMockRound({
        asset: "ETH",
        status: "CLOSED",
        timeOffset: -3000,
        upAmount: 1500,
        downAmount: 1000,
        upBetsCount: 15,
        downBetsCount: 10,
        lockPrice: BigInt("2480000000000"),
        closePrice: BigInt("2520000000000"),
        finalPosition: "UP",
        lockDuration: 2000,
      });
      
      const closedRound2 = createMockRound({
        asset: "ARB",
        status: "CLOSED",
        timeOffset: -8000,
        upAmount: 600,
        downAmount: 900,
        upBetsCount: 6,
        downBetsCount: 9,
        lockPrice: BigInt("85000000"),
        closePrice: BigInt("83000000"),
        finalPosition: "DOWN",
        lockDuration: 1800,
      });
      
      const liveRound = createMockRound({
        asset: "BTC",
        status: "LIVE",
        timeOffset: -90,
        upAmount: 2000,
        downAmount: 1200,
        upBetsCount: 15,
        downBetsCount: 10,
        lockPrice: BigInt("6800000000000"),
        closePrice: BigInt("6850000000000"),
        lockDuration: 2400,
      });
      
      return [
        // Winning bet - claimed
        createMockBet({
          round: closedRound1,
          amount: 100,
          position: "UP",
          claimed: true,
          isWinner: true,
          timeOffset: 500,
        }),
        // Losing bet - claimed
        createMockBet({
          round: closedRound1,
          amount: 75,
          position: "DOWN",
          claimed: false,
          isWinner: false,
          timeOffset: 600,
        }),
        // Winning bet - unclaimed
        createMockBet({
          round: closedRound2,
          amount: 50,
          position: "DOWN",
          claimed: false,
          isWinner: true,
          timeOffset: 400,
        }),
        // Active bet in live round
        createMockBet({
          round: liveRound,
          amount: 200,
          position: "UP",
          claimed: false,
          isWinner: false,
          timeOffset: 300,
        }),
        // Another winning bet - claimed (large amount)
        createMockBet({
          round: closedRound1,
          amount: 500,
          position: "UP",
          claimed: true,
          isWinner: true,
          timeOffset: 700,
        }),
      ];
    })(),
  },
};



// Mock data generator functions
interface CreateMockRoundParams {
  asset: Asset;
  status: 'OPEN' | 'LIVE' | 'CLOSED';
  timeOffset: number; // offset from current time in seconds
  upAmount?: number; // in USDC (6 decimals)
  downAmount?: number; // in USDC (6 decimals)
  upBetsCount?: number;
  downBetsCount?: number;
  lockPrice?: bigint; // price at lock time (8 decimals for ETH/BTC, 6 for others)
  closePrice?: bigint; // price at close time
  finalPosition?: Position;
  lockDuration?: number; // duration between lock and close in seconds
}

export function createMockRound({
  asset,
  status,
  timeOffset,
  upAmount = 500,
  downAmount = 300,
  upBetsCount = 5,
  downBetsCount = 3,
  lockPrice,
  closePrice,
  finalPosition,
  lockDuration = 2000,
}: CreateMockRoundParams): Round {
  const totalAmount = upAmount + downAmount;
  const totalBetsCount = upBetsCount + downBetsCount;
  
  // Convert to wei (6 decimals for USDC)
  const upAmountWei = String(upAmount * 1_000_000);
  const downAmountWei = String(downAmount * 1_000_000);
  const totalAmountWei = String(totalAmount * 1_000_000);
  
  // Calculate payouts (total amount distributed minus 2.5% fee)
  const payoutPool = BigInt(totalAmount * 1_000_000) * BigInt(975) / BigInt(1000);
  const payoutUp = (payoutPool * BigInt(upAmount * 1_000_000)) / BigInt(totalAmount * 1_000_000);
  const payoutDown = (payoutPool * BigInt(downAmount * 1_000_000)) / BigInt(totalAmount * 1_000_000);
  
  let createdAt: string;
  let lockAt: string;
  let liveAt: string;
  let closeAt: string;
  let priceChange: string = "0";
  let priceChangePercent: string = "0";
  
  if (status === 'OPEN') {
    createdAt = String(now + timeOffset - 1000);
    lockAt = String(now + timeOffset);
    liveAt = "0";
    closeAt = String(now + timeOffset + lockDuration);
  } else if (status === 'LIVE') {
    createdAt = String(now + timeOffset - 2000);
    lockAt = String(now + timeOffset);
    liveAt = String(now + timeOffset);
    closeAt = String(now + timeOffset + lockDuration);
    
    // Calculate price change for LIVE rounds
    if (lockPrice && closePrice) {
      priceChange = String(closePrice - lockPrice);
      const changePercent = (Number(closePrice - lockPrice) / Number(lockPrice)) * 100;
      priceChangePercent = changePercent.toFixed(2);
    }
  } else { // CLOSED
    createdAt = String(now + timeOffset - 2000);
    lockAt = String(now + timeOffset);
    liveAt = String(now + timeOffset);
    closeAt = String(now + timeOffset + lockDuration);
    
    // Calculate price change for CLOSED rounds
    if (lockPrice && closePrice) {
      priceChange = String(closePrice - lockPrice);
      const changePercent = (Number(closePrice - lockPrice) / Number(lockPrice)) * 100;
      priceChangePercent = changePercent.toFixed(2);
    }
  }
  
  const roundId = `${asset}-${lockAt}`;
  
  return {
  id: roundId,
  status,
  asset,
  lockPrice: lockPrice || BigInt(0),
  closePrice: closePrice || BigInt(0),
  finalPosition: finalPosition || "UNSET",
  upAmount: upAmountWei,
  downAmount: downAmountWei,
  totalAmount: totalAmountWei,
  upBetsCount,
  downBetsCount,
  totalBetsCount,
  createdAt,
  lockAt,
  liveAt,
  closeAt,
  priceChange,
  priceChangePercent,
  payoutUp,
  payoutDown,
  waitingForStart: false,
  waitingForEnd: false,
  bets: [],
};
}

interface CreateMockBetParams {
  round: Round;
  amount: number; // in USDC
  position: Position;
  claimed?: boolean;
  isWinner?: boolean;
  isRefund?: boolean;
  timeOffset?: number; // offset from round creation in seconds
}

export function createMockBet({
  round,
  amount,
  position,
  claimed = false,
  isWinner = false,
  isRefund = false,
  timeOffset = 500,
}: CreateMockBetParams): Bet {
  const amountWei = String(amount * 1_000_000);
  const createdAt = String(Number(round.createdAt) + timeOffset);
  
  let claimedAmount = "0";
  let payout = "0";
  let profit = String(-amount * 1_000_000);
  let claimedAt = "0";
  
  if (isWinner && claimed) {
    // Calculate payout based on round totals
    const positionAmount = position === "UP" ? Number(round.upAmount) : Number(round.downAmount);
    const userShare = (amount * 1_000_000) / positionAmount;
    const totalPayout = position === "UP" ? Number(round.payoutUp) : Number(round.payoutDown);
    const userPayout = Math.floor(totalPayout * userShare);
    
    claimedAmount = String(userPayout);
    payout = String(userPayout);
    profit = String(userPayout - amount * 1_000_000);
    claimedAt = String(Number(round.closeAt) + 500);
  } else if (isRefund && claimed) {
    claimedAmount = amountWei;
    payout = amountWei;
    profit = "0";
    claimedAt = String(Number(round.closeAt) + 500);
  }
  
  const betId = `bet-${round.id}-${position}-${createdAt}`;
  
  return {
  id: betId,
  amount: amountWei,
  position,
  claimed,
  claimedAmount,
  createdAt,
  claimedAt,
  isWinner,
  isRefund,
  payout,
  profit,
  blockNumber: String(Math.floor(Math.random() * 1000000000)),
  transactionHash: `0x${Math.random().toString(16).substring(2, 15)}`,
  round,
  user: mockUser,
  userRoundId: '',
  userTimestamp: ''
};
}