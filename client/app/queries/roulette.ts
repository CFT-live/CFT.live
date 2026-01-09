import { gql } from "graphql-request";

// Get all open tables (waiting for players)
export const getOpenTablesQuery = gql`
  query GetOpenTables($first: Int!, $skip: Int!) {
    tables(
      where: { status: Open, playerCount_gt: 0 }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      currentPlayerIndex
      createdAt
      blockNumber
      transactionHash
      playerCount
      turnStartTime
      players(orderBy: position, orderDirection: asc) {
        id
        user {
          id
        }
        position
        status
        isReady
        joinedAt
      }
    }
  }
`;

// Get all in-progress tables
export const getInProgressTablesQuery = gql`
  query GetInProgressTables($first: Int!, $skip: Int!) {
    tables(
      where: { status_in: [InProgress, WaitingRandom] }
      orderBy: startedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      currentPlayerIndex
      createdAt
      startedAt
      requestId
      blockNumber
      transactionHash
      players {
        id
        user {
          id
        }
        position
        status
        totalBetAmount
        turnsPlayed
        eliminated
        eliminatedAt
      }
    }
  }
`;

// Get finished tables
export const getFinishedTablesQuery = gql`
  query GetFinishedTables($first: Int!, $skip: Int!) {
    tables(
      where: { status: Finished }
      orderBy: finishedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      winner
      payoutClaimed
      createdAt
      startedAt
      finishedAt
      blockNumber
      transactionHash
      players {
        id
        user {
          id
        }
        position
        status
        totalBetAmount
        turnsPlayed
        eliminated
        eliminatedAt
      }
    }
  }
`;

// Get table by ID with full details
export const getTableByIdQuery = gql`
  query GetTableById($tableId: String!) {
    table(id: $tableId) {
      id
      creator {
        id
        tablesJoined
        tablesWon
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      currentPlayerIndex
      winner
      payoutClaimed
      requestId
      createdAt
      startedAt
      finishedAt
      cancelReason
      blockNumber
      transactionHash
      playerCount
      turnStartTime
      players(orderBy: position, orderDirection: asc) {
        id
        user {
          id
          tablesJoined
          tablesWon
          totalBetAmount
        }
        position
        status
        totalBetAmount
        turnsPlayed
        isReady
        eliminated
        eliminatedAt
        joinedAt
        leftAt
      }
      turns(orderBy: createdAt, orderDirection: asc) {
        id
        player {
          id
        }
        turnNumber
        betAmount
        playerRandom
        serverRandom
        eliminated
        randomFulfilled
        createdAt
        fulfilledAt
        blockNumber
        transactionHash
      }
      payouts(orderBy: createdAt, orderDirection: desc) {
        id
        user {
          id
        }
        amount
        isRefund
        createdAt
        blockNumber
        transactionHash
      }
    }
  }
`;

// Get user's table participations
export const getUserTableParticipationsQuery = gql`
  query GetUserTableParticipations($user: String!, $first: Int!, $skip: Int!) {
    tablePlayers(
      where: { user: $user }
      orderBy: joinedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      position
      status
      totalBetAmount
      turnsPlayed
      isReady
      eliminated
      eliminatedAt
      joinedAt
      leftAt
      table {
        id
        status
        initialBetAmount
        currentBetAmount
        maxIncrement
        maxPlayers
        totalPool
        winner
        payoutClaimed
        createdAt
        startedAt
        finishedAt
      }
    }
  }
`;

// Get user's active tables
export const getUserActiveTablesQuery = gql`
  query GetUserActiveTables($user: String!) {
    tablePlayers(
      where: { 
        user: $user
        status_in: [Waiting, Playing]
      }
      orderBy: joinedAt
      orderDirection: desc
    ) {
      id
      position
      status
      totalBetAmount
      turnsPlayed
      isReady
      table {
        id
        status
        initialBetAmount
        currentBetAmount
        maxIncrement
        maxPlayers
        totalPool
        currentPlayerIndex
        createdAt
        startedAt
        players {
          id
          user {
            id
          }
          position
          status
          isReady
        }
        payoutClaimed
        winner
      }
    }
  }
`;

// Get user's turns history
export const getUserTurnsQuery = gql`
  query GetUserTurns($user: String!, $first: Int!, $skip: Int!) {
    turns(
      where: { player: $user }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      betAmount
      playerRandom
      serverRandom
      eliminated
      randomFulfilled
      createdAt
      fulfilledAt
      blockNumber
      transactionHash
      table {
        id
        status
        totalPool
        winner
      }
    }
  }
`;

// Get user's payouts (winnings and refunds)
export const getUserPayoutsQuery = gql`
  query GetUserPayouts($user: String!, $first: Int!, $skip: Int!) {
    payouts(
      where: { user: $user }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      amount
      isRefund
      createdAt
      blockNumber
      transactionHash
      table {
        id
        status
        totalPool
        winner
        createdAt
        finishedAt
      }
    }
  }
`;

// Get user statistics
export const getUserStatsQuery = gql`
  query GetUserStats($user: String!) {
    user(id: $user) {
      id
      tablesJoined
      tablesWon
      totalBetAmount
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

// Get global statistics
export const getGlobalStatsQuery = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      id
      totalUsers
      totalTables
      totalTurns
      totalVolume
      totalWinnings
      totalRefunds
      openTables
      inProgressTables
      finishedTables
      cancelledTables
      lastUpdated
    }
  }
`;

