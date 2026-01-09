// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title CFTRoulette - Russian Roulette using Chainlink VRF v2.5
 * @notice Players join tables and take turns betting. Each turn uses VRF to determine if player is eliminated.
 * Last player standing wins the entire pot.
 */


import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CFTRoulette is VRFConsumerBaseV2Plus, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    enum TableStatus {
        Open, // Waiting for players to join
        InProgress, // Game is active, players taking turns
        WaitingRandom, // Waiting for VRF callback
        Finished, // Game completed, winner determined
        Cancelled // Game cancelled (timeout or admin)
    }

    enum PlayerStatus {
        Waiting, // Joined table but not ready
        Playing, // Ready and alive in game
        Dead // Eliminated from game
    }

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Player {
        address addr;
        PlayerStatus status;
        uint256 playedAmount; // Total USDC bet by this player
        uint8 position; // Position in turn order
    }

    struct Table {
        uint256 id;
        address creator;
        TableStatus status;
        uint256 betAmount; // Current minimum bet for next turn
        uint256 maxIncrement; // Maximum bet increase allowed
        uint256 totalPool; // Total USDC in pot
        uint8 maxPlayers; // Maximum players allowed
        uint8 currentPlayerIndex; // Index in playerOrder for current turn
        uint256 pendingBet; // Bet amount for pending turn
        address pendingPlayer; // Player who made pending turn
        uint256 playerRandom; // Player's random number (0-9)
        uint256 serverRandom; // VRF random number (0-9)
        bool randomWordsFulfilled; // Whether VRF callback completed
        address winner; // Winner address (or address(0) if all dead)
        bool payoutClaimed; // Whether payout has been claimed
    }

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    // Token and VRF
    IERC20 public immutable usdc;
    IVRFCoordinatorV2Plus public immutable COORDINATOR;

    // VRF configuration
    uint256 public constant VRF_TIMEOUT = 10 minutes;
    uint256 public constant TURN_TIMEOUT = 10 minutes;
    uint16 public requestConfirmations = 3;
    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint32 public callbackGasLimit;

    // Table management
    uint256 public nextTableId = 1;
    mapping(uint256 => Table) public tables;
    mapping(uint256 => address[]) public tablePlayerOrder; // tableId => ordered player addresses
    mapping(uint256 => mapping(address => Player)) public tablePlayerData; // tableId => player => data

    // VRF request mapping
    mapping(uint256 => uint256) public requestToTable; // requestId => tableId
    mapping(uint256 => uint256) public tableRequestTime; // tableId => timestamp
    mapping(uint256 => uint256) public tableTurnStartTime; // tableId => timestamp when current turn started
    mapping(uint256 => uint256) public tableTurnNumber; // tableId => current turn number
    mapping(uint256 => uint256) public requestToTurnNumber; // requestId => turn number

    // Configuration
    address public feeCollector;
    uint32 public feeBps; // Fee in basis points (100 = 1%)
    uint256 private feePool; // Accumulated fees
    uint256 public minBetAmount;
    uint256 public maxBetAmount;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event TableCreated(
        uint256 indexed tableId,
        address indexed creator,
        uint256 betAmount,
        uint256 maxIncrement,
        uint8 maxPlayers
    );
    event PlayerJoined(uint256 indexed tableId, address indexed player);
    event PlayerLeft(uint256 indexed tableId, address indexed player);
    event PlayerKicked(uint256 indexed tableId, address indexed player, address indexed kicker);
    event PlayerReady(uint256 indexed tableId, address indexed player);
    event GameStarted(uint256 indexed tableId);
    event TurnPlayed(
        uint256 indexed tableId,
        address indexed player,
        uint256 betAmount,
        uint256 playerRandom,
        uint256 turnNumber
    );
    event RandomnessRequested(uint256 indexed tableId, uint256 requestId, uint256 turnNumber);
    event RandomWordsFulfilled(uint256 indexed tableId, uint256 serverRandom, uint256 turnNumber);
    event PlayerEliminated(uint256 indexed tableId, address indexed player);
    event PlayerTurnChanged(
        uint256 indexed tableId,
        uint8 currentPlayerIndex,
        uint256 turnStartTime
    );
    event PlayerTimedOut(
        uint256 indexed tableId,
        address indexed player,
        address indexed caller
    );
    event GameFinished(
        uint256 indexed tableId,
        address winner,
        uint256 totalPool
    );
    event PayoutClaimed(
        uint256 indexed tableId,
        address indexed player,
        uint256 amount,
        bool isRefund
    );
    event TableCancelled(uint256 indexed tableId, string reason);
    event FeeConfigUpdated(address collector, uint32 feeBps);
    event FeesWithdrawn(address indexed collector, uint256 amount);
    event ContractPaused();
    event ContractUnpaused();
    event MinBetAmountUpdated(uint256 newAmount);
    event MaxBetAmountUpdated(uint256 newAmount);
    event CallbackGasLimitUpdated(uint32 newLimit);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error TableNotFound();
    error TableNotOpen();
    error TableNotInProgress();
    error TableNotWaitingRandom();
    error TableNotFinished();
    error AlreadyInTable();
    error NotInTable();
    error PlayerAlreadyLeft();
    error TableFull();
    error InvalidBetAmount();
    error NotPlayerTurn();
    error InvalidMaxIncrement();
    error InvalidMaxPlayers();
    error FeeTooHigh();
    error NoFeeCollectorSet();
    error AlreadyClaimed();
    error NotWinner();
    error NoRefundAvailable();
    error VRFTimeoutNotReached();
    error VRFAlreadyFulfilled();
    error TurnTimeoutNotReached();
    error InvalidAddress();
    error InvalidAmount();
    error GameNotStarted();
    error NotEnoughPlayers();
    error PlayerAlreadyReady();

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _usdc,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint256 _minBetAmount,
        uint256 _maxBetAmount,
        address _feeCollector,
        uint32 _feeBps,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        require(_usdc != address(0), "Invalid usdc address");
        require(_vrfCoordinator != address(0), "Invalid vrf coordinator");
        require(_minBetAmount > 0, "Invalid min bet amount");
        require(_maxBetAmount >= _minBetAmount, "Max bet must be >= min bet");
        require(_callbackGasLimit > 0, "Invalid callback gas limit");
        require(_feeBps <= 10000, "Fee bps too high");

        usdc = IERC20(_usdc);
        COORDINATOR = IVRFCoordinatorV2Plus(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;

        minBetAmount = _minBetAmount;
        maxBetAmount = _maxBetAmount;
        feeCollector = _feeCollector;
        feeBps = _feeBps;
    }

    /*//////////////////////////////////////////////////////////////
                                USER ACTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new roulette table
     * @param _betAmount Initial bet amount (minimum bet for the table)
     * @param _maxIncrement Maximum bet increase allowed per turn (0 = fixed bet)
     * @param _maxPlayers Maximum number of players (2-10)
     */
    function createTable(
        uint256 _betAmount,
        uint256 _maxIncrement,
        uint8 _maxPlayers
    ) external nonReentrant whenNotPaused {
        if (_betAmount < minBetAmount || _betAmount > maxBetAmount)
            revert InvalidBetAmount();
        if (_maxPlayers < 2 || _maxPlayers > 10) revert InvalidMaxPlayers();

        uint256 tableId = nextTableId++;

        Table storage table = tables[tableId];
        table.id = tableId;
        table.creator = msg.sender;
        table.status = TableStatus.Open;
        table.betAmount = _betAmount;
        table.maxIncrement = _maxIncrement;
        table.totalPool = 0;
        table.maxPlayers = _maxPlayers;

        // Add creator as first player
        tablePlayerOrder[tableId].push(msg.sender);
        tablePlayerData[tableId][msg.sender] = Player({
            addr: msg.sender,
            status: PlayerStatus.Waiting,
            playedAmount: 0,
            position: 0
        });

        emit TableCreated(
            tableId,
            msg.sender,
            _betAmount,
            _maxIncrement,
            _maxPlayers
        );
        emit PlayerJoined(tableId, msg.sender);
    }

    /**
     * @notice Join an existing open table
     * @param _tableId The table ID to join
     */
    function joinTable(uint256 _tableId) external nonReentrant whenNotPaused {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.Open) revert TableNotOpen();
        if (tablePlayerData[_tableId][msg.sender].addr != address(0))
            revert AlreadyInTable();
        if (tablePlayerOrder[_tableId].length >= table.maxPlayers)
            revert TableFull();

        uint8 position = uint8(tablePlayerOrder[_tableId].length);
        tablePlayerOrder[_tableId].push(msg.sender);
        tablePlayerData[_tableId][msg.sender] = Player({
            addr: msg.sender,
            status: PlayerStatus.Waiting,
            playedAmount: 0,
            position: position
        });

        emit PlayerJoined(_tableId, msg.sender);
    }

    /**
     * @notice Leave a table
     * @dev Before game starts: removes player from table
     *      After game starts: marks player as dead (forfeits their bets)
     * @param _tableId The table ID to leave
     */
    function leaveTable(uint256 _tableId) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (
            table.status == TableStatus.Finished ||
            table.status == TableStatus.Cancelled
        ) revert TableNotOpen();
        if (tablePlayerData[_tableId][msg.sender].addr == address(0))
            revert NotInTable();

        Player storage player = tablePlayerData[_tableId][msg.sender];

        // If game hasn't started yet, remove player completely
        if (table.status == TableStatus.Open) {
            // Remove player from data
            delete tablePlayerData[_tableId][msg.sender];

            // Remove from player order array
            address[] storage players = tablePlayerOrder[_tableId];
            for (uint256 i = 0; i < players.length; i++) {
                if (players[i] == msg.sender) {
                    players[i] = players[players.length - 1];
                    players.pop();
                    break;
                }
            }

            // Update positions
            for (uint256 i = 0; i < players.length; i++) {
                tablePlayerData[_tableId][players[i]].position = uint8(i);
            }

            emit PlayerLeft(_tableId, msg.sender);

            // Delete table if no players left
            if (players.length == 0) {
                delete tables[_tableId];
            }
        } else {
            // Game is in progress or waiting for random - mark player as dead
            if (player.status == PlayerStatus.Dead) revert PlayerAlreadyLeft(); // Already dead/left

            emit PlayerLeft(_tableId, msg.sender);

            // Eliminate and check game end for both InProgress and WaitingRandom
            if (table.status == TableStatus.InProgress) {
                // Check if it's currently this player's turn
                bool isCurrentPlayer = tablePlayerOrder[_tableId][
                    table.currentPlayerIndex
                ] == msg.sender;
                _eliminatePlayer(_tableId, msg.sender, isCurrentPlayer);
            } else {
                // WaitingRandom - eliminate but don't advance turn
                _eliminatePlayer(_tableId, msg.sender, false);
            }
        }
    }

    /**
     * @notice Mark yourself as ready to start the game
     * @param _tableId The table ID
     */
    function markPlayerReady(uint256 _tableId) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.Open) revert TableNotOpen();

        Player storage player = tablePlayerData[_tableId][msg.sender];
        if (player.addr == address(0)) revert NotInTable();
        if (player.status == PlayerStatus.Playing) return; // Already ready

        player.status = PlayerStatus.Playing;

        emit PlayerReady(_tableId, msg.sender);

        // Check if all players are ready
        uint8 aliveCount = _countAlivePlayers(_tableId);
        if (aliveCount == tablePlayerOrder[_tableId].length) {
            if (aliveCount < 2) revert NotEnoughPlayers();
            table.status = TableStatus.InProgress;
            table.currentPlayerIndex = 0;
            tableTurnStartTime[_tableId] = block.timestamp;
            emit GameStarted(_tableId);
        }
    }

    /**
     * @notice Play your turn by placing a bet
     * @param _tableId The table ID
     * @param _betAmount Amount to bet (must be >= table.betAmount and <= betAmount + maxIncrement)
     * @param playerRandom Player's random number (must be 0-9)
     */
    function playTurn(
        uint256 _tableId,
        uint256 _betAmount,
        uint256 playerRandom
    ) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.InProgress) revert TableNotInProgress();

        address[] storage players = tablePlayerOrder[_tableId];
        address currentPlayer = players[table.currentPlayerIndex];
        if (msg.sender != currentPlayer) revert NotPlayerTurn();

        Player storage player = tablePlayerData[_tableId][msg.sender];
        if (player.status != PlayerStatus.Playing) revert NotPlayerTurn();

        // Validate player random number
        if (playerRandom > 9) revert InvalidAmount();

        // Validate bet amount
        if (_betAmount < table.betAmount) revert InvalidBetAmount();
        // If maxIncrement is 0, no upper limit. Otherwise, enforce the increment limit.
        if (
            table.maxIncrement > 0 &&
            _betAmount > table.betAmount + table.maxIncrement
        ) revert InvalidBetAmount();

        // Transfer USDC from player
        usdc.safeTransferFrom(msg.sender, address(this), _betAmount);

        // Update state
        player.playedAmount += _betAmount;
        table.totalPool += _betAmount;
        table.pendingBet = _betAmount;
        table.pendingPlayer = msg.sender;
        table.playerRandom = playerRandom;

        // Increment turn number
        uint256 currentTurn = tableTurnNumber[_tableId];
        tableTurnNumber[_tableId] = currentTurn + 1;

        emit TurnPlayed(_tableId, msg.sender, _betAmount, playerRandom, currentTurn);

        // Request VRF for server random
        table.status = TableStatus.WaitingRandom;
        uint256 requestId = COORDINATOR.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        requestToTable[requestId] = _tableId;
        tableRequestTime[_tableId] = block.timestamp;
        requestToTurnNumber[requestId] = currentTurn;

        emit RandomnessRequested(_tableId, requestId, currentTurn);
    }

    /**
     * @notice Claim winnings after game is finished
     * @param _tableId The table ID
     */
    function claimWinnings(uint256 _tableId) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.Finished) revert TableNotFinished();
        if (table.winner != msg.sender) revert NotWinner();
        if (table.payoutClaimed) revert AlreadyClaimed();

        table.payoutClaimed = true;

        uint256 payout = table.totalPool;
        uint256 feeAmount = 0;

        // Deduct fee if configured
        if (feeCollector != address(0) && feeBps > 0) {
            feeAmount = (payout * feeBps) / 10000;
            feePool += feeAmount;
            payout -= feeAmount;
        }

        usdc.safeTransfer(msg.sender, payout);

        emit PayoutClaimed(_tableId, msg.sender, payout, false);
    }

    /**
     * @notice Claim refund if all players died
     * @param _tableId The table ID
     */
    function claimRefund(uint256 _tableId) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.Finished) revert TableNotFinished();
        if (table.winner != address(0)) revert NoRefundAvailable();

        Player storage player = tablePlayerData[_tableId][msg.sender];
        if (player.addr == address(0)) revert NotInTable();
        if (player.playedAmount == 0) revert NoRefundAvailable();

        uint256 refundAmount = player.playedAmount;
        player.playedAmount = 0; // Prevent double claim

        usdc.safeTransfer(msg.sender, refundAmount);

        emit PayoutClaimed(_tableId, msg.sender, refundAmount, true);
    }

    function cancelTableAfterTimeout(uint256 _tableId) external {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.WaitingRandom)
            revert TableNotWaitingRandom();
        if (table.randomWordsFulfilled) revert VRFAlreadyFulfilled();
        if (block.timestamp < tableRequestTime[_tableId] + VRF_TIMEOUT)
            revert VRFTimeoutNotReached();

        // Cancel and allow refunds
        table.status = TableStatus.Finished;
        table.winner = address(0);
        table.randomWordsFulfilled = true;

        emit TableCancelled(_tableId, "VRF timeout");
    }

    /**
     * @notice Eliminate a player who hasn't played their turn within the timeout period
     * @param _tableId The table ID
     */
    function eliminateInactivePlayer(uint256 _tableId) external nonReentrant {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.InProgress) revert TableNotInProgress();
        if (block.timestamp < tableTurnStartTime[_tableId] + TURN_TIMEOUT)
            revert TurnTimeoutNotReached();

        address[] storage players = tablePlayerOrder[_tableId];
        address currentPlayer = players[table.currentPlayerIndex];

        emit PlayerTimedOut(_tableId, currentPlayer, msg.sender);

        // Eliminate player and advance to next
        _eliminatePlayer(_tableId, currentPlayer, true);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Count alive players in a table
     * @param _tableId The table ID
     * @return Number of players with Playing status
     */
    function _countAlivePlayers(
        uint256 _tableId
    ) internal view returns (uint8) {
        address[] storage players = tablePlayerOrder[_tableId];
        uint8 count = 0;
        for (uint256 i = 0; i < players.length; i++) {
            if (
                tablePlayerData[_tableId][players[i]].status ==
                PlayerStatus.Playing
            ) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Internal function to handle player elimination and game ending logic
     * @param _tableId The table ID
     * @param _playerToEliminate Address of the player to eliminate
     * @param _advanceToNextPlayer Whether to advance to the next player (false if game might be over)
     */
    function _eliminatePlayer(
        uint256 _tableId,
        address _playerToEliminate,
        bool _advanceToNextPlayer
    ) internal {
        Table storage table = tables[_tableId];
        Player storage player = tablePlayerData[_tableId][_playerToEliminate];
        if (player.status == PlayerStatus.Dead) {
            // Already dead, nothing to do
            return;
        }

        // Mark player as dead
        player.status = PlayerStatus.Dead;

        emit PlayerEliminated(_tableId, _playerToEliminate);

        // Check if game should end (only 1 or 0 players left)
        uint8 aliveCount = _countAlivePlayers(_tableId);
        if (aliveCount <= 1) {
            table.status = TableStatus.Finished;

            address[] storage players = tablePlayerOrder[_tableId];
            if (aliveCount == 1) {
                // Find winner
                for (uint256 i = 0; i < players.length; i++) {
                    if (
                        tablePlayerData[_tableId][players[i]].status ==
                        PlayerStatus.Playing
                    ) {
                        table.winner = players[i];
                        break;
                    }
                }
                emit GameFinished(_tableId, table.winner, table.totalPool);
            } else {
                // All players dead - refund scenario
                table.winner = address(0);
                emit GameFinished(_tableId, address(0), table.totalPool);
            }
        } else if (_advanceToNextPlayer) {
            // Continue to next player
            address[] storage players = tablePlayerOrder[_tableId];
            uint8 nextIndex = (table.currentPlayerIndex + 1) %
                uint8(players.length);
            while (
                tablePlayerData[_tableId][players[nextIndex]].status !=
                PlayerStatus.Playing
            ) {
                nextIndex = (nextIndex + 1) % uint8(players.length);
            }
            table.currentPlayerIndex = nextIndex;
            tableTurnStartTime[_tableId] = block.timestamp;
        }
    }

    /**
     * @notice Chainlink VRF callback
     * @param requestId The VRF request ID
     * @param randomWords Array of random numbers
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 tableId = requestToTable[requestId];
        if (tableId == 0) {
            return;
        }
        Table storage table = tables[tableId];

        if (table.randomWordsFulfilled) return; // Already processed
        table.randomWordsFulfilled = true;

        // Get server random (0-9)
        uint256 serverRandom = randomWords[0] % 10;
        table.serverRandom = serverRandom;

        // Get the turn number for this request
        uint256 turnNumber = requestToTurnNumber[requestId];

        emit RandomWordsFulfilled(tableId, serverRandom, turnNumber);

        // Check if player is eliminated
        bool eliminated = (table.playerRandom == serverRandom);

        if (eliminated) {
            _eliminatePlayer(tableId, table.pendingPlayer, false);
        }

        // Update bet amount for next turn
        table.betAmount = table.pendingBet;

        // Handle game state after elimination check
        if (table.status != TableStatus.Finished) {
            // Continue to next player
            table.status = TableStatus.InProgress;
            table.randomWordsFulfilled = false;

            address[] storage players = tablePlayerOrder[tableId];
            uint8 nextIndex = (table.currentPlayerIndex + 1) %
                uint8(players.length);
            while (
                tablePlayerData[tableId][players[nextIndex]].status !=
                PlayerStatus.Playing
            ) {
                nextIndex = (nextIndex + 1) % uint8(players.length);
            }
            table.currentPlayerIndex = nextIndex;
            tableTurnStartTime[tableId] = block.timestamp;
            emit PlayerTurnChanged(tableId, table.currentPlayerIndex, tableTurnStartTime[tableId]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                                ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setMinBetAmount(uint256 _minBetAmount) external onlyOwner {
        if (_minBetAmount == 0) revert InvalidAmount();
        if (_minBetAmount > maxBetAmount) revert InvalidAmount();
        minBetAmount = _minBetAmount;
        emit MinBetAmountUpdated(_minBetAmount);
    }

    function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
        if (_maxBetAmount < minBetAmount) revert InvalidAmount();
        maxBetAmount = _maxBetAmount;
        emit MaxBetAmountUpdated(_maxBetAmount);
    }

    function setFeeConfig(
        address _feeCollector,
        uint32 _feeBps
    ) external onlyOwner {
        if (_feeBps > 10000) revert FeeTooHigh();
        feeCollector = _feeCollector;
        feeBps = _feeBps;
        emit FeeConfigUpdated(_feeCollector, _feeBps);
    }

    function setVRFConfig(
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint16 _requestConfirmations
    ) external onlyOwner {
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        requestConfirmations = _requestConfirmations;
    }

    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        if (_callbackGasLimit == 0) revert InvalidAmount();
        callbackGasLimit = _callbackGasLimit;
        emit CallbackGasLimitUpdated(_callbackGasLimit);
    }

    function withdrawCollectedFees() external onlyOwner nonReentrant {
        if (feeCollector == address(0)) revert NoFeeCollectorSet();
        uint256 amount = feePool;
        if (amount == 0) return;
        feePool = 0;
        usdc.safeTransfer(feeCollector, amount);
        emit FeesWithdrawn(feeCollector, amount);
    }

    function getFeePool() external view onlyOwner returns (uint256) {
        return feePool;
    }

    function pause() external onlyOwner {
        _pause();
        emit ContractPaused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused();
    }

    
    /**
     * @notice Kick a player from the table (only before game starts)
     * @dev Only the contract owner can kick players
     * @dev Can only kick players who haven't marked themselves ready
     * @dev If all players are removed, the table is deleted
     * @param _tableId The table ID
     * @param _playerToKick Address of the player to kick
     */
    function kickPlayer(uint256 _tableId, address _playerToKick) external nonReentrant onlyOwner {
        Table storage table = tables[_tableId];
        if (table.id == 0) revert TableNotFound();
        if (table.status != TableStatus.Open) revert TableNotOpen();

        Player storage player = tablePlayerData[_tableId][_playerToKick];
        if (player.addr == address(0)) revert NotInTable();
        if (player.status == PlayerStatus.Playing) revert PlayerAlreadyReady();

        // Remove player from data
        delete tablePlayerData[_tableId][_playerToKick];

        // Remove from player order array
        address[] storage players = tablePlayerOrder[_tableId];
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == _playerToKick) {
                players[i] = players[players.length - 1];
                players.pop();
                break;
            }
        }

        // Update positions
        for (uint256 i = 0; i < players.length; i++) {
            tablePlayerData[_tableId][players[i]].position = uint8(i);
        }

        emit PlayerKicked(_tableId, _playerToKick, msg.sender);

        // Delete table if no players left
        if (players.length == 0) {
            delete tables[_tableId];
        }
    }

    /*//////////////////////////////////////////////////////////////
                                VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMetadata()
        external
        view
        returns (
            uint256 _nextTableId,
            uint256 _minBetAmount,
            uint256 _maxBetAmount,
            uint32 _callbackGasLimit,
            uint32 _feeBps,
            bool _paused
        )
    {
        return (
            nextTableId,
            minBetAmount,
            maxBetAmount,
            callbackGasLimit,
            feeBps,
            paused()
        );
    }

    function getTable(uint256 _tableId) external view returns (Table memory) {
        return tables[_tableId];
    }

    function getTablePlayers(
        uint256 _tableId
    ) external view returns (address[] memory) {
        return tablePlayerOrder[_tableId];
    }

    function getPlayerData(
        uint256 _tableId,
        address _player
    ) external view returns (Player memory) {
        return tablePlayerData[_tableId][_player];
    }

    function getCurrentPlayer(
        uint256 _tableId
    ) external view returns (address) {
        Table storage table = tables[_tableId];
        if (
            table.status != TableStatus.InProgress &&
            table.status != TableStatus.WaitingRandom
        ) {
            return address(0);
        }
        address[] storage players = tablePlayerOrder[_tableId];
        if (players.length == 0) return address(0);
        return players[table.currentPlayerIndex];
    }
}
