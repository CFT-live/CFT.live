// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title USDC Lottery using Chainlink VRF v2.5
 * @notice Each draw allows users to buy multiple tickets with USDC.
 * After closing, a verifiable random number determines a single winner who receives the entire pot.
 */

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CFTLotto is VRFConsumerBaseV2Plus, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/

    struct Draw {
        uint256 id;
        uint256 startTime;
        uint256 ticketPrice; // in USDC (6 decimals)
        uint256 potSize; // total USDC collected
        uint256 ticketCount;
        bool open;
        bool winnerChosen;
        address winner;
        bool claimed;
    }

    // Draws and ticket ownership
    mapping(uint256 => Draw) public draws;
    mapping(uint256 => address[]) private drawTickets;

    // VRF request mapping
    mapping(uint256 => uint256) public requestToDraw;
    mapping(uint256 => uint256) public drawCloseTime; // Track when draw was closed

    IERC20 public immutable usdc;

    // Fee management

    // Chainlink VRF configuration
    IVRFCoordinatorV2Plus public immutable COORDINATOR;
    uint256 public constant VRF_TIMEOUT = 24 hours;
    uint16 public requestConfirmations = 3;
    bytes32 public keyHash;
    uint256 public subscriptionId;

    uint256 public currentDrawId;
    address public feeCollector;
    uint256 private feePool; // Accumulated fees
    uint256 public ticketPrice;
    uint32 public maxTicketAmount;
    uint32 public minRoundDurationSeconds;
    uint32 public callbackGasLimit; // Should be enough to handle winner selection, ~500000
    uint32 public feeBps; // fee in basis points (e.g., 100 = 1%)

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event DrawStarted(uint256 indexed drawId, uint256 ticketPrice);
    event TicketsPurchased(
        uint256 indexed drawId,
        address indexed buyer,
        uint256 amount
    );
    event DrawClosed(uint256 indexed drawId);
    event RandomnessRequested(uint256 indexed drawId, uint256 requestId);
    event WinnerSelected(uint256 indexed drawId, address winner, uint256 prize);
    event WinningsClaimed(
        uint256 indexed drawId,
        address winner,
        uint256 amount
    );
    event ContractPaused();
    event ContractUnpaused();
    event TicketPriceUpdated(uint256 newPrice);
    event MaxTicketAmountUpdated(uint32 newMaxAmount);
    event MinRoundDurationSecondsUpdated(uint32 newMinRoundDurationSeconds);
    event CallbackGasLimitUpdated(uint32 newCallbackGasLimit);
    event DrawCancelled(uint256 indexed drawId, string reason);
    event RefundClaimed(
        uint256 indexed drawId,
        address indexed user,
        uint256 amount
    );
    event FeeConfigUpdated(address collector, uint32 feeBps);
    event FeesWithdrawn(address indexed collector, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/
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

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _usdc,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint256 _ticketPrice,
        uint32 _maxTicketAmount,
        uint32 _minRoundDurationSeconds,
        address _feeCollector,
        uint32 _feeBps,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        require(_usdc != address(0), "Invalid usdc address");
        require(
            _vrfCoordinator != address(0),
            "Invalid vrf coordinator address"
        );
        require(_ticketPrice > 0, "Invalid ticket price");
        require(_maxTicketAmount > 0, "Invalid max ticket amount");
        require(_minRoundDurationSeconds > 0, "Invalid minimum round duration");
        require(_callbackGasLimit > 0, "Invalid callback gas limit");
        require(_feeBps <= 10000, "Fee bps too high");

        usdc = IERC20(_usdc);
        COORDINATOR = IVRFCoordinatorV2Plus(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;

        ticketPrice = _ticketPrice;
        maxTicketAmount = _maxTicketAmount;
        minRoundDurationSeconds = _minRoundDurationSeconds;
        feeCollector = _feeCollector;
        feeBps = _feeBps;
        callbackGasLimit = _callbackGasLimit;
        _startNewDraw();
    }

    /*//////////////////////////////////////////////////////////////
                                ADMIN
    //////////////////////////////////////////////////////////////*/
    function setMaxTicketAmount(uint32 _maxTicketAmount) external onlyOwner {
        if (_maxTicketAmount == 0) revert InvalidAmount();
        maxTicketAmount = _maxTicketAmount;
        emit MaxTicketAmountUpdated(_maxTicketAmount);
    }

    function setTicketPrice(uint256 _ticketPrice) external onlyOwner {
        if (_ticketPrice == 0) revert InvalidAmount();
        ticketPrice = _ticketPrice;
        emit TicketPriceUpdated(_ticketPrice);
    }

    function setMinRoundDurationSeconds(
        uint32 _minRoundDurationSeconds
    ) external onlyOwner {
        if (_minRoundDurationSeconds == 0) revert InvalidAmount();
        minRoundDurationSeconds = _minRoundDurationSeconds;
        emit MinRoundDurationSecondsUpdated(_minRoundDurationSeconds);
    }

    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        require(_callbackGasLimit > 0, "Invalid callback gas limit");
        callbackGasLimit = _callbackGasLimit;
        emit CallbackGasLimitUpdated(_callbackGasLimit);
    }

    function setFeeConfig(
        address _feeCollector,
        uint32 _feeBps
    ) external onlyOwner {
        if (_feeBps > 10000) revert FeeTooHigh();
        feeCollector = _feeCollector;
        feeBps = _feeBps;
        emit FeeConfigUpdated(feeCollector, feeBps);
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

    function cancelDrawAfterTimeout(uint256 _drawId) external onlyOwner {
        Draw storage draw = draws[_drawId];

        if (draw.open) revert DrawNotClosed();
        if (draw.winnerChosen) revert DrawAlreadyClosed();
        if (block.timestamp < drawCloseTime[_drawId] + VRF_TIMEOUT) {
            revert VRFTimeoutNotReached();
        }

        // Mark as cancelled by setting winner to address(0) and winnerChosen to true
        // This allows refunds and prevents the draw from blocking new draws
        draw.winnerChosen = true;
        draw.winner = address(0);

        emit DrawCancelled(_drawId, "VRF timeout");
    }

    function retryVRFRequest(uint256 _drawId) external onlyOwner {
        Draw storage draw = draws[_drawId];

        if (draw.open) revert DrawNotClosed();
        if (draw.winnerChosen) revert DrawAlreadyClosed();
        if (block.timestamp < drawCloseTime[_drawId] + 1 hours) {
            revert("Wait before retry");
        }

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

        requestToDraw[requestId] = _drawId;
        emit RandomnessRequested(_drawId, requestId);
    }

    /*//////////////////////////////////////////////////////////////
                                USER ACTIONS
    //////////////////////////////////////////////////////////////*/

    function buyTickets(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount <= 0) revert InvalidAmount();
        if (_amount > maxTicketAmount) revert InvalidAmount();

        _ensureOpenDraw();

        Draw storage draw = draws[currentDrawId];

        uint256 totalCost = draw.ticketPrice * _amount;
        usdc.safeTransferFrom(msg.sender, address(this), totalCost);

        draw.potSize += totalCost;
        draw.ticketCount += _amount;

        for (uint256 i = 0; i < _amount; i++) {
            drawTickets[currentDrawId].push(msg.sender);
        }

        emit TicketsPurchased(currentDrawId, msg.sender, _amount);
    }

    function claimWinnings(uint256 _drawId) external nonReentrant {
        Draw storage draw = draws[_drawId];

        if (!draw.winnerChosen) revert WinnerNotChosen();
        if (draw.winner != msg.sender) revert NotWinner();
        if (draw.claimed) revert AlreadyClaimed();

        draw.claimed = true;

        uint256 payout = draw.potSize;
        uint256 feeAmount = 0;

        // Deduct fee if fee collector is set and fee is configured
        if (feeCollector != address(0) && feeBps > 0) {
            feeAmount = (payout * feeBps) / 10000;
            feePool += feeAmount;
            payout -= feeAmount;
        }

        usdc.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(_drawId, msg.sender, payout);
    }

    function claimRefund(uint256 _drawId) external nonReentrant {
        Draw storage draw = draws[_drawId];

        if (!draw.winnerChosen) revert("Draw not finalized");
        if (draw.winner != address(0)) revert("Draw had a winner");

        // Calculate user's ticket count and refund amount
        uint256 userTickets = 0;
        address[] storage tickets = drawTickets[_drawId];
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i] == msg.sender) {
                userTickets++;
                tickets[i] = address(0); // Mark as claimed to prevent double-refund
            }
        }

        if (userTickets == 0) revert("No tickets to refund");

        uint256 refundAmount = userTickets * draw.ticketPrice;
        usdc.safeTransfer(msg.sender, refundAmount);

        emit RefundClaimed(_drawId, msg.sender, refundAmount);
    }

    function closeDraw() external nonReentrant {
        Draw storage draw = draws[currentDrawId];
        if (!draw.open) revert DrawAlreadyClosed();
        if (draw.ticketCount == 0) revert InvalidCount();
        if (block.timestamp < draw.startTime + minRoundDurationSeconds) {
            revert DrawMinDurationNotMet();
        }

        draw.open = false;
        drawCloseTime[currentDrawId] = block.timestamp;
        emit DrawClosed(currentDrawId);

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

        requestToDraw[requestId] = currentDrawId;
        emit RandomnessRequested(currentDrawId, requestId);
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 drawId = requestToDraw[requestId];
        Draw storage draw = draws[drawId];
        require(!draw.winnerChosen, "Already fulfilled");

        uint256 winningIndex = randomWords[0] % draw.ticketCount;
        address winner = drawTickets[drawId][winningIndex];

        // State-only update - no external calls that could revert
        draw.winner = winner;
        draw.winnerChosen = true;

        // Calculate prize for event (actual transfer happens in claimWinnings)
        uint256 prize = draw.potSize;
        if (feeCollector != address(0) && feeBps > 0) {
            uint256 feeAmount = (prize * feeBps) / 10000;
            prize -= feeAmount;
        }

        emit WinnerSelected(drawId, winner, prize);
    }

    function _startNewDraw() internal whenNotPaused {
        if (currentDrawId > 0 && !draws[currentDrawId].winnerChosen)
            revert PreviousDrawNotCompleted();

        currentDrawId++;
        draws[currentDrawId] = Draw({
            id: currentDrawId,
            startTime: block.timestamp,
            ticketPrice: ticketPrice,
            potSize: 0,
            ticketCount: 0,
            open: true,
            winnerChosen: false,
            winner: address(0),
            claimed: false
        });

        emit DrawStarted(currentDrawId, ticketPrice);
    }

    function _ensureOpenDraw() internal {
        Draw storage currentDraw = draws[currentDrawId];
        if (!currentDraw.open) {
            if (!currentDraw.winnerChosen) revert PreviousDrawNotCompleted();
            _startNewDraw();
        }
    }

    /*//////////////////////////////////////////////////////////////
                                VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function getDrawTickets(
        uint256 _drawId
    ) external view returns (address[] memory) {
        return drawTickets[_drawId];
    }

    function getUserTicketCount(
        uint256 _drawId,
        address user
    ) external view returns (uint256 count) {
        address[] storage tickets = drawTickets[_drawId];
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i] == user) count++;
        }
    }

    function getMetadata()
        external
        view
        returns (
            uint256 _currentDrawId,
            uint256 _ticketPrice,
            uint32 _maxTicketAmount,
            uint32 _minRoundDurationSeconds,
            uint32 _callbackGasLimit,
            uint32 _feeBps,
            bool _paused
        )
    {
        return (
            currentDrawId,
            ticketPrice,
            maxTicketAmount,
            minRoundDurationSeconds,
            callbackGasLimit,
            feeBps,
            paused()
        );
    }
}
