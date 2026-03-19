export const abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "paymentTokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_pythAddress",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdETH",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdARB",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdAAVE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdBTC",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdSOL",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdXRP",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdBNB",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdDOGE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdPEPE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedIdSHIB",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "_betLockBuffer",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "_dataWaitWindow",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "_feeCollectorAddress",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "_feeBps",
        "type": "uint32"
      },
      {
        "internalType": "uint128",
        "name": "_minBetAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_maxBetAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_maxOpenRoundsPerUser",
        "type": "uint128"
      },
      {
        "internalType": "uint256",
        "name": "_minOpenTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minLockTime",
        "type": "uint256"
      },
      {
        "internalType": "uint128",
        "name": "_advanceCooldown",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_priceMaxAge",
        "type": "uint128"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "BetAmountAboveMaximum",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BetAmountBelowMinimum",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeeTooHigh",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GamePaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBetPosition",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMaxBetAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMaxOpenRoundsPerUser",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMinBetAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMinLockTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMinOpenTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPriceMaxAge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRoundTimes",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoFeeCollectorSet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEnoughBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotReadyToAdvance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceFeedNotAvailable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceFeedNotConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrancy",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RoundAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RoundNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RoundNotOpen",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooManyOpenRounds",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "betId",
        "type": "uint128"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "BetClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "minAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "maxAmount",
        "type": "uint128"
      }
    ],
    "name": "BetLimitsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "betId",
        "type": "uint128"
      },
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "betId",
        "type": "uint128"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "BetRefunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "collector",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "feeBps",
        "type": "uint32"
      }
    ],
    "name": "FeeConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "payoutUp",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "payoutDown",
        "type": "uint128"
      }
    ],
    "name": "PayoutsCalculated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "feed",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum Asset",
        "name": "asset",
        "type": "uint8"
      }
    ],
    "name": "PriceFeedAddressConfigured",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      }
    ],
    "name": "RoundCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "closePrice",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "enum Position",
        "name": "finalPosition",
        "type": "uint8"
      }
    ],
    "name": "RoundClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "lockAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "closeAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "enum Asset",
        "name": "asset",
        "type": "uint8"
      }
    ],
    "name": "RoundCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "lockPrice",
        "type": "int256"
      }
    ],
    "name": "RoundStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokenRecovery",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "contractInitialized",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "advance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "advanceCooldown",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "betLockBuffer",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "name": "bets",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "internalType": "enum Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "claimed",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      }
    ],
    "name": "calculateRoundPayouts",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "payoutUp",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "payoutDown",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128[]",
        "name": "betIds",
        "type": "uint128[]"
      }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      }
    ],
    "name": "closeRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "lockAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "closeAt",
        "type": "uint64"
      },
      {
        "internalType": "enum Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "enum Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "createOpenRoundAndBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dataWaitWindow",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeBps",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeCollector",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveRoundIds",
    "outputs": [
      {
        "internalType": "uint128[]",
        "name": "",
        "type": "uint128[]"
      },
      {
        "internalType": "uint128[]",
        "name": "",
        "type": "uint128[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getAllBetsForUser",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "roundId",
            "type": "uint128"
          },
          {
            "internalType": "enum Position",
            "name": "position",
            "type": "uint8"
          },
          {
            "internalType": "uint128",
            "name": "amount",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "claimed",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "internalType": "struct Bet[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "betId",
        "type": "uint128"
      }
    ],
    "name": "getBet",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "roundId",
            "type": "uint128"
          },
          {
            "internalType": "enum Position",
            "name": "position",
            "type": "uint8"
          },
          {
            "internalType": "uint128",
            "name": "amount",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "claimed",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          }
        ],
        "internalType": "struct Bet",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeePool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMetadata",
    "outputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_paymentToken",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "_betLockBuffer",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "_dataWaitWindow",
        "type": "uint64"
      },
      {
        "internalType": "uint32",
        "name": "_feeBps",
        "type": "uint32"
      },
      {
        "internalType": "uint256",
        "name": "_minBetAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_maxBetAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_maxOpenRoundsPerUser",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minOpenTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minLockTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_advanceCooldown",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_priceMaxAge",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_paused",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNextAdvanceDeadline",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Asset",
        "name": "asset",
        "type": "uint8"
      }
    ],
    "name": "getPrice",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPriceFeeds",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "_priceFeedETH",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedARB",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedAAVE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedBTC",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedSOL",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedXRP",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedBNB",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedDOGE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedPEPE",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_priceFeedSHIB",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      }
    ],
    "name": "getRound",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "lockAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "closeAt",
            "type": "uint64"
          },
          {
            "internalType": "int256",
            "name": "lockPrice",
            "type": "int256"
          },
          {
            "internalType": "enum RoundStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "enum Asset",
            "name": "asset",
            "type": "uint8"
          },
          {
            "internalType": "uint128",
            "name": "upAmount",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "downAmount",
            "type": "uint128"
          },
          {
            "internalType": "int256",
            "name": "closePrice",
            "type": "int256"
          },
          {
            "internalType": "enum Position",
            "name": "finalPosition",
            "type": "uint8"
          }
        ],
        "internalType": "struct Round",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserBalance",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxBetAmount",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxOpenRoundsPerUser",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minBetAmount",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minLockTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minOpenTime",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paymentToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      },
      {
        "internalType": "enum Position",
        "name": "position",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "priceMaxAge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "recoverToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "name": "rounds",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "lockAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "closeAt",
        "type": "uint64"
      },
      {
        "internalType": "int256",
        "name": "lockPrice",
        "type": "int256"
      },
      {
        "internalType": "enum RoundStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "enum Asset",
        "name": "asset",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "upAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "downAmount",
        "type": "uint128"
      },
      {
        "internalType": "int256",
        "name": "closePrice",
        "type": "int256"
      },
      {
        "internalType": "enum Position",
        "name": "finalPosition",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_advanceCooldown",
        "type": "uint256"
      }
    ],
    "name": "setAdvanceCooldown",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "_minBetAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_maxBetAmount",
        "type": "uint128"
      }
    ],
    "name": "setBetLimits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "_betLockBuffer",
        "type": "uint64"
      }
    ],
    "name": "setBetLockBuffer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "_dataWaitWindow",
        "type": "uint64"
      }
    ],
    "name": "setDataWaitWindow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_feeCollector",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "_feeBps",
        "type": "uint32"
      }
    ],
    "name": "setFeeConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "_maxOpenRoundsPerUser",
        "type": "uint128"
      }
    ],
    "name": "setMaxOpenRoundsPerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_minLockTime",
        "type": "uint256"
      }
    ],
    "name": "setMinLockTime",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_minOpenTime",
        "type": "uint256"
      }
    ],
    "name": "setMinOpenTime",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "_paused",
        "type": "bool"
      }
    ],
    "name": "setPauseState",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedAAVE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedARB",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedBNB",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedBTC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedDOGE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedPEPE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedSHIB",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedSOL",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      }
    ],
    "name": "setPriceAddressFeedXRP",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_priceMaxAge",
        "type": "uint256"
      }
    ],
    "name": "setPriceMaxAge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "roundId",
        "type": "uint128"
      }
    ],
    "name": "startRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawCollectedFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
