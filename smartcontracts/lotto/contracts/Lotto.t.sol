// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { CFTLotto } from "./Lotto.sol";
import { Test } from "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// Import custom errors from Lotto.sol
error PreviousDrawNotCompleted();
error InvalidAmount();
error InvalidCount();
error DrawNotOpen();
error DrawAlreadyClosed();
error DrawMinDurationNotMet();
error InvalidAddress();
error VRFTimeoutNotReached();
error DrawNotClosed();
error FeeTooHigh();
error NoFeeCollectorSet();
error NotWinner();
error AlreadyClaimed();
error WinnerNotChosen();

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
        VRFV2PlusClient.RandomWordsRequest calldata req
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

contract CFTLottoTest is Test {
    CFTLotto public lotto;
    MockUSDC public usdc;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner;
    address public feeCollector;
    address public user1;
    address public user2;
    address public user3;
    
    // Test constants
    bytes32 constant KEY_HASH = bytes32(uint256(1));
    uint256 constant SUBSCRIPTION_ID = 1;
    uint256 constant TICKET_PRICE = 1e6; // 1 USDC (6 decimals)
    uint32 constant MAX_TICKET_AMOUNT = 100;
    uint32 constant MIN_ROUND_DURATION = 60; // 60 seconds
    uint32 constant CALLBACK_GAS_LIMIT = 500000;
    uint32 constant FEE_BPS = 200; // 2%
    
    // Events for testing
    event DrawStarted(uint256 indexed drawId, uint256 ticketPrice);
    event TicketsPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount);
    event DrawClosed(uint256 indexed drawId);
    event RandomnessRequested(uint256 indexed drawId, uint256 requestId);
    event WinnerSelected(uint256 indexed drawId, address winner, uint256 prize);
    event WinningsClaimed(uint256 indexed drawId, address winner, uint256 amount);
    event ContractPaused();
    event ContractUnpaused();
    event TicketPriceUpdated(uint256 newPrice);
    event MaxTicketAmountUpdated(uint32 newMaxAmount);
    event MinRoundDurationSecondsUpdated(uint32 newMinRoundDurationSeconds);
    event CallbackGasLimitUpdated(uint32 newCallbackGasLimit);
    event DrawCancelled(uint256 indexed drawId, string reason);
    event RefundClaimed(uint256 indexed drawId, address indexed user, uint256 amount);
    event FeeConfigUpdated(address collector, uint32 feeBps);
    event FeesWithdrawn(address indexed collector, uint256 amount);
    
    function setUp() public {
        owner = address(this);
        feeCollector = makeAddr("feeCollector");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // Deploy mocks
        usdc = new MockUSDC();
        vrfCoordinator = new MockVRFCoordinator();
        
        // Deploy lotto contract
        lotto = new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Mint USDC to test users
        usdc.mint(user1, 1000e6); // 1000 USDC
        usdc.mint(user2, 1000e6);
        usdc.mint(user3, 1000e6);
        
        // Approve lotto contract to spend USDC
        vm.prank(user1);
        usdc.approve(address(lotto), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(lotto), type(uint256).max);
        
        vm.prank(user3);
        usdc.approve(address(lotto), type(uint256).max);
    }
    
    // ============ Initial State Tests ============
    
    function test_InitialState() public view {
        assertEq(address(lotto.usdc()), address(usdc));
        assertEq(address(lotto.COORDINATOR()), address(vrfCoordinator));
        assertEq(lotto.subscriptionId(), SUBSCRIPTION_ID);
        assertEq(lotto.keyHash(), KEY_HASH);
        assertEq(lotto.ticketPrice(), TICKET_PRICE);
        assertEq(lotto.maxTicketAmount(), MAX_TICKET_AMOUNT);
        assertEq(lotto.minRoundDurationSeconds(), MIN_ROUND_DURATION);
        assertEq(lotto.feeCollector(), feeCollector);
        assertEq(lotto.feeBps(), FEE_BPS);
        assertEq(lotto.callbackGasLimit(), CALLBACK_GAS_LIMIT);
        assertEq(lotto.currentDrawId(), 1);
        assertFalse(lotto.paused());
        
        // Check first draw was created
        (
            uint256 id,
            uint256 startTime,
            uint256 ticketPrice,
            uint256 potSize,
            uint256 ticketCount,
            bool open,
            bool winnerChosen,
            address winner,
            bool claimed
        ) = lotto.draws(1);
        
        assertEq(id, 1);
        assertEq(startTime, block.timestamp);
        assertEq(ticketPrice, TICKET_PRICE);
        assertEq(potSize, 0);
        assertEq(ticketCount, 0);
        assertTrue(open);
        assertFalse(winnerChosen);
        assertEq(winner, address(0));
        assertFalse(claimed);
    }
    
    function test_ConstructorValidations() public {
        // Invalid USDC address
        vm.expectRevert("Invalid usdc address");
        new CFTLotto(
            address(0),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid VRF coordinator - VRFConsumerBaseV2Plus throws ZeroAddress error
        vm.expectRevert();
        new CFTLotto(
            address(usdc),
            address(0),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid ticket price
        vm.expectRevert("Invalid ticket price");
        new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            0,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid max ticket amount
        vm.expectRevert("Invalid max ticket amount");
        new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            0,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid min round duration
        vm.expectRevert("Invalid minimum round duration");
        new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            0,
            feeCollector,
            FEE_BPS,
            CALLBACK_GAS_LIMIT
        );
        
        // Invalid callback gas limit
        vm.expectRevert("Invalid callback gas limit");
        new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            FEE_BPS,
            0
        );
        
        // Fee too high
        vm.expectRevert("Fee bps too high");
        new CFTLotto(
            address(usdc),
            address(vrfCoordinator),
            KEY_HASH,
            SUBSCRIPTION_ID,
            TICKET_PRICE,
            MAX_TICKET_AMOUNT,
            MIN_ROUND_DURATION,
            feeCollector,
            10001,
            CALLBACK_GAS_LIMIT
        );
    }
    
    // ============ Ticket Purchase Tests ============
    
    function test_BuyTickets() public {
        uint256 ticketAmount = 5;
        uint256 totalCost = TICKET_PRICE * ticketAmount;
        
        uint256 userBalanceBefore = usdc.balanceOf(user1);
        uint256 contractBalanceBefore = usdc.balanceOf(address(lotto));
        
        vm.expectEmit(true, true, false, true);
        emit TicketsPurchased(1, user1, ticketAmount);
        
        vm.prank(user1);
        lotto.buyTickets(ticketAmount);
        
        // Check balances
        assertEq(usdc.balanceOf(user1), userBalanceBefore - totalCost);
        assertEq(usdc.balanceOf(address(lotto)), contractBalanceBefore + totalCost);
        
        // Check draw state
        (, , , uint256 potSize, uint256 ticketCount, , , , ) = lotto.draws(1);
        assertEq(potSize, totalCost);
        assertEq(ticketCount, ticketAmount);
        
        // Check tickets were assigned
        assertEq(lotto.getUserTicketCount(1, user1), ticketAmount);
    }
    
    function test_BuyTicketsMultipleUsers() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.prank(user2);
        lotto.buyTickets(5);
        
        vm.prank(user3);
        lotto.buyTickets(2);
        
        // Check total tickets
        (, , , uint256 potSize, uint256 ticketCount, , , , ) = lotto.draws(1);
        assertEq(ticketCount, 10);
        assertEq(potSize, TICKET_PRICE * 10);
        
        // Check individual ticket counts
        assertEq(lotto.getUserTicketCount(1, user1), 3);
        assertEq(lotto.getUserTicketCount(1, user2), 5);
        assertEq(lotto.getUserTicketCount(1, user3), 2);
    }
    
    function test_BuyTicketsInvalidAmount() public {
        vm.startPrank(user1);
        
        // Zero tickets
        vm.expectRevert(InvalidAmount.selector);
        lotto.buyTickets(0);
        
        // Above max
        vm.expectRevert(InvalidAmount.selector);
        lotto.buyTickets(MAX_TICKET_AMOUNT + 1);
        
        vm.stopPrank();
    }
    
    function test_BuyTicketsWhenPaused() public {
        lotto.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        lotto.buyTickets(1);
    }
    
    function test_BuyTicketsInsufficientBalance() public {
        address poorUser = makeAddr("poorUser");
        usdc.mint(poorUser, TICKET_PRICE / 2);
        
        vm.prank(poorUser);
        usdc.approve(address(lotto), type(uint256).max);
        
        vm.prank(poorUser);
        vm.expectRevert();
        lotto.buyTickets(1);
    }
    
    // ============ Draw Lifecycle Tests ============
    
    function test_CloseDraw() public {
        // Buy tickets
        vm.prank(user1);
        lotto.buyTickets(5);
        
        // Fast forward past min duration
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        
        vm.expectEmit(true, false, false, false);
        emit DrawClosed(1);
        
        lotto.closeDraw();
        
        // Check draw is closed
        (, , , , , bool open, , , ) = lotto.draws(1);
        assertFalse(open);
        
        // Check close time was recorded
        assertEq(lotto.drawCloseTime(1), block.timestamp);
    }
    
    function test_CloseDrawMinDurationNotMet() public {
        vm.prank(user1);
        lotto.buyTickets(1);
        
        // Try to close before min duration
        vm.expectRevert(DrawMinDurationNotMet.selector);
        lotto.closeDraw();
    }
    
    function test_CloseDrawNoTickets() public {
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        
        vm.expectRevert(InvalidCount.selector);
        lotto.closeDraw();
    }
    
    function test_CloseDrawAlreadyClosed() public {
        vm.prank(user1);
        lotto.buyTickets(1);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        vm.expectRevert(DrawAlreadyClosed.selector);
        lotto.closeDraw();
    }
    
    function test_CompleteDrawWorkflow() public {
        // 1. Buy tickets
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.prank(user2);
        lotto.buyTickets(5);
        
        vm.prank(user3);
        lotto.buyTickets(2);
        
        uint256 totalPot = TICKET_PRICE * 10;
        
        // 2. Close draw
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        // 3. Fulfill VRF
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 7; // This will select ticket index 7 (user2's ticket)
        
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // 4. Check winner
        (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(1);
        assertTrue(winnerChosen);
        assertTrue(winner != address(0));
        
        // 5. Claim winnings
        uint256 feeAmount = (totalPot * FEE_BPS) / 10000;
        uint256 expectedPayout = totalPot - feeAmount;
        
        uint256 winnerBalanceBefore = usdc.balanceOf(winner);
        
        vm.prank(winner);
        lotto.claimWinnings(1);
        
        assertEq(usdc.balanceOf(winner), winnerBalanceBefore + expectedPayout);
        
        // 6. Verify fees collected
        assertEq(lotto.getFeePool(), feeAmount);
    }
    
    // ============ Winner Selection and Claims Tests ============
    
    function test_WinnerSelection() public {
        vm.prank(user1);
        lotto.buyTickets(10);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5; // Select ticket index 5
        
        vm.expectEmit(true, false, false, false);
        emit WinnerSelected(1, user1, TICKET_PRICE * 10 - (TICKET_PRICE * 10 * FEE_BPS / 10000));
        
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(1);
        assertTrue(winnerChosen);
        assertEq(winner, user1);
    }
    
    function test_ClaimWinnings() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        uint256 totalPot = TICKET_PRICE * 5;
        uint256 feeAmount = (totalPot * FEE_BPS) / 10000;
        uint256 payout = totalPot - feeAmount;
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        vm.expectEmit(true, false, false, true);
        emit WinningsClaimed(1, user1, payout);
        
        vm.prank(user1);
        lotto.claimWinnings(1);
        
        assertEq(usdc.balanceOf(user1), balanceBefore + payout);
        
        // Check claimed flag
        (, , , , , , , , bool claimed) = lotto.draws(1);
        assertTrue(claimed);
    }
    
    function test_ClaimWinningsNotWinner() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // user2 tries to claim but is not the winner
        vm.prank(user2);
        vm.expectRevert(NotWinner.selector);
        lotto.claimWinnings(1);
    }
    
    function test_ClaimWinningsAlreadyClaimed() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        vm.prank(user1);
        lotto.claimWinnings(1);
        
        // Try to claim again
        vm.prank(user1);
        vm.expectRevert(AlreadyClaimed.selector);
        lotto.claimWinnings(1);
    }
    
    function test_ClaimWinningsWinnerNotChosen() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.prank(user1);
        vm.expectRevert(WinnerNotChosen.selector);
        lotto.claimWinnings(1);
    }
    
    // ============ Refund Tests ============
    
    function test_ClaimRefundAfterCancellation() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.prank(user2);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        // Simulate VRF timeout
        vm.warp(block.timestamp + lotto.VRF_TIMEOUT() + 1);
        lotto.cancelDrawAfterTimeout(1);
        
        // Check draw is cancelled
        (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(1);
        assertTrue(winnerChosen);
        assertEq(winner, address(0));
        
        // Claim refunds
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        
        vm.expectEmit(true, true, false, true);
        emit RefundClaimed(1, user1, TICKET_PRICE * 3);
        
        vm.prank(user1);
        lotto.claimRefund(1);
        
        vm.prank(user2);
        lotto.claimRefund(1);
        
        assertEq(usdc.balanceOf(user1), user1BalanceBefore + TICKET_PRICE * 3);
        assertEq(usdc.balanceOf(user2), user2BalanceBefore + TICKET_PRICE * 5);
    }
    
    function test_ClaimRefundNoTickets() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        vm.warp(block.timestamp + lotto.VRF_TIMEOUT() + 1);
        lotto.cancelDrawAfterTimeout(1);
        
        // user2 has no tickets
        vm.prank(user2);
        vm.expectRevert("No tickets to refund");
        lotto.claimRefund(1);
    }
    
    function test_ClaimRefundDrawHadWinner() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 1;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Try to claim refund when there's a winner
        vm.prank(user1);
        vm.expectRevert("Draw had a winner");
        lotto.claimRefund(1);
    }
    
    function test_ClaimRefundTwice() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        vm.warp(block.timestamp + lotto.VRF_TIMEOUT() + 1);
        lotto.cancelDrawAfterTimeout(1);
        
        vm.prank(user1);
        lotto.claimRefund(1);
        
        // Try to claim again
        vm.prank(user1);
        vm.expectRevert("No tickets to refund");
        lotto.claimRefund(1);
    }
    
    // ============ Admin Functions Tests ============
    
    function test_SetTicketPrice() public {
        uint256 newPrice = 2e6; // 2 USDC
        
        vm.expectEmit(false, false, false, true);
        emit TicketPriceUpdated(newPrice);
        
        lotto.setTicketPrice(newPrice);
        assertEq(lotto.ticketPrice(), newPrice);
    }
    
    function test_SetTicketPriceInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        lotto.setTicketPrice(0);
    }
    
    function test_SetMaxTicketAmount() public {
        uint32 newMax = 200;
        
        vm.expectEmit(false, false, false, true);
        emit MaxTicketAmountUpdated(newMax);
        
        lotto.setMaxTicketAmount(newMax);
        assertEq(lotto.maxTicketAmount(), newMax);
    }
    
    function test_SetMaxTicketAmountInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        lotto.setMaxTicketAmount(0);
    }
    
    function test_SetMinRoundDurationSeconds() public {
        uint32 newDuration = 120;
        
        vm.expectEmit(false, false, false, true);
        emit MinRoundDurationSecondsUpdated(newDuration);
        
        lotto.setMinRoundDurationSeconds(newDuration);
        assertEq(lotto.minRoundDurationSeconds(), newDuration);
    }
    
    function test_SetMinRoundDurationSecondsInvalid() public {
        vm.expectRevert(InvalidAmount.selector);
        lotto.setMinRoundDurationSeconds(0);
    }
    
    function test_SetCallbackGasLimit() public {
        uint32 newLimit = 600000;
        
        vm.expectEmit(false, false, false, true);
        emit CallbackGasLimitUpdated(newLimit);
        
        lotto.setCallbackGasLimit(newLimit);
        assertEq(lotto.callbackGasLimit(), newLimit);
    }
    
    function test_SetCallbackGasLimitInvalid() public {
        vm.expectRevert("Invalid callback gas limit");
        lotto.setCallbackGasLimit(0);
    }
    
    function test_SetFeeConfig() public {
        address newCollector = makeAddr("newCollector");
        uint32 newFeeBps = 300; // 3%
        
        vm.expectEmit(false, false, false, true);
        emit FeeConfigUpdated(newCollector, newFeeBps);
        
        lotto.setFeeConfig(newCollector, newFeeBps);
        assertEq(lotto.feeCollector(), newCollector);
        assertEq(lotto.feeBps(), newFeeBps);
    }
    
    function test_SetFeeConfigTooHigh() public {
        vm.expectRevert(FeeTooHigh.selector);
        lotto.setFeeConfig(feeCollector, 10001);
    }
    
    function test_SetVRFConfig() public {
        bytes32 newKeyHash = bytes32(uint256(2));
        uint256 newSubId = 2;
        uint16 newConfirmations = 5;
        
        lotto.setVRFConfig(newKeyHash, newSubId, newConfirmations);
        
        assertEq(lotto.keyHash(), newKeyHash);
        assertEq(lotto.subscriptionId(), newSubId);
        assertEq(lotto.requestConfirmations(), newConfirmations);
    }
    
    function test_WithdrawCollectedFees() public {
        // Generate fees by completing a draw
        vm.prank(user1);
        lotto.buyTickets(10);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        vm.prank(user1);
        lotto.claimWinnings(1);
        
        uint256 feeAmount = lotto.getFeePool();
        assertTrue(feeAmount > 0);
        
        uint256 collectorBalanceBefore = usdc.balanceOf(feeCollector);
        
        vm.expectEmit(true, false, false, true);
        emit FeesWithdrawn(feeCollector, feeAmount);
        
        lotto.withdrawCollectedFees();
        
        assertEq(usdc.balanceOf(feeCollector), collectorBalanceBefore + feeAmount);
        assertEq(lotto.getFeePool(), 0);
    }
    
    function test_WithdrawCollectedFeesNoCollector() public {
        // Set fee collector to zero
        lotto.setFeeConfig(address(0), 0);
        
        vm.expectRevert(NoFeeCollectorSet.selector);
        lotto.withdrawCollectedFees();
    }
    
    function test_PauseUnpause() public {
        vm.expectEmit(false, false, false, false);
        emit ContractPaused();
        lotto.pause();
        assertTrue(lotto.paused());
        
        vm.expectEmit(false, false, false, false);
        emit ContractUnpaused();
        lotto.unpause();
        assertFalse(lotto.paused());
    }
    
    function test_CancelDrawAfterTimeout() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        // Try before timeout
        vm.expectRevert(VRFTimeoutNotReached.selector);
        lotto.cancelDrawAfterTimeout(1);
        
        // After timeout
        vm.warp(block.timestamp + lotto.VRF_TIMEOUT() + 1);
        
        vm.expectEmit(true, false, false, true);
        emit DrawCancelled(1, "VRF timeout");
        
        lotto.cancelDrawAfterTimeout(1);
        
        (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(1);
        assertTrue(winnerChosen);
        assertEq(winner, address(0));
    }
    
    function test_CancelDrawInvalidState() public {
        // Try to cancel open draw
        vm.expectRevert(DrawNotClosed.selector);
        lotto.cancelDrawAfterTimeout(1);
        
        // Complete a draw normally
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Try to cancel completed draw
        vm.warp(block.timestamp + lotto.VRF_TIMEOUT() + 1);
        vm.expectRevert(DrawAlreadyClosed.selector);
        lotto.cancelDrawAfterTimeout(1);
    }
    
    function test_RetryVRFRequest() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        // Try before wait time
        vm.expectRevert("Wait before retry");
        lotto.retryVRFRequest(1);
        
        // After 1 hour
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.expectEmit(true, false, false, false);
        emit RandomnessRequested(1, 2);
        
        lotto.retryVRFRequest(1);
    }
    
    // ============ Access Control Tests ============
    
    function test_OnlyOwnerFunctions() public {
        address nonOwner = makeAddr("nonOwner");
        
        vm.startPrank(nonOwner);
        
        vm.expectRevert();
        lotto.setTicketPrice(2e6);
        
        vm.expectRevert();
        lotto.setMaxTicketAmount(200);
        
        vm.expectRevert();
        lotto.setMinRoundDurationSeconds(120);
        
        vm.expectRevert();
        lotto.setCallbackGasLimit(600000);
        
        vm.expectRevert();
        lotto.setFeeConfig(feeCollector, 300);
        
        vm.expectRevert();
        lotto.setVRFConfig(KEY_HASH, SUBSCRIPTION_ID, 5);
        
        vm.expectRevert();
        lotto.withdrawCollectedFees();
        
        vm.expectRevert();
        lotto.pause();
        
        vm.expectRevert();
        lotto.unpause();
        
        vm.expectRevert();
        lotto.cancelDrawAfterTimeout(1);
        
        vm.expectRevert();
        lotto.retryVRFRequest(1);
        
        vm.stopPrank();
    }
    
    // ============ View Functions Tests ============
    
    function test_GetDrawTickets() public {
        vm.prank(user1);
        lotto.buyTickets(3);
        
        vm.prank(user2);
        lotto.buyTickets(2);
        
        address[] memory tickets = lotto.getDrawTickets(1);
        assertEq(tickets.length, 5);
        assertEq(tickets[0], user1);
        assertEq(tickets[1], user1);
        assertEq(tickets[2], user1);
        assertEq(tickets[3], user2);
        assertEq(tickets[4], user2);
    }
    
    function test_GetUserTicketCount() public {
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.prank(user2);
        lotto.buyTickets(3);
        
        assertEq(lotto.getUserTicketCount(1, user1), 5);
        assertEq(lotto.getUserTicketCount(1, user2), 3);
        assertEq(lotto.getUserTicketCount(1, user3), 0);
    }
    
    function test_GetMetadata() public view {
        (
            uint256 _currentDrawId,
            uint256 _ticketPrice,
            uint32 _maxTicketAmount,
            uint32 _minRoundDurationSeconds,
            uint32 _callbackGasLimit,
            uint32 _feeBps,
            bool _paused
        ) = lotto.getMetadata();
        
        assertEq(_currentDrawId, 1);
        assertEq(lotto.feeCollector(), feeCollector);
        assertEq(lotto.getFeePool(), 0);
        assertEq(_ticketPrice, TICKET_PRICE);
        assertEq(_maxTicketAmount, MAX_TICKET_AMOUNT);
        assertEq(_minRoundDurationSeconds, MIN_ROUND_DURATION);
        assertEq(_callbackGasLimit, CALLBACK_GAS_LIMIT);
        assertEq(_feeBps, FEE_BPS);
        assertFalse(_paused);
    }
    
    // ============ Multiple Draws Tests ============
    
    function test_MultipleDraws() public {
        // Draw 1
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords1 = new uint256[](1);
        randomWords1[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords1);
        
        (, , , , , , , address winner1, ) = lotto.draws(1);
        
        vm.prank(winner1);
        lotto.claimWinnings(1);
        
        // Draw 2 should auto-start when next purchase is made
        assertEq(lotto.currentDrawId(), 1); // Still at draw 1
        
        vm.prank(user2);
        lotto.buyTickets(8); // This triggers creation of draw 2
        
        assertEq(lotto.currentDrawId(), 2); // Now draw 2 is created
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords2 = new uint256[](1);
        randomWords2[0] = 5;
        vrfCoordinator.fulfillRandomWords(2, randomWords2);
        
        (, , , , , , , address winner2, ) = lotto.draws(2);
        
        // Verify both draws completed successfully
        (, , , , , , bool winnerChosen1, , bool claimed1) = lotto.draws(1);
        (, , , , , , bool winnerChosen2, , ) = lotto.draws(2);
        
        assertTrue(winnerChosen1);
        assertTrue(claimed1);
        assertTrue(winnerChosen2);
        assertEq(winner1, user1);
        assertEq(winner2, user2);
    }
    
    function test_EnsureOpenDrawCreatesNew() public {
        // Complete first draw
        vm.prank(user1);
        lotto.buyTickets(5);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Next purchase should create draw 2
        vm.expectEmit(true, false, false, true);
        emit DrawStarted(2, TICKET_PRICE);
        
        vm.prank(user2);
        lotto.buyTickets(3);
        
        assertEq(lotto.currentDrawId(), 2);
    }
    
    // ============ Edge Cases ============
    
    function test_MaxTickets() public {
        vm.prank(user1);
        lotto.buyTickets(MAX_TICKET_AMOUNT);
        
        assertEq(lotto.getUserTicketCount(1, user1), MAX_TICKET_AMOUNT);
    }
    
    function test_SingleTicketDraw() public {
        vm.prank(user1);
        lotto.buyTickets(1);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 0;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        (, , , , , , , address winner, ) = lotto.draws(1);
        assertEq(winner, user1);
    }
    
    function test_LargeNumberOfTickets() public {
        // Multiple users buy max tickets
        vm.prank(user1);
        lotto.buyTickets(MAX_TICKET_AMOUNT);
        
        vm.prank(user2);
        lotto.buyTickets(MAX_TICKET_AMOUNT);
        
        vm.prank(user3);
        lotto.buyTickets(MAX_TICKET_AMOUNT);
        
        (, , , uint256 potSize, uint256 ticketCount, , , , ) = lotto.draws(1);
        assertEq(ticketCount, MAX_TICKET_AMOUNT * 3);
        assertEq(potSize, TICKET_PRICE * MAX_TICKET_AMOUNT * 3);
    }
    
    function test_ZeroFeeConfig() public {
        lotto.setFeeConfig(address(0), 0);
        
        vm.prank(user1);
        lotto.buyTickets(10);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 5;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        uint256 totalPot = TICKET_PRICE * 10;
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        vm.prank(user1);
        lotto.claimWinnings(1);
        
        // Winner gets full pot with no fees
        assertEq(usdc.balanceOf(user1), balanceBefore + totalPot);
    }
    
    function test_RandomnessDistribution() public {
        // Test that different random values select different winners
        for (uint256 i = 0; i < 3; i++) {
            if (i > 0) {
                // Start new draw after first
                vm.prank(user1);
                lotto.buyTickets(1); // Trigger new draw
            }
            
            vm.prank(user1);
            lotto.buyTickets(10);
            
            vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
            lotto.closeDraw();
            
            uint256[] memory randomWords = new uint256[](1);
            randomWords[0] = i * 7; // Different random values
            vrfCoordinator.fulfillRandomWords(i + 1, randomWords);
            
            (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(i + 1);
            assertTrue(winnerChosen);
            assertEq(winner, user1);
        }
    }
    
    // ============ Gas Optimization Tests ============
    
    function test_GasUsageBuyTickets() public {
        uint256 gasBefore = gasleft();
        
        vm.prank(user1);
        lotto.buyTickets(10);
        
        uint256 gasUsed = gasBefore - gasleft();
        assertTrue(gasUsed > 0);
        assertTrue(gasUsed < 500000, "buyTickets should not consume excessive gas");
    }
    
    function test_GasUsageCloseDraw() public {
        vm.prank(user1);
        lotto.buyTickets(10);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        
        uint256 gasBefore = gasleft();
        lotto.closeDraw();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed > 0);
        assertTrue(gasUsed < 300000, "closeDraw should not consume excessive gas");
    }
    
    // ============ Fuzz Tests ============
    
    function testFuzz_BuyTickets(uint8 amount) public {
        vm.assume(amount > 0 && amount <= MAX_TICKET_AMOUNT);
        
        vm.prank(user1);
        lotto.buyTickets(uint256(amount));
        
        assertEq(lotto.getUserTicketCount(1, user1), uint256(amount));
    }
    
    function testFuzz_TicketPrice(uint256 price) public {
        vm.assume(price > 0 && price <= 1000e6); // Max 1000 USDC
        
        lotto.setTicketPrice(price);
        assertEq(lotto.ticketPrice(), price);
    }
    
    function testFuzz_WinnerSelection(uint256 randomSeed) public {
        uint256 ticketCount = 10;
        vm.prank(user1);
        lotto.buyTickets(ticketCount);
        
        vm.warp(block.timestamp + MIN_ROUND_DURATION + 1);
        lotto.closeDraw();
        
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomSeed;
        vrfCoordinator.fulfillRandomWords(1, randomWords);
        
        // Winner should always be selected and be user1 (only participant)
        (, , , , , , bool winnerChosen, address winner, ) = lotto.draws(1);
        assertTrue(winnerChosen);
        assertEq(winner, user1);
    }
}
