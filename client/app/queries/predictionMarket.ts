import { gql } from "graphql-request";


export const getLiveRoundsQuery = gql`
query GetLiveRounds($first: Int!, $skip: Int!) {
    rounds(
        where: { status: LIVE }
        orderBy: closeAt
        orderDirection: asc
        first: $first
        skip: $skip
    ) {
        id
        status
        asset
        lockPrice
        lockAt
        liveAt
        closeAt
        upAmount
        downAmount
        totalAmount
        upBetsCount
        downBetsCount
        totalBetsCount
        priceChange
        priceChangePercent
        payoutUp
        payoutDown
    }
}
`
export const getOpenRoundsQuery = gql`
query GetOpenRounds($first: Int!, $skip: Int!) {
  rounds(
    where: { status: OPEN }
    orderBy: lockAt
    orderDirection: asc
    first: $first
    skip: $skip
  ) {
    id
    status
    asset
    createdAt
    lockAt
    closeAt
    upAmount
    downAmount
    totalAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    lockPrice
    closePrice
    payoutUp
    payoutDown
  }
}
`

export const getClosedRoundsQuery = gql`
query GetRecentClosedRounds($first: Int!, $skip: Int!) {
  rounds(
    where: { 
      status_in: [CLOSED, CANCELLED]
    }
    orderBy: closeAt
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    status
    asset
    lockPrice
    closePrice
    finalPosition
    upAmount
    downAmount
    lockAt
    closeAt
    liveAt
    totalAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    priceChange
    priceChangePercent
    payoutUp
    payoutDown
  }
}
`

export const getUserLastBets = gql`
query GetUserLastBets($user: String!, $first: Int!) {
  bets(
    where: { user: $user }
    orderBy: createdAt
    orderDirection: desc
    first: $first
  ) {
    id
    amount
    position
    claimed
    claimedAmount
    createdAt
    claimedAt
    isWinner
    isRefund
    payout
    profit
    blockNumber
    transactionHash
    round {
      id
      status
      asset
      lockPrice
      closePrice
      finalPosition
      lockAt
      closeAt
      liveAt
      upAmount
      downAmount
      totalAmount
      priceChange
      priceChangePercent
      payoutDown
      payoutUp
    }
  }
}
`

export const getRoundByKeyQuery = gql`
query GetRoundByKey($roundId: String!) {
  round(id: $roundId) {
    id
    status
    lockPrice
    closePrice
    upAmount
    downAmount
    createdAt
    lockAt
    liveAt
    closeAt
    finalPosition
    waitingForStart
    waitingForEnd
    totalAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    priceChange
    priceChangePercent
    
    # All bets for this round
    bets(orderBy: createdAt, orderDirection: desc) {
      id
      amount
      position
      claimed
      payout
      profit
      createdAt
      claimedAt
      isWinner
      isRefund
      user {
        id
      }
    }
  }
}
`

export const getRoundTimestampsByKeyQuery = gql`
query GetRoundTimestampsByKeyQuery($roundId: String!) {
  round(id: $roundId) {
    id
    status
    createdAt
    lockAt
    liveAt
    closeAt
  }
}
`

export const getUserBetsForRoundQuery = gql`
query GetUserBetsForRound($user: String!, $roundId: String!, $userRoundId: String!) {
  # Get all bets by a user for a specific round
  bets(
    where: { 
      user: $user
      round: $roundId
    }
    orderBy: createdAt
    orderDirection: desc
  ) {
    id
    amount
    position
    claimed
    claimedAmount
    payout
    profit
    createdAt
    claimedAt
    isWinner
    isRefund
    blockNumber
    transactionHash
  }
  
  # Get the UserRound summary
  userRound(id: $userRoundId) {
    totalAmount
    betCount
    upAmount
    downAmount
    claimed
    totalPayout
    totalProfit
    createdAt
    lastBetAt
  }
}
`

export const getUserBetsQuery = gql`
query GetUserBets($user: String!, $first: Int!, $skip: Int!) {
  bets(
    where: { user: $user }
    orderBy: createdAt
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    amount
    position
    claimed
    claimedAmount
    createdAt
    claimedAt
    isWinner
    isRefund
    payout
    profit
    blockNumber
    transactionHash
    round {
      id
      status
      lockPrice
      closePrice
      finalPosition
      lockAt
      closeAt
      liveAt
      priceChange
      priceChangePercent
    }
  }
}
`

export const getUserWinningBetsQuery = gql`
query GetUserWinningBets($user: String!) {
  bets(
    where: { 
      user: $user, 
      isWinner: true,
      claimed: true 
    }
    orderBy: profit
    orderDirection: desc
    first: 50
  ) {
    id
    amount
    payout
    profit
    createdAt
    position
    round {
      id
      lockPrice
      closePrice
      finalPosition
    }
  }
}
`

export const getRecentActivityQuery = gql`
query GetRecentActivity($first: Int!) {
  bets(
    orderBy: createdAt
    orderDirection: desc
    first: $first
  ) {
    id
    amount
    position
    createdAt
    blockNumber
    transactionHash
    user {
      id
    }
    round {
      id
      status
      lockAt
      closeAt
    }
  }
}
`

export const getRoundDetailsQuery = gql`
query GetRoundDetails($roundId: String!) {
  round(id: $roundId) {
    id
    status
    lockPrice
    closePrice
    upAmount
    downAmount
    createdAt
    lockAt
    liveAt
    closeAt
    finalPosition
    waitingForStart
    waitingForEnd
    totalAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    priceChange
    priceChangePercent
    
    bets(orderBy: createdAt, orderDirection: desc) {
      id
      amount
      position
      claimed
      payout
      profit
      createdAt
      claimedAt
      isWinner
      isRefund
      user {
        id
      }
    }
  }
}
`

export const getRecentlyClosedRoundsQuery = gql`
query GetRecentlyClosedRounds($first: Int!) {
  rounds(
    where: { status: CLOSED }
    orderBy: closeAt
    orderDirection: desc
    first: $first
  ) {
    id
    status
    lockPrice
    closePrice
    finalPosition
    upAmount
    downAmount
    lockAt
    closeAt
    liveAt
    totalAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    priceChange
    priceChangePercent
    waitingForStart
    waitingForEnd
    payoutUp
    payoutDown
  }
}
`

export const getPlatformStatsQuery = gql`
query GetPlatformStats {
  globalStats(id: "global") {
    totalUsers
    totalBets
    totalVolume
    totalRounds
    openRounds
    liveRounds
    closedRounds
    cancelledRounds
    upBets
    downBets
    upVolume
    downVolume
    lastUpdated
  }
}
`

export const getDailyStatsQuery = gql`
query GetDailyStats {
  dailyStats(
    orderBy: date
    orderDirection: desc
    first: 30
  ) {
    date
    totalBets
    totalVolume
    uniqueUsers
    roundsCreated
    roundsClosed
    upVolume
    downVolume
    newUsers
    activeUsers
  }
}
`

export const getTopUsersByVolumeQuery = gql`
query GetTopUsersByVolume($first: Int!) {
  users(
    orderBy: totalAmount
    orderDirection: desc
    first: $first
  ) {
    id
    totalBets
    totalAmount
    totalWinnings
    totalLosses
    profitLoss
    winRate
    upBets
    downBets
    wonBets
    lostBets
    refundedBets
    createdAt
    lastActivityAt
  }
}
`

export const getTopUsersByProfitQuery = gql`
query GetTopUsersByProfit($first: Int!) {
  users(
    orderBy: profitLoss
    orderDirection: desc
    first: $first
  ) {
    id
    totalBets
    totalAmount
    totalWinnings
    totalLosses
    profitLoss
    winRate
    upBets
    downBets
    wonBets
    lostBets
    refundedBets
  }
}
`

export const getUserPerformanceQuery = gql`
query GetUserPerformance($user: String!) {
  user(id: $user) {
    id
    totalBets
    totalAmount
    totalWinnings
    totalLosses
    totalClaimed
    profitLoss
    winRate
    upBets
    downBets
    wonBets
    lostBets
    refundedBets
    createdAt
    lastActivityAt
    
    # Recent bets
    bets(
      orderBy: createdAt
      orderDirection: desc
      first: 10
    ) {
      id
      amount
      position
      claimed
      payout
      profit
      createdAt
      round {
        id
        status
        finalPosition
      }
    }
  }
}
`

export const getUserTransactionsQuery = gql`
query GetUserTransactions($user: String!, $first: Int!, $skip: Int!) {
  transactions(
    where: { user: $user }
    orderBy: timestamp
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    id
    type
    amount
    timestamp
    blockNumber
    bet {
      id
      position
    }
    round {
      id
    }
  }
}
`

export const getBetsByAmountRangeQuery = gql`
query GetBetsByAmountRange($minAmount: BigInt!, $maxAmount: BigInt!) {
  bets(
    where: {
      amount_gte: $minAmount,
      amount_lte: $maxAmount
    }
    orderBy: amount
    orderDirection: desc
    first: 100
  ) {
    id
    amount
    position
    claimed
    payout
    profit
    user {
      id
    }
    round {
      id
      status
    }
  }
}
`

export const getHighVolumeRoundsQuery = gql`
query GetHighVolumeRounds($minVolume: BigInt!) {
  rounds(
    where: { totalAmount_gte: $minVolume }
    orderBy: totalAmount
    orderDirection: desc
    first: 50
  ) {
    id
    status
    totalAmount
    upAmount
    downAmount
    upBetsCount
    downBetsCount
    totalBetsCount
    finalPosition
    lockPrice
    closePrice
    priceChange
    priceChangePercent
    payoutUp
    payoutDown
  }
}
`
