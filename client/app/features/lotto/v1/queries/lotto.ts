import { gql } from "graphql-request";

export const getOpenDrawsQuery = gql`
  query GetOpenDraws($first: Int!, $skip: Int!) {
    draws(
      where: { open: true }
      orderBy: startTime
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      startTime
      ticketPrice
      potSize
      ticketCount
      open
      winnerChosen
      winner
      claimed
      closeTime
      requestId
    }
  }
`;

export const getClosedDrawsQuery = gql`
  query GetClosedDraws($first: Int!, $skip: Int!) {
    draws(
      where: { open: false }
      orderBy: closeTime
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      startTime
      ticketPrice
      potSize
      ticketCount
      open
      winnerChosen
      winner
      claimed
      closeTime
      requestId
    }
  }
`;

export const getDrawsWithWinnerQuery = gql`
  query GetDrawsWithWinner($first: Int!, $skip: Int!) {
    draws(
      where: { winnerChosen: true }
      orderBy: closeTime
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      startTime
      ticketPrice
      potSize
      ticketCount
      open
      winnerChosen
      winner
      claimed
      closeTime
      requestId
    }
  }
`;

export const getDrawByIdQuery = gql`
  query GetDrawById($drawId: String!) {
    draw(id: $drawId) {
      id
      startTime
      ticketPrice
      potSize
      ticketCount
      open
      winnerChosen
      winner
      claimed
      closeTime
      requestId
      ticketPurchases(orderBy: createdAt, orderDirection: desc) {
        id
        user {
          id
        }
        amount
        totalCost
        createdAt
        blockNumber
        transactionHash
      }
      claims(orderBy: createdAt, orderDirection: desc) {
        id
        user {
          id
        }
        amount
        createdAt
        blockNumber
        transactionHash
      }
      refunds(orderBy: createdAt, orderDirection: desc) {
        id
        user {
          id
        }
        amount
        createdAt
        blockNumber
        transactionHash
      }
    }
  }
`;

export const getUserTicketPurchasesQuery = gql`
  query GetUserTicketPurchases($user: String!, $first: Int!, $skip: Int!) {
    ticketPurchases(
      where: { user: $user }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      draw {
        id
        startTime
        ticketPrice
        potSize
        ticketCount
        open
        winnerChosen
        winner
        claimed
        closeTime
      }
      amount
      totalCost
      createdAt
      blockNumber
      transactionHash
    }
  }
`;

export const getUserClaimsQuery = gql`
  query GetUserClaims($user: String!, $first: Int!, $skip: Int!) {
    claims(
      where: { user: $user }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      draw {
        id
        startTime
        ticketPrice
        potSize
        ticketCount
        winnerChosen
        winner
        claimed
        closeTime
      }
      amount
      createdAt
      blockNumber
      transactionHash
    }
  }
`;

export const getUserRefundsQuery = gql`
  query GetUserRefunds($user: String!, $first: Int!, $skip: Int!) {
    refunds(
      where: { user: $user }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      draw {
        id
        startTime
        ticketPrice
        potSize
        ticketCount
        winnerChosen
        winner
        claimed
        closeTime
      }
      amount
      createdAt
      blockNumber
      transactionHash
    }
  }
`;

export const getUserStatsQuery = gql`
  query GetUserStats($user: String!) {
    user(id: $user) {
      id
      totalTicketsBought
      totalAmountSpent
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

export const getGlobalStatsQuery = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      id
      totalUsers
      totalDraws
      totalTickets
      totalVolume
      totalWinnings
      totalRefunds
      openDraws
      closedDraws
      cancelledDraws
      lastUpdated
    }
  }
`;

export const getRecentDrawsQuery = gql`
  query GetRecentDraws($first: Int!) {
    draws(
      orderBy: startTime
      orderDirection: desc
      first: $first
    ) {
      id
      startTime
      ticketPrice
      potSize
      ticketCount
      open
      winnerChosen
      winner
      claimed
      closeTime
      requestId
    }
  }
`;

export const getDrawTicketPurchasesQuery = gql`
  query GetDrawTicketPurchases($drawId: String!, $first: Int!, $skip: Int!) {
    ticketPurchases(
      where: { draw: $drawId }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      user {
        id
      }
      amount
      totalCost
      createdAt
      blockNumber
      transactionHash
    }
  }
`;

export const getTopUsersByTicketsQuery = gql`
  query GetTopUsersByTickets($first: Int!) {
    users(
      orderBy: totalTicketsBought
      orderDirection: desc
      first: $first
    ) {
      id
      totalTicketsBought
      totalAmountSpent
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

export const getTopUsersByWinningsQuery = gql`
  query GetTopUsersByWinnings($first: Int!) {
    users(
      orderBy: totalWinnings
      orderDirection: desc
      first: $first
    ) {
      id
      totalTicketsBought
      totalAmountSpent
      totalWinnings
      totalRefunds
      createdAt
      lastActivityAt
    }
  }
`;

// Get user's ticket purchases for specific draws (to show ticket count per draw)
export const getUserTicketsByDrawsQuery = gql`
  query GetUserTicketsByDraws($user: String!, $drawIds: [String!]!) {
    ticketPurchases(
      where: { user: $user, draw_in: $drawIds }
    ) {
      id
      draw {
        id
      }
      amount
    }
  }
`;