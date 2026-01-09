// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { CFTRoulette } from "./Roulette.sol";
import { Test } from "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// Import custom errors from Roulette.sol
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

// Mock ERC20 token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6; // USDC has 6 decimals
    }
}

// Mock VRF Coordinator for testing
contract MockVRFCoordinator is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public requestIdToConsumer;
    
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata /* req */
    ) external override returns (uint256 requestId) {
        requestId = nextRequestId++;
        requestIdToConsumer[requestId] = msg.sender;
        return requestId;
    }
    
    // Mock function to fulfill randomness for testing
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address consumer = requestIdToConsumer[requestId];
        require(consumer != address(0), "Request not found");
        
        // Call the consumer's fulfillRandomWords
        (bool success,) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(success, "Fulfillment failed");
    }
    
    // Stub implementations for other IVRFCoordinatorV2Plus functions
    function getSubscription(uint256) external pure override returns (
        uint96 balance,
        uint96 nativeBalance,
        uint64 reqCount,
        address subOwner,
        address[] memory consumers
    ) {
        consumers = new address[](0);
        return (0, 0, 0, address(0), consumers);
    }
    
    function requestSubscriptionOwnerTransfer(uint256, address) external pure override {
        revert("Not implemented");
    }
    
    function acceptSubscriptionOwnerTransfer(uint256) external pure override {
        revert("Not implemented");
    }
    
    function addConsumer(uint256, address) external pure override {
        revert("Not implemented");
    }
    
    function removeConsumer(uint256, address) external pure override {
        revert("Not implemented");
    }
    
    function cancelSubscription(uint256, address) external pure override {
        revert("Not implemented");
    }
    
    function pendingRequestExists(uint256) external pure override returns (bool) {
        return false;
    }
    
    function createSubscription() external pure override returns (uint256) {
        revert("Not implemented");
    }
    
    function getActiveSubscriptionIds(uint256, uint256) external pure override returns (uint256[] memory) {
        return new uint256[](0);
    }
    
    function fundSubscriptionWithNative(uint256) external payable override {
        revert("Not implemented");
    }
}

contract CFTRouletteTest is Test {
    CFTRoulette public roulette;
    MockUSDC public usdc;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner;
    address public feeCollector;
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    
    // Test constants
    bytes32 constant KEY_HASH = bytes32(uint256(1));
    uint256 constant SUBSCRIPTION_ID = 1;
    uint256 constant MIN_BET = 1e6; // 1 USDC (6 decimals)
    uint256 constant MAX_BET = 1000e6; // 1000 USDC
    uint32 constant CALLBACK_GAS_LIMIT = 500000;
    uint32 constant FEE_BPS = 200; // 2%
    
    // Events for testing
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
    
    function setUp() public {
        owner = address(this);
        feeCollector = makeAddr("feeCollector");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        user4 = makeAddr("user4");
        
        // Deploy mocks
        usdc = new MockUSDC();
        vrfCoordinator = new MockVRFCoordinator();
        
        // Deploy roulette contract
        roulette = new CFTRoulette(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MIN_BET,
            MAX_BET,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Mint USDC to test users
        usdc.mint(user1, 10000e6); // 10000 USDC
        usdc.mint(user2, 10000e6);
        usdc.mint(user3, 10000e6);
        usdc.mint(user4, 10000e6);
        
        // Approve roulette contract to spend USDC
        vm.prank(user1);
        usdc.approve(address(roulette), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(roulette), type(uint256).max);
        
        vm.prank(user3);
        usdc.approve(address(roulette), type(uint256).max);
        
        vm.prank(user4);
        usdc.approve(address(roulette), type(uint256).max);
    }
    
    // ============ Initial State Tests ============
    
    function test_InitialState() public view {
        assertEq(address(roulette.usdc()), address(usdc));
        assertEq(address(roulette.COORDINATOR()), address(vrfCoordinator));
        assertEq(roulette.subscriptionId(), SUBSCRIPTION_ID);
        assertEq(roulette.keyHash(), KEY_HASH);
        assertEq(roulette.minBetAmount(), MIN_BET);
        assertEq(roulette.maxBetAmount(), MAX_BET);
        assertEq(roulette.feeCollector(), feeCollector);
        assertEq(roulette.feeBps(), FEE_BPS);
        assertEq(roulette.callbackGasLimit(), CALLBACK_GAS_LIMIT);
        assertEq(roulette.nextTableId(), 1);
        assertFalse(roulette.paused());
    }
    
    function test_ConstructorValidations() public {
        // Invalid USDC address
        vm.expectRevert("Invalid usdc address");
        new CFTRoulette(
            address(0),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MIN_BET,
            MAX_BET,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid VRF coordinator
        vm.expectRevert();
        new CFTRoulette(
            address(usdc),
            address(0),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MIN_BET,
            MAX_BET,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid min bet amount
        vm.expectRevert("Invalid min bet amount");
        new CFTRoulette(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            0,
            MAX_BET,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Max bet less than min bet
        vm.expectRevert("Max bet must be >= min bet");
        new CFTRoulette(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MAX_BET,
            MIN_BET,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid callback gas limit
        vm.expectRevert("Invalid callback gas limit");
        new CFTRoulette(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MIN_BET,
            MAX_BET,
            feeCollector,
            FEE_BPS,
            0
        );
        
        // Fee too high
        vm.expectRevert("Fee bps too high");
        new CFTRoulette(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            MIN_BET,
            MAX_BET,
            feeCollector,
            10001,
            CALLBACK_GAS_LIMIT
        );
    }
    
    // ============ Table Creation Tests ============
    
    function test_CreateTable() public {
        uint256 betAmount = 10e6; // 10 USDC
        uint256 maxIncrement = 5e6; // 5 USDC
        uint8 maxPlayers = 4;
        
        vm.expectEmit(true, true, false, true);
        emit TableCreated(1, user1, betAmount, maxIncrement, maxPlayers);
        
        vm.expectEmit(true, true, false, false);
        emit PlayerJoined(1, user1);
        
        vm.prank(user1);
        roulette.createTable(betAmount, maxIncrement, maxPlayers);
        
        // Check table was created correctly
        (
            uint256 id,
            address creator,
            CFTRoulette.TableStatus status,
            uint256 tableBetAmount,
            uint256 tableMaxIncrement,
            uint256 totalPool,
            uint8 tableMaxPlayers,
            ,,,,,,,
        ) = roulette.tables(1);
        
        assertEq(id, 1);
        assertEq(creator, user1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.Open));
        assertEq(tableBetAmount, betAmount);
        assertEq(tableMaxIncrement, maxIncrement);
        assertEq(totalPool, 0);
        assertEq(tableMaxPlayers, maxPlayers);
        
        // Check creator is in player list
        address[] memory players = roulette.getTablePlayers(1);
        assertEq(players.length, 1);
        assertEq(players[0], user1);
        
        // Check player data
        (address addr, CFTRoulette.PlayerStatus playerStatus, uint256 playedAmount, uint8 position) = 
            roulette.tablePlayerData(1, user1);
        assertEq(addr, user1);
        assertEq(uint256(playerStatus), uint256(CFTRoulette.PlayerStatus.Waiting));
        assertEq(playedAmount, 0);
        assertEq(position, 0);
    }
    
    function test_CreateTableInvalidBetAmount() public {
        vm.startPrank(user1);
        
        // Below min
        vm.expectRevert(InvalidBetAmount.selector);
        roulette.createTable(MIN_BET - 1, 0, 4);
        
        // Above max
        vm.expectRevert(InvalidBetAmount.selector);
        roulette.createTable(MAX_BET + 1, 0, 4);
        
        vm.stopPrank();
    }
    
    function test_CreateTableInvalidMaxPlayers() public {
        vm.startPrank(user1);
        
        // Less than 2
        vm.expectRevert(InvalidMaxPlayers.selector);
        roulette.createTable(MIN_BET, 0, 1);
        
        // More than 10
        vm.expectRevert(InvalidMaxPlayers.selector);
        roulette.createTable(MIN_BET, 0, 11);
        
        vm.stopPrank();
    }
    
    function test_CreateTableWhenPaused() public {
        roulette.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        roulette.createTable(MIN_BET, 0, 4);
    }
    
    // ============ Join Table Tests ============
    
    function test_JoinTable() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.expectEmit(true, true, false, false);
        emit PlayerJoined(1, user2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        address[] memory players = roulette.getTablePlayers(1);
        assertEq(players.length, 2);
        assertEq(players[1], user2);
        
        (address addr, , , uint8 position) = roulette.tablePlayerData(1, user2);
        assertEq(addr, user2);
        assertEq(position, 1);
    }
    
    function test_JoinTableMultiplePlayers() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        address[] memory players = roulette.getTablePlayers(1);
        assertEq(players.length, 3);
        assertEq(players[0], user1);
        assertEq(players[1], user2);
        assertEq(players[2], user3);
    }
    
    function test_JoinTableNotFound() public {
        vm.prank(user1);
        vm.expectRevert(TableNotFound.selector);
        roulette.joinTable(999);
    }
    
    function test_JoinTableAlreadyInTable() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user1);
        vm.expectRevert(AlreadyInTable.selector);
        roulette.joinTable(1);
    }
    
    function test_JoinTableFull() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        vm.expectRevert(TableFull.selector);
        roulette.joinTable(1);
    }
    
    function test_JoinTableNotOpen() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        // Mark both players ready to start game
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // Try to join in-progress game
        vm.prank(user3);
        vm.expectRevert(TableNotOpen.selector);
        roulette.joinTable(1);
    }
    
    // ============ Leave Table Tests ============
    
    function test_LeaveTableBeforeGameStart() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        vm.expectEmit(true, true, false, false);
        emit PlayerLeft(1, user2);
        
        vm.prank(user2);
        roulette.leaveTable(1);
        
        address[] memory players = roulette.getTablePlayers(1);
        assertEq(players.length, 2);
        assertEq(players[0], user1);
        assertEq(players[1], user3);
        
        // Check user2 data is deleted
        (address addr, , , ) = roulette.tablePlayerData(1, user2);
        assertEq(addr, address(0));
    }
    
    function test_LeaveTableDeletesTableIfEmpty() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user1);
        roulette.leaveTable(1);
        
        // Table should be deleted
        (uint256 id, , , , , , , , , , , , , , ) = roulette.tables(1);
        assertEq(id, 0);
    }
    
    function test_LeaveTableNotInTable() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user2);
        vm.expectRevert(NotInTable.selector);
        roulette.leaveTable(1);
    }
    
    // ============ Mark Player Ready Tests ============
    
    function test_MarkPlayerReady() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.expectEmit(true, true, false, false);
        emit PlayerReady(1, user1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        (, CFTRoulette.PlayerStatus status, , ) = roulette.tablePlayerData(1, user1);
        assertEq(uint256(status), uint256(CFTRoulette.PlayerStatus.Playing));
    }
    
    function test_MarkPlayerReadyStartsGame() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.expectEmit(true, false, false, false);
        emit GameStarted(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        (, , CFTRoulette.TableStatus status, , , , , , , , , , , , ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.InProgress));
    }
    
    function test_MarkPlayerReadyNotEnoughPlayers() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user1);
        vm.expectRevert(NotEnoughPlayers.selector);
        roulette.markPlayerReady(1);
    }
    
    // ============ Play Turn Tests ============
    
    function test_PlayTurn() public {
        // Setup table with 2 players
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        uint256 betAmount = 10e6;
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        
        vm.expectEmit(true, true, false, false);
        emit TurnPlayed(1, user1, betAmount, 5, 0); // turnNumber 0
        
        vm.expectEmit(true, false, false, false);
        emit RandomnessRequested(1, 1, 0); // turnNumber 0
        
        vm.prank(user1);
        roulette.playTurn(1, betAmount, 5);
        
        // Check USDC was transferred
        assertEq(usdc.balanceOf(user1), user1BalanceBefore - betAmount);
        
        // Check table state
        (, , CFTRoulette.TableStatus status, , , uint256 totalPool, , , , , , , , , ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.WaitingRandom));
        assertEq(totalPool, betAmount);
        
        // Check player played amount
        (, , uint256 playedAmount, ) = roulette.tablePlayerData(1, user1);
        assertEq(playedAmount, betAmount);
    }
    
    function test_PlayTurnInvalidBetAmountTooLow() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        vm.expectRevert(InvalidBetAmount.selector);
        roulette.playTurn(1, 9e6, 5); // Less than table bet
    }
    
    function test_PlayTurnInvalidBetAmountTooHigh() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        vm.expectRevert(InvalidBetAmount.selector);
        roulette.playTurn(1, 16e6, 5); // More than betAmount + maxIncrement
    }
    
    function test_PlayTurnNotPlayerTurn() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // user2 tries to play but it's user1's turn
        vm.prank(user2);
        vm.expectRevert(NotPlayerTurn.selector);
        roulette.playTurn(1, 10e6, 5);
    }
    
    function test_PlayTurnNoMaxIncrement() public {
        vm.prank(user1);
        roulette.createTable(10e6, 0, 2); // maxIncrement = 0 means no limit
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // Should allow any bet >= betAmount
        vm.prank(user1);
        roulette.playTurn(1, 100e6, 5); // Much higher than initial bet
        
        (, , , , , uint256 totalPool, , , , , , , , , ) = roulette.tables(1);
        assertEq(totalPool, 100e6);
    }
    
    function test_PlayTurnInvalidPlayerRandom() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // Try to play with playerRandom > 9
        vm.prank(user1);
        vm.expectRevert(InvalidAmount.selector);
        roulette.playTurn(1, 10e6, 10);
        
        vm.prank(user1);
        vm.expectRevert(InvalidAmount.selector);
        roulette.playTurn(1, 10e6, 100);
    }
    
    // ============ VRF and Elimination Tests ============
    
    function test_FulfillRandomWordsPlayerSurvives() public {
        // Setup and play turn
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        // Get player random
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        
        // Fulfill with different random
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = (playerRandom + 1) % 10; // Different number
        
        vm.expectEmit(true, false, false, true);
        emit RandomWordsFulfilled(1, randomWords[0] % 10, 0); // turnNumber 0
        
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Check game continues
        (, , CFTRoulette.TableStatus status, , , , , uint8 currentPlayerIndex, , , , , , , ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.InProgress));
        assertEq(currentPlayerIndex, 1); // Moved to user2
        
        // Check user1 still alive
        (, CFTRoulette.PlayerStatus playerStatus, , ) = roulette.tablePlayerData(1, user1);
        assertEq(uint256(playerStatus), uint256(CFTRoulette.PlayerStatus.Playing));
    }
    
    function test_FulfillRandomWordsPlayerEliminated() public {
        // Setup and play turn
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 3);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user3);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        // Get player random
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        
        // Fulfill with same random (elimination)
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        
        vm.expectEmit(true, true, false, false);
        emit PlayerEliminated(1, user1);
        
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Check user1 is dead
        (, CFTRoulette.PlayerStatus playerStatus, , ) = roulette.tablePlayerData(1, user1);
        assertEq(uint256(playerStatus), uint256(CFTRoulette.PlayerStatus.Dead));
        
        // Check game continues with next player
        (, , CFTRoulette.TableStatus status, , , , , uint8 currentPlayerIndex, , , , , , , ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.InProgress));
        assertEq(currentPlayerIndex, 1); // user2
    }
    
    function test_GameEndsWithWinner() public {
        // Setup 2 player game
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // User1 plays
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        // Get player random and eliminate user1
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        
        vm.expectEmit(true, false, false, false);
        emit GameFinished(1, user2, 10e6);
        
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Check game finished with user2 as winner
        (, , CFTRoulette.TableStatus status, , , , , , , , , , , address winner, ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.Finished));
        assertEq(winner, user2);
    }
    
    // ============ Claim Winnings Tests ============
    
    function test_ClaimWinnings() public {
        // Play game to completion
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        // Eliminate user1
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // user2 claims winnings
        uint256 totalPot = 10e6;
        uint256 feeAmount = (totalPot * FEE_BPS) / 10000;
        uint256 expectedPayout = totalPot - feeAmount;
        
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.expectEmit(true, true, false, true);
        emit PayoutClaimed(1, user2, expectedPayout, false);
        
        vm.prank(user2);
        roulette.claimWinnings(1);
        
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + expectedPayout);
        
        // Check payout claimed flag
        (, , , , , , , , , , , , , , bool payoutClaimed) = roulette.tables(1);
        assertTrue(payoutClaimed);
        
        // Check fees collected
        assertEq(roulette.getFeePool(), feeAmount);
    }
    
    function test_ClaimWinningsNotWinner() public {
        // Setup completed game
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // user1 tries to claim but lost
        vm.prank(user1);
        vm.expectRevert(NotWinner.selector);
        roulette.claimWinnings(1);
    }
    
    function test_ClaimWinningsAlreadyClaimed() public {
        // Setup and claim once
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        vm.prank(user2);
        roulette.claimWinnings(1);
        
        // Try to claim again
        vm.prank(user2);
        vm.expectRevert(AlreadyClaimed.selector);
        roulette.claimWinnings(1);
    }
    
    function test_ClaimWinningsNotFinished() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user1);
        vm.expectRevert(TableNotFinished.selector);
        roulette.claimWinnings(1);
    }
    
    // ============ Refund Tests ============
    
    function test_ClaimRefundAfterVRFTimeout() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        // Fast forward past VRF timeout
        vm.warp(block.timestamp + roulette.VRF_TIMEOUT() + 1);
        
        vm.expectEmit(true, false, false, true);
        emit TableCancelled(1, "VRF timeout");
        
        roulette.cancelTableAfterTimeout(1);
        
        // Check table is finished with no winner
        (, , CFTRoulette.TableStatus status, , , , , , , , , , , address winner, ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.Finished));
        assertEq(winner, address(0));
        
        // Claim refund
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        
        vm.expectEmit(true, true, false, true);
        emit PayoutClaimed(1, user1, 10e6, true);
        
        vm.prank(user1);
        roulette.claimRefund(1);
        
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + 10e6);
    }
    
    function test_ClaimRefundNoPlayedAmount() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        vm.warp(block.timestamp + roulette.VRF_TIMEOUT() + 1);
        roulette.cancelTableAfterTimeout(1);
        
        // user2 never played, has no refund
        vm.prank(user2);
        vm.expectRevert(NoRefundAvailable.selector);
        roulette.claimRefund(1);
    }
    
    function test_ClaimRefundWinnerExists() public {
        // Complete game with winner
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Try to claim refund when there's a winner
        vm.prank(user1);
        vm.expectRevert(NoRefundAvailable.selector);
        roulette.claimRefund(1);
    }
    
    // ============ Timeout Tests ============
    
    function test_EliminateInactivePlayer() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 3);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user3);
        roulette.markPlayerReady(1);
        
        // Fast forward past turn timeout
        vm.warp(block.timestamp + roulette.TURN_TIMEOUT() + 1);
        
        vm.expectEmit(true, true, true, false);
        emit PlayerTimedOut(1, user1, user2);
        
        vm.expectEmit(true, true, false, false);
        emit PlayerEliminated(1, user1);
        
        vm.prank(user2);
        roulette.eliminateInactivePlayer(1);
        
        // Check user1 is dead
        (, CFTRoulette.PlayerStatus status, , ) = roulette.tablePlayerData(1, user1);
        assertEq(uint256(status), uint256(CFTRoulette.PlayerStatus.Dead));
        
        // Check turn moved to user2
        (, , , , , , , uint8 currentPlayerIndex, , , , , , , ) = roulette.tables(1);
        assertEq(currentPlayerIndex, 1);
    }
    
    function test_EliminateInactivePlayerTimeoutNotReached() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        vm.expectRevert(TurnTimeoutNotReached.selector);
        roulette.eliminateInactivePlayer(1);
    }
    
    // ============ Admin Functions Tests ============
    
    function test_SetMinBetAmount() public {
        uint256 newMinBet = 5e6;
        
        vm.expectEmit(false, false, false, true);
        emit MinBetAmountUpdated(newMinBet);
        
        roulette.setMinBetAmount(newMinBet);
        
        assertEq(roulette.minBetAmount(), newMinBet);
    }
    
    function test_SetMinBetAmountInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        roulette.setMinBetAmount(0);
        
        vm.expectRevert(InvalidAmount.selector);
        roulette.setMinBetAmount(MAX_BET + 1);
    }
    
    function test_SetMaxBetAmount() public {
        uint256 newMaxBet = 2000e6;
        
        vm.expectEmit(false, false, false, true);
        emit MaxBetAmountUpdated(newMaxBet);
        
        roulette.setMaxBetAmount(newMaxBet);
        
        assertEq(roulette.maxBetAmount(), newMaxBet);
    }
    
    function test_SetMaxBetAmountInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        roulette.setMaxBetAmount(MIN_BET - 1);
    }
    
    function test_SetFeeConfig() public {
        address newCollector = makeAddr("newCollector");
        uint32 newFeeBps = 300;
        
        vm.expectEmit(false, false, false, true);
        emit FeeConfigUpdated(newCollector, newFeeBps);
        
        roulette.setFeeConfig(newCollector, newFeeBps);
        
        assertEq(roulette.feeCollector(), newCollector);
        assertEq(roulette.feeBps(), newFeeBps);
    }
    
    function test_SetFeeConfigTooHigh() public {
        vm.expectRevert(FeeTooHigh.selector);
        roulette.setFeeConfig(feeCollector, 10001);
    }
    
    function test_SetCallbackGasLimit() public {
        uint32 newLimit = 600000;
        
        vm.expectEmit(false, false, false, true);
        emit CallbackGasLimitUpdated(newLimit);
        
        roulette.setCallbackGasLimit(newLimit);
        
        assertEq(roulette.callbackGasLimit(), newLimit);
    }
    
    function test_SetCallbackGasLimitInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        roulette.setCallbackGasLimit(0);
    }
    
    function test_WithdrawCollectedFees() public {
        // Generate fees by completing a game
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 5);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        vm.prank(user2);
        roulette.claimWinnings(1);
        
        uint256 expectedFees = (10e6 * FEE_BPS) / 10000;
        uint256 collectorBalanceBefore = usdc.balanceOf(feeCollector);
        
        vm.expectEmit(true, false, false, true);
        emit FeesWithdrawn(feeCollector, expectedFees);
        
        roulette.withdrawCollectedFees();
        
        assertEq(usdc.balanceOf(feeCollector), collectorBalanceBefore + expectedFees);
        assertEq(roulette.getFeePool(), 0);
    }
    
    function test_WithdrawCollectedFeesNoCollector() public {
        roulette.setFeeConfig(address(0), 0);
        
        vm.expectRevert(NoFeeCollectorSet.selector);
        roulette.withdrawCollectedFees();
    }
    
    function test_PauseUnpause() public {
        vm.expectEmit(false, false, false, false);
        emit ContractPaused();
        
        roulette.pause();
        assertTrue(roulette.paused());
        
        vm.expectEmit(false, false, false, false);
        emit ContractUnpaused();
        
        roulette.unpause();
        assertFalse(roulette.paused());
    }
    
    function test_OnlyOwnerFunctions() public {
        vm.startPrank(user1);
        
        vm.expectRevert();
        roulette.setMinBetAmount(5e6);
        
        vm.expectRevert();
        roulette.setMaxBetAmount(2000e6);
        
        vm.expectRevert();
        roulette.setFeeConfig(feeCollector, 300);
        
        vm.expectRevert();
        roulette.setVRFConfig(KEY_HASH, SUBSCRIPTION_ID, 3);
        
        vm.expectRevert();
        roulette.setCallbackGasLimit(600000);
        
        vm.expectRevert();
        roulette.withdrawCollectedFees();
        
        vm.expectRevert();
        roulette.getFeePool();
        
        vm.expectRevert();
        roulette.pause();
        
        vm.expectRevert();
        roulette.unpause();
        
        vm.stopPrank();
    }
    
    // ============ View Functions Tests ============
    
    function test_GetMetadata() public view {
        (
            uint256 nextTableId,
            uint256 minBetAmount,
            uint256 maxBetAmount,
            uint32 callbackGasLimit,
            uint32 feeBps,
            bool isPaused
        ) = roulette.getMetadata();
        
        assertEq(nextTableId, 1);
        assertEq(minBetAmount, MIN_BET);
        assertEq(maxBetAmount, MAX_BET);
        assertEq(callbackGasLimit, CALLBACK_GAS_LIMIT);
        assertEq(feeBps, FEE_BPS);
        assertFalse(isPaused);
    }
    
    function test_GetTable() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        CFTRoulette.Table memory table = roulette.getTable(1);
        
        assertEq(table.id, 1);
        assertEq(table.creator, user1);
        assertEq(uint256(table.status), uint256(CFTRoulette.TableStatus.Open));
        assertEq(table.betAmount, 10e6);
        assertEq(table.maxIncrement, 5e6);
        assertEq(table.totalPool, 0);
        assertEq(table.maxPlayers, 4);
    }
    
    function test_GetTablePlayers() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        address[] memory players = roulette.getTablePlayers(1);
        
        assertEq(players.length, 3);
        assertEq(players[0], user1);
        assertEq(players[1], user2);
        assertEq(players[2], user3);
    }
    
    function test_GetPlayerData() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        
        CFTRoulette.Player memory player = roulette.getPlayerData(1, user1);
        
        assertEq(player.addr, user1);
        assertEq(uint256(player.status), uint256(CFTRoulette.PlayerStatus.Waiting));
        assertEq(player.playedAmount, 0);
        assertEq(player.position, 0);
    }
    
    function test_GetCurrentPlayer() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        address currentPlayer = roulette.getCurrentPlayer(1);
        assertEq(currentPlayer, user1);
    }
    
    // ============ Complete Game Flow Test ============
    
    function test_CompleteGameFlow() public {
        // 1. Create table
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 3);
        
        // 2. Players join
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user3);
        roulette.joinTable(1);
        
        // 3. Players mark ready
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user3);
        roulette.markPlayerReady(1);
        
        // 4. Play multiple turns until someone wins
        // Turn 1: user1 plays and survives
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 3);
        
        (, , , , , , , , , , uint256 playerRandom1, , , , ) = roulette.tables(1);
        uint256[] memory randomWords1 = new uint256[](1);
        randomWords1[0] = (playerRandom1 + 1) % 10; // Different, survives
        vrfCoordinator.fulfillRandomWords(1, randomWords1);
        
        // Turn 2: user2 plays and survives
        vm.prank(user2);
        roulette.playTurn(1, 10e6, 4);
        
        (, , , , , , , , , , uint256 playerRandom2, , , , ) = roulette.tables(1);
        uint256[] memory randomWords2 = new uint256[](1);
        randomWords2[0] = (playerRandom2 + 1) % 10; // Different, survives
        vrfCoordinator.fulfillRandomWords(2, randomWords2);
        
        // Turn 3: user3 plays and gets eliminated
        vm.prank(user3);
        roulette.playTurn(1, 10e6, 7);
        
        (, , , , , , , , , , uint256 playerRandom3, , , , ) = roulette.tables(1);
        uint256[] memory randomWords3 = new uint256[](1);
        randomWords3[0] = playerRandom3; // Same, eliminated
        vrfCoordinator.fulfillRandomWords(3, randomWords3);
        
        // Turn 4: user1 plays and gets eliminated, user2 wins
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 2);
        
        (, , , , , , , , , , uint256 playerRandom4, , , , ) = roulette.tables(1);
        uint256[] memory randomWords4 = new uint256[](1);
        randomWords4[0] = playerRandom4; // Same, eliminated
        vrfCoordinator.fulfillRandomWords(4, randomWords4);
        
        // 5. Check game finished with user2 as winner
        (, , CFTRoulette.TableStatus status, , , uint256 totalPool, , , , , , , , address winner, ) = roulette.tables(1);
        assertEq(uint256(status), uint256(CFTRoulette.TableStatus.Finished));
        assertEq(winner, user2);
        assertEq(totalPool, 40e6); // 4 turns * 10 USDC
        
        // 6. Winner claims
        uint256 totalAmount = 40e6;
        uint256 feeAmount = (totalAmount * uint256(FEE_BPS)) / 10000;
        uint256 expectedPayout = totalAmount - feeAmount;
        
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.prank(user2);
        roulette.claimWinnings(1);
        
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + expectedPayout);
    }
    
    // ============ Edge Cases ============
    
    function test_ZeroFeeConfig() public {
        roulette.setFeeConfig(address(0), 0);
        
        // Play game
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        vm.prank(user1);
        roulette.playTurn(1, 10e6, 6);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = playerRandom;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Winner gets full pot
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.prank(user2);
        roulette.claimWinnings(1);
        
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + 10e6);
        assertEq(roulette.getFeePool(), 0);
    }
    
    function test_MaxPlayers() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 10);
        
        // Create 9 more users to fill the table
        for (uint i = 2; i <= 10; i++) {
            address user = address(uint160(1000 + i));
            usdc.mint(user, 1000e6);
            vm.prank(user);
            usdc.approve(address(roulette), type(uint256).max);
            vm.prank(user);
            roulette.joinTable(1);
        }
        
        address[] memory players = roulette.getTablePlayers(1);
        assertEq(players.length, 10);
    }
    
    // ============ Kick Player Tests ============
    
    function test_KickPlayer() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // User2 joins
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        // Owner kicks user2
        vm.expectEmit(true, true, true, true);
        emit PlayerKicked(tableId, user2, owner);
        roulette.kickPlayer(tableId, user2);
        
        // Verify user2 is removed
        address[] memory players = roulette.getTablePlayers(tableId);
        assertEq(players.length, 1);
        assertEq(players[0], user1);
        
        // Verify user2 data is deleted
        CFTRoulette.Player memory player = roulette.getPlayerData(tableId, user2);
        assertEq(player.addr, address(0));
    }
    
    function test_KickPlayerCreator() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // User2 joins
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        // Owner can kick creator (user1)
        vm.expectEmit(true, true, true, true);
        emit PlayerKicked(tableId, user1, owner);
        roulette.kickPlayer(tableId, user1);
        
        // Verify user1 is removed and user2 is now at position 0
        address[] memory players = roulette.getTablePlayers(tableId);
        assertEq(players.length, 1);
        assertEq(players[0], user2);
        
        CFTRoulette.Player memory player2 = roulette.getPlayerData(tableId, user2);
        assertEq(player2.position, 0);
    }
    
    function test_KickPlayerDeletesTableIfEmpty() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // Owner kicks user1 (only player)
        roulette.kickPlayer(tableId, user1);
        
        // Verify table is deleted
        CFTRoulette.Table memory table = roulette.getTable(tableId);
        assertEq(table.id, 0);
        
        address[] memory players = roulette.getTablePlayers(tableId);
        assertEq(players.length, 0);
    }
    
    function test_KickPlayerNotInTable() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // Try to kick user2 who never joined
        vm.expectRevert(NotInTable.selector);
        roulette.kickPlayer(tableId, user2);
    }
    
    function test_KickPlayerAlreadyReady() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // User2 joins
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        // User2 marks ready
        vm.prank(user2);
        roulette.markPlayerReady(tableId);
        
        // Try to kick user2 who is ready
        vm.expectRevert(PlayerAlreadyReady.selector);
        roulette.kickPlayer(tableId, user2);
    }
    
    function test_KickPlayerTableNotOpen() public {
        // Create table and start game
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        vm.prank(user1);
        roulette.markPlayerReady(tableId);
        
        vm.prank(user2);
        roulette.markPlayerReady(tableId);
        
        // Try to kick after game started
        vm.expectRevert(TableNotOpen.selector);
        roulette.kickPlayer(tableId, user1);
    }
    
    function test_KickPlayerTableNotFound() public {
        vm.expectRevert(TableNotFound.selector);
        roulette.kickPlayer(999, user1);
    }
    
    function test_KickPlayerOnlyOwner() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // User2 joins
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        // User1 tries to kick (not owner)
        vm.prank(user1);
        vm.expectRevert();
        roulette.kickPlayer(tableId, user2);
    }
    
    function test_KickMultiplePlayers() public {
        // Create table with user1
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 4);
        uint256 tableId = 1;
        
        // Users join
        vm.prank(user2);
        roulette.joinTable(tableId);
        
        vm.prank(user3);
        roulette.joinTable(tableId);
        
        vm.prank(user4);
        roulette.joinTable(tableId);
        
        // Kick user2
        roulette.kickPlayer(tableId, user2);
        
        // Kick user3
        roulette.kickPlayer(tableId, user3);
        
        // Verify only user1 and user4 remain
        address[] memory players = roulette.getTablePlayers(tableId);
        assertEq(players.length, 2);
        
        // Check positions are updated
        CFTRoulette.Player memory player1 = roulette.getPlayerData(tableId, user1);
        CFTRoulette.Player memory player4 = roulette.getPlayerData(tableId, user4);
        assertEq(player1.position, 0);
        assertEq(player4.position, 1);
    }
    
    function test_IncreaseBetAmount() public {
        vm.prank(user1);
        roulette.createTable(10e6, 5e6, 2);
        
        vm.prank(user2);
        roulette.joinTable(1);
        
        vm.prank(user1);
        roulette.markPlayerReady(1);
        
        vm.prank(user2);
        roulette.markPlayerReady(1);
        
        // User1 bets 15 USDC (10 + 5)
        vm.prank(user1);
        roulette.playTurn(1, 15e6, 8);
        
        (, , , , , , , , , , uint256 playerRandom, , , , ) = roulette.tables(1);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = (playerRandom + 1) % 10;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Check new bet amount is updated
        (, , , uint256 newBetAmount, , , , , , , , , , , ) = roulette.tables(1);
        assertEq(newBetAmount, 15e6);
        
        // User2 must bet at least 15 USDC now
        vm.prank(user2);
        vm.expectRevert(InvalidBetAmount.selector);
        roulette.playTurn(1, 14e6, 1);
        
        vm.prank(user2);
        roulette.playTurn(1, 15e6, 9); // This should work
    }
}
