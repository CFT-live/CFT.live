type BigIntString = string;
type Bytes = string;

export enum TableStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  WaitingRandom = 'WaitingRandom',
  Finished = 'Finished',
  Cancelled = 'Cancelled'
}

export enum PlayerStatus {
  Waiting = 'Waiting',
  Playing = 'Playing',
  Dead = 'Dead'
}

export interface User {
  id: string;
  tablesJoined?: number;
  tablesWon?: number;
  totalBetAmount?: BigIntString;
  totalWinnings?: BigIntString;
  totalRefunds?: BigIntString;
  createdAt?: BigIntString;
  lastActivityAt?: BigIntString;
}

export interface TablePlayer {
  id: string;
  user: User;
  position: number;
  status: PlayerStatus;
  totalBetAmount?: BigIntString;
  turnsPlayed?: number;
  isReady?: boolean;
  eliminated?: boolean;
  eliminatedAt?: BigIntString;
  joinedAt?: BigIntString;
  leftAt?: BigIntString;
  turns?: Turn[];
  table: Table;
}

export interface Turn {
  id: string;
  player: User;
  tablePlayer?: {
    id: string;
    position: number;
  };
  turnNumber?: number;
  betAmount: BigIntString;
  playerRandom: BigIntString;
  serverRandom?: BigIntString;
  eliminated: boolean;
  randomFulfilled?: boolean;
  createdAt: BigIntString;
  fulfilledAt?: BigIntString;
  blockNumber: BigIntString;
  transactionHash: Bytes;
  table?: {
    id: string;
    status: TableStatus;
    totalPool: BigIntString;
    winner?: Bytes;
  };
}

export interface Payout {
  id: string;
  user: User;
  amount: BigIntString;
  isRefund: boolean;
  createdAt: BigIntString;
  blockNumber: BigIntString;
  transactionHash: Bytes;
  table?: {
    id: string;
    status: TableStatus;
    totalPool: BigIntString;
    winner?: Bytes;
    createdAt: BigIntString;
    finishedAt?: BigIntString;
  };
}

export interface Table {
  id: string;
  creator: User;
  status: TableStatus;
  initialBetAmount: BigIntString;
  currentBetAmount: BigIntString;
  maxIncrement: BigIntString;
  maxPlayers: number;
  totalPool: BigIntString;
  currentPlayerIndex?: number;
  winner?: Bytes;
  payoutClaimed?: boolean;
  requestId?: BigIntString;
  createdAt: BigIntString;
  startedAt?: BigIntString;
  finishedAt?: BigIntString;
  cancelReason?: string;
  blockNumber: BigIntString;
  transactionHash: Bytes;
  players: TablePlayer[];
  turns?: Turn[];
  payouts?: Payout[];
  playerCount?: number;
  turnStartTime?: BigIntString;
}

export interface GlobalStats {
  id: string;
  totalUsers: number;
  totalTables: number;
  totalTurns: number;
  totalVolume: BigIntString;
  totalWinnings: BigIntString;
  totalRefunds: BigIntString;
  openTables: number;
  inProgressTables: number;
  finishedTables: number;
  cancelledTables: number;
  lastUpdated: BigIntString;
}

export interface GetOpenTablesResponse {
  tables: Array<{
    id: string;
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    currentPlayerIndex: number;
    createdAt: BigIntString;
    playerCount?: number;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      position: number;
      status: PlayerStatus;
      isReady: boolean;
    }>;
  }>;
}

export interface GetInProgressTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    currentPlayerIndex: number;
    createdAt: BigIntString;
    startedAt: BigIntString;
    requestId?: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      position: number;
      status: PlayerStatus;
      totalBetAmount: BigIntString;
      turnsPlayed: number;
      eliminated: boolean;
      eliminatedAt?: BigIntString;
    }>;
  }>;
}

export interface GetFinishedTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    payoutClaimed: boolean;
    createdAt: BigIntString;
    startedAt: BigIntString;
    finishedAt: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      position: number;
      status: PlayerStatus;
      totalBetAmount: BigIntString;
      turnsPlayed: number;
      eliminated: boolean;
      eliminatedAt?: BigIntString;
    }>;
  }>;
}

export interface GetTableByIdResponse {
  table?: {
    id: string;
    creator: User;
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    currentPlayerIndex: number;
    winner?: Bytes;
    payoutClaimed: boolean;
    requestId?: BigIntString;
    createdAt: BigIntString;
    startedAt?: BigIntString;
    finishedAt?: BigIntString;
    cancelReason?: string;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    players: TablePlayer[];
    turns: Turn[];
    payouts: Payout[];
  };
}

export interface GetUserTableParticipationsResponse {
  tablePlayers: Array<{
    id: string;
    position: number;
    status: PlayerStatus;
    totalBetAmount: BigIntString;
    turnsPlayed: number;
    isReady: boolean;
    eliminated: boolean;
    eliminatedAt?: BigIntString;
    joinedAt: BigIntString;
    leftAt?: BigIntString;
    table: {
      id: string;
      status: TableStatus;
      initialBetAmount: BigIntString;
      currentBetAmount: BigIntString;
      maxIncrement: BigIntString;
      maxPlayers: number;
      totalPool: BigIntString;
      winner?: Bytes;
      payoutClaimed: boolean;
      createdAt: BigIntString;
      startedAt?: BigIntString;
      finishedAt?: BigIntString;
    };
  }>;
}