// Get recent tables (all statuses)
export const getRecentTablesQuery = gql`
  query GetRecentTables($first: Int!) {
    tables(
      orderBy: createdAt
      orderDirection: desc
      first: $first
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      winner
      payoutClaimed
      createdAt
      startedAt
      finishedAt
      players {
        id
        user {
          id
        }
        position
        status
      }
    }
  }
`;

// Get table turns
export const getTableTurnsQuery = gql`
  query GetTableTurns($tableId: String!, $first: Int!, $skip: Int!) {
    turns(
      where: { table: $tableId }
      orderBy: createdAt
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      id
      player {
        id
      }
      tablePlayer {
        id
        position
      }
      turnNumber
      betAmount
      playerRandom
      serverRandom
      eliminated
      randomFulfilled
      createdAt
      fulfilledAt
      blockNumber
      transactionHash
    }
  }
`;

// Get table players
export const getTablePlayersQuery = gql`
  query GetTablePlayers($tableId: String!) {
    tablePlayers(
      where: { table: $tableId }
      orderBy: position
      orderDirection: asc
    ) {
      id
      user {
        id
        tablesJoined
        tablesWon
        totalBetAmount
        totalWinnings
      }
      position
      status
      totalBetAmount
      turnsPlayed
      isReady
      eliminated
      eliminatedAt
      joinedAt
      leftAt
      turns {
        id
        betAmount
        playerRandom
        serverRandom
        eliminated
        createdAt
      }
    }
  }
`;

// Get top users by tables won
export const getTopUsersByTablesWonQuery = gql`
  query GetTopUsersByTablesWon($first: Int!) {
    users(
      orderBy: tablesWon
      orderDirection: desc
      first: $first
    ) {
      id
      tablesJoined
      tablesWon
      totalBetAmount
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

// Get top users by total bet amount
export const getTopUsersByBetAmountQuery = gql`
  query GetTopUsersByBetAmount($first: Int!) {
    users(
      orderBy: totalBetAmount
      orderDirection: desc
      first: $first
    ) {
      id
      tablesJoined
      tablesWon
      totalBetAmount
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

// Get top users by winnings
export const getTopUsersByWinningsQuery = gql`
  query GetTopUsersByWinnings($first: Int!) {
    users(
      orderBy: totalWinnings
      orderDirection: desc
      first: $first
    ) {
      id
      tablesJoined
      tablesWon
      totalBetAmount
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

// Get recent activity (recent turns)
export const getRecentActivityQuery = gql`
  query GetRecentActivity($first: Int!) {
    turns(
      orderBy: createdAt
      orderDirection: desc
      first: $first
    ) {
      id
      player {
        id
      }
      betAmount
      playerRandom
      serverRandom
      eliminated
      createdAt
      blockNumber
      transactionHash
      table {
        id
        status
        totalPool
      }
    }
  }
`;

// Get high stakes tables
export const getHighStakesTablesQuery = gql`
  query GetHighStakesTables($minBetAmount: BigInt!, $first: Int!) {
    tables(
      where: { initialBetAmount_gte: $minBetAmount }
      orderBy: initialBetAmount
      orderDirection: desc
      first: $first
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      winner
      createdAt
      startedAt
      finishedAt
      players {
        id
        user {
          id
        }
      }
    }
  }
`;

// Get cancelled tables
export const getCancelledTablesQuery = gql`
  query GetCancelledTables($first: Int!, $skip: Int!) {
    tables(
      where: { status: Cancelled }
      orderBy: finishedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      maxIncrement
      maxPlayers
      totalPool
      cancelReason
      createdAt
      finishedAt
      players {
        id
        user {
          id
        }
        totalBetAmount
      }
    }
  }
`;

// Get user's won tables
export const getUserWonTablesQuery = gql`
  query GetUserWonTables($user: String!, $first: Int!, $skip: Int!) {
    tables(
      where: { 
        winner: $user
        status: Finished
      }
      orderBy: finishedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxPlayers
      totalPool
      winner
      payoutClaimed
      createdAt
      startedAt
      finishedAt
      players {
        id
        user {
          id
        }
        position
        totalBetAmount
        eliminated
      }
    }
  }
`;

// Get table by status count
export const getTablesByStatusQuery = gql`
  query GetTablesByStatus($status: TableStatus!, $first: Int!, $skip: Int!) {
    tables(
      where: { status: $status }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      creator {
        id
      }
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      winner
      createdAt
      startedAt
      finishedAt
    }
  }
`;

// Search tables by creator
export const getTablesByCreatorQuery = gql`
  query GetTablesByCreator($creator: String!, $first: Int!, $skip: Int!) {
    tables(
      where: { creator: $creator }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      status
      initialBetAmount
      currentBetAmount
      maxIncrement
      maxPlayers
      totalPool
      winner
      payoutClaimed
      createdAt
      startedAt
      finishedAt
      players {
        id
        user {
          id
        }
      }
    }
  }
`;

// Get user profile with detailed stats
export const getUserProfileQuery = gql`
  query GetUserProfile($user: String!) {
    user(id: $user) {
      id
      tablesJoined
      tablesWon
      totalBetAmount
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
      tableParticipations(
        orderBy: joinedAt
        orderDirection: desc
        first: 10
      ) {
        id
        table {
          id
          status
          winner
          totalPool
        }
        totalBetAmount
        turnsPlayed
        eliminated
      }
      turns(
        orderBy: createdAt
        orderDirection: desc
        first: 10
      ) {
        id
        betAmount
        eliminated
        createdAt
      }
      payouts(
        orderBy: createdAt
        orderDirection: desc
        first: 10
      ) {
        id
        amount
        isRefund
        createdAt
      }
    }
  }
`;