export interface GetUserActiveTablesResponse {
  tablePlayers: Array<{
    id: string;
    position: number;
    status: PlayerStatus;
    totalBetAmount: BigIntString;
    turnsPlayed: number;
    isReady: boolean;
    table: {
      id: string;
      status: TableStatus;
      initialBetAmount: BigIntString;
      currentBetAmount: BigIntString;
      maxIncrement: BigIntString;
      maxPlayers: number;
      totalPool: BigIntString;
      currentPlayerIndex: number;
      createdAt: BigIntString;
      startedAt?: BigIntString;
      players: Array<{
        id: string;
        user: {
          id: string;
        };
        position: number;
        status: PlayerStatus;
        isReady: boolean;
      }>;
    };
  }>;
}

export interface GetUserTurnsResponse {
  turns: Array<{
    id: string;
    betAmount: BigIntString;
    playerRandom: BigIntString;
    serverRandom?: BigIntString;
    eliminated: boolean;
    randomFulfilled: boolean;
    createdAt: BigIntString;
    fulfilledAt?: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    table: {
      id: string;
      status: TableStatus;
      totalPool: BigIntString;
      winner?: Bytes;
    };
  }>;
}

export interface GetUserPayoutsResponse {
  payouts: Array<{
    id: string;
    amount: BigIntString;
    isRefund: boolean;
    createdAt: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    table: {
      id: string;
      status: TableStatus;
      totalPool: BigIntString;
      winner?: Bytes;
      createdAt: BigIntString;
      finishedAt?: BigIntString;
    };
  }>;
}

export interface GetUserStatsResponse {
  user?: User;
}

export interface GetGlobalStatsResponse {
  globalStats?: GlobalStats;
}

export interface GetRecentTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    payoutClaimed: boolean;
    createdAt: BigIntString;
    startedAt?: BigIntString;
    finishedAt?: BigIntString;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      position: number;
      status: PlayerStatus;
    }>;
  }>;
}

export interface GetTableTurnsResponse {
  turns: Array<{
    id: string;
    player: {
      id: string;
    };
    tablePlayer: {
      id: string;
      position: number;
    };
    turnNumber: number;
    betAmount: BigIntString;
    playerRandom: BigIntString;
    serverRandom?: BigIntString;
    eliminated: boolean;
    randomFulfilled: boolean;
    createdAt: BigIntString;
    fulfilledAt?: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
  }>;
}

export interface GetTablePlayersResponse {
  tablePlayers: Array<{
    id: string;
    user: User;
    position: number;
    status: PlayerStatus;
    totalBetAmount: BigIntString;
    turnsPlayed: number;
    isReady: boolean;
    eliminated: boolean;
    eliminatedAt?: BigIntString;
    joinedAt: BigIntString;
    leftAt?: BigIntString;
    turns: Array<{
      id: string;
      betAmount: BigIntString;
      playerRandom: BigIntString;
      serverRandom?: BigIntString;
      eliminated: boolean;
      createdAt: BigIntString;
    }>;
  }>;
}

export interface GetTopUsersByTablesWonResponse {
  users: User[];
}

export interface GetTopUsersByBetAmountResponse {
  users: User[];
}

export interface GetTopUsersByWinningsResponse {
  users: User[];
}

export interface GetRecentActivityResponse {
  turns: Array<{
    id: string;
    player: {
      id: string;
    };
    betAmount: BigIntString;
    playerRandom: BigIntString;
    serverRandom?: BigIntString;
    eliminated: boolean;
    createdAt: BigIntString;
    blockNumber: BigIntString;
    transactionHash: Bytes;
    table: {
      id: string;
      status: TableStatus;
      totalPool: BigIntString;
    };
  }>;
}

export interface GetHighStakesTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    createdAt: BigIntString;
    startedAt?: BigIntString;
    finishedAt?: BigIntString;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
    }>;
  }>;
}

export interface GetCancelledTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    cancelReason?: string;
    createdAt: BigIntString;
    finishedAt?: BigIntString;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      totalBetAmount: BigIntString;
    }>;
  }>;
}

export interface GetUserWonTablesResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    payoutClaimed: boolean;
    createdAt: BigIntString;
    startedAt: BigIntString;
    finishedAt: BigIntString;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
      position: number;
      totalBetAmount: BigIntString;
      eliminated: boolean;
    }>;
  }>;
}

export interface GetTablesByStatusResponse {
  tables: Array<{
    id: string;
    creator: {
      id: string;
    };
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    createdAt: BigIntString;
    startedAt?: BigIntString;
    finishedAt?: BigIntString;
  }>;
}

export interface GetTablesByCreatorResponse {
  tables: Array<{
    id: string;
    status: TableStatus;
    initialBetAmount: BigIntString;
    currentBetAmount: BigIntString;
    maxIncrement: BigIntString;
    maxPlayers: number;
    totalPool: BigIntString;
    winner?: Bytes;
    payoutClaimed: boolean;
    createdAt: BigIntString;
    startedAt?: BigIntString;
    finishedAt?: BigIntString;
    players: Array<{
      id: string;
      user: {
        id: string;
      };
    }>;
  }>;
}

export interface GetUserProfileResponse {
  user?: {
    id: string;
    tablesJoined: number;
    tablesWon: number;
    totalBetAmount: BigIntString;
    totalWinnings: BigIntString;
    totalRefunds: BigIntString;
    createdAt: BigIntString;
    lastActivityAt: BigIntString;
    tableParticipations: Array<{
      id: string;
      table: {
        id: string;
        status: TableStatus;
        winner?: Bytes;
        totalPool: BigIntString;
      };
      totalBetAmount: BigIntString;
      turnsPlayed: number;
      eliminated: boolean;
    }>;
    turns: Array<{
      id: string;
      betAmount: BigIntString;
      eliminated: boolean;
      createdAt: BigIntString;
    }>;
    payouts: Array<{
      id: string;
      amount: BigIntString;
      isRefund: boolean;
      createdAt: BigIntString;
    }>;
  };
}