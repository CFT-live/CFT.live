// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Permit {
    function permit(
        address owner, address spender, uint256 value,
        uint256 deadline, uint8 v,
        bytes32 r, bytes32 s
    ) external;
}

enum Asset {
    Eth,
    Arb,
    Aave,
    Btc,
    Sol,
    Xrp,
    Bnb,
    Doge,
    Pepe,
    Shib
}

enum RoundStatus {
    Open,
    Live,
    Closed,
    Cancelled
}

enum Position {
    Unset,
    Up,
    Down
}

// Data structures
struct Round {
    address creator;
    uint64 lockAt;
    uint64 closeAt;
    int256 lockPrice;
    RoundStatus status;
    Asset asset;
    uint128 upAmount;
    uint128 downAmount;
    int256 closePrice;
    Position finalPosition;
}

struct Bet {
    uint128 roundId;
    Position position;
    uint128 amount;
    bool claimed;
    address user;
}

// Events for state changes and actions
event contractInitialized();
event BetLimitsUpdated(uint128 minAmount, uint128 maxAmount);
event FeeConfigUpdated(address collector, uint32 feeBps);
event PriceFeedAddressConfigured(address feed, Asset asset);
event BetPlaced(uint128 indexed betId, uint128 indexed roundId, address indexed user, Position position, uint128 amount);
event RoundCreated(uint128 indexed roundId, uint64 lockAt, uint64 closeAt, Asset asset);
event RoundCancelled(uint128 indexed roundId);
event RoundStarted(uint128 indexed roundId, int256 lockPrice);
event RoundClosed(uint128 indexed roundId, int256 closePrice, Position finalPosition);
event BetClaimed(uint128 indexed betId, address indexed user, uint128 amount);
event BetRefunded(uint128 indexed betId, address indexed user, uint128 amount);
event Deposited(address indexed user, uint128 amount);
event Withdrawn(address indexed user, uint128 amount);
event TokenRecovery(address indexed token, uint256 amount);
event PayoutsCalculated(uint128 indexed roundId, uint128 payoutUp, uint128 payoutDown);

// Custom Errors
error NotOwner();
error Reentrancy();
error RoundNotFound();
error GamePaused();
error InvalidMinBetAmount();
error InvalidMaxBetAmount();
error FeeTooHigh();
error InvalidBetPosition();
error InvalidAmount();
error NotEnoughBalance();
error TooManyOpenRounds();
error BetAmountBelowMinimum();
error BetAmountAboveMaximum();
error RoundNotOpen();
error RoundNotLive();
error InvalidRoundTimes();
error RoundAlreadyExists();
error PriceFeedNotConfigured();
error PriceFeedNotAvailable();
error RoundNotReadyToStart();
error RoundNotReadyToClose();
error NoFeeCollectorSet();
error NotReadyToAdvance();
error InvalidMaxOpenRoundsPerUser();
error InvalidMinOpenTime();
error InvalidMinLockTime();
error InvalidPriceMaxAge();

/**
 * @title PredictionMarket
 */
contract CFTPredictionMarket {
    using SafeERC20 for IERC20;

    address public owner; // contract owner
    IERC20 public immutable paymentToken; // ERC20 token used for betting (e.g., USDC)

    IPyth pyth; // Pyth Network price oracle
    bytes32 internal priceFeedETH; // Pyth price feed ID for ETH/USD
    bytes32 internal priceFeedARB; // Pyth price feed ID for ARB/USD
    bytes32 internal priceFeedAAVE; // Pyth price feed ID for AAVE/USD
    bytes32 internal priceFeedBTC; // Pyth price feed ID for BTC/USD
    bytes32 internal priceFeedSOL; // Pyth price feed ID for SOL/USD
    bytes32 internal priceFeedXRP; // Pyth price feed ID for XRP/USD
    bytes32 internal priceFeedBNB; // Pyth price feed ID for BNB/USD
    bytes32 internal priceFeedDOGE; // Pyth price feed ID for DOGE/USD
    bytes32 internal priceFeedPEPE; // Pyth price feed ID for PEPE/USD
    bytes32 internal priceFeedSHIB; // Pyth price feed ID for SHIB/USD

    uint64 public betLockBuffer; // seconds before round close when betting locks
    uint64 public dataWaitWindow; // grace period for oracle data delay
    address public feeCollector; // address to collect protocol fees
    uint32 public feeBps; // fee in basis points (e.g., 100 = 1%)
    uint128 public minBetAmount; // Minimum bet amount (in token units, e.g., 1 USDC = 1000000 for 6 decimals)
    uint128 public maxBetAmount; // Maximum bet amount (in token units, e.g., 1000 USDC = 1000000000 for 6 decimals)
    uint128 public maxOpenRoundsPerUser; // Maximum open rounds allowed per user
    uint256 public minOpenTime; // Minimum time a round must be open before it can be started (in seconds)
    uint256 public minLockTime; // Minimum time a round must be locked before it can be closed (in seconds)
    bool public paused; // pause state of the contract
    uint256 public advanceCooldown; // Minimum time between advance calls (in seconds)
    uint256 public priceMaxAge; // Maximum age of price data from oracle

    // State tracking
    uint128 internal nextRoundId = 1; // next round ID to be created (starts at 1)
    uint128 internal nextBetId = 1; // next bet ID to be created (starts at 1)
    uint128 private feePool;
    uint128[] internal openRoundIds; // Array of open round IDs
    uint128[] internal liveRoundIds; // Array of live round IDs
    uint256 private lastAdvanceTimestamp;
    uint128 private constant SCALE = 1e18;
    // Mappings
    mapping(uint128 => Round) public rounds; // roundId => Round data
    mapping(uint128 => Bet) public bets; // betId => Bet data
    mapping(address => uint128) public balanceOf; // User balance ledger (for deposits)

constructor(
        address paymentTokenAddress, // ERC20 token used for betting (e.g. USDC)
        address _pythAddress, // Pyth Network contract address
        bytes32 _priceFeedIdETH, // Pyth price feed ID for ETH/USD
        bytes32 _priceFeedIdARB, // Pyth price feed ID for ARB/USD
        bytes32 _priceFeedIdAAVE, // Pyth price feed ID for AAVE/USD
        bytes32 _priceFeedIdBTC, // Pyth price feed ID for BTC/USD
        bytes32 _priceFeedIdSOL, // Pyth price feed ID for SOL/USD
        bytes32 _priceFeedIdXRP, // Pyth price feed ID for XRP/USD
        bytes32 _priceFeedIdBNB, // Pyth price feed ID for BNB/USD
        bytes32 _priceFeedIdDOGE, // Pyth price feed ID for DOGE/USD
        bytes32 _priceFeedIdPEPE, // Pyth price feed ID for PEPE/USD
        bytes32 _priceFeedIdSHIB, // Pyth price feed ID for SHIB/USD
        uint64 _betLockBuffer, // seconds before round close when betting locks
        uint64 _dataWaitWindow, // grace period for oracle data delay
        address _feeCollectorAddress, // address to collect protocol fees
        uint32 _feeBps, // fee in basis points (e.g. 100 = 1%)
        uint128 _minBetAmount, // Minimum bet amount (in token units, e.g. 1 USDC = 1000000 for 6 decimals)
        uint128 _maxBetAmount, // Maximum bet amount (in token units, e.g. 1000 USDC = 1000000000 for 6 decimals)
        uint128 _maxOpenRoundsPerUser, // Maximum open rounds allowed per user
        uint256 _minOpenTime, // Minimum time a round must be open before it can be started (in seconds)
        uint256 _minLockTime, // Minimum time a round must be locked before it can be closed (in seconds)
        uint128 _advanceCooldown, // Minimum time between advance calls
        uint128 _priceMaxAge // Maximum age of price data from oracle
    ) {
        // Address validations
        require(_pythAddress != address(0), "Invalid Pyth address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        require(_priceFeedIdETH != bytes32(0), "Invalid ETH price feed ID");
        require(_priceFeedIdARB != bytes32(0), "Invalid ARB price feed ID");
        require(_priceFeedIdAAVE != bytes32(0), "Invalid AAVE price feed ID");
        require(_priceFeedIdBTC != bytes32(0), "Invalid BTC price feed ID");
        require(_priceFeedIdSOL != bytes32(0), "Invalid SOL price feed ID");
        require(_priceFeedIdXRP != bytes32(0), "Invalid XRP price feed ID");
        require(_priceFeedIdBNB != bytes32(0), "Invalid BNB price feed ID");
        require(_priceFeedIdDOGE != bytes32(0), "Invalid DOGE price feed ID");
        require(_priceFeedIdPEPE != bytes32(0), "Invalid PEPE price feed ID");
        require(_priceFeedIdSHIB != bytes32(0), "Invalid SHIB price feed ID");

        // Fee validation
        if (_feeBps > 10000) revert FeeTooHigh(); // max 100%
        
        // Bet amount validations
        if (_minBetAmount == 0) revert InvalidMinBetAmount();
        if (_maxBetAmount < _minBetAmount) revert InvalidMaxBetAmount();
        
        // Time parameter validations
        require(_betLockBuffer > 0, "Bet lock buffer must be positive");
        require(_dataWaitWindow > 0, "Data wait window must be positive");
        require(_minOpenTime > 0, "Min open time must be positive");
        require(_minLockTime > 0, "Min lock time must be positive");
        require(_priceMaxAge > 0, "Price max age must be positive");
        
        // Logical validations
        require(_maxOpenRoundsPerUser > 0, "Max open rounds per user must be positive");
        require(_advanceCooldown < 1 days, "Advance cooldown too high");
        
        owner = msg.sender;
        paymentToken = IERC20(paymentTokenAddress);

        pyth = IPyth(_pythAddress);
        priceFeedETH = _priceFeedIdETH;
        priceFeedARB = _priceFeedIdARB;
        priceFeedAAVE = _priceFeedIdAAVE;
        priceFeedBTC = _priceFeedIdBTC;
        priceFeedSOL = _priceFeedIdSOL;
        priceFeedXRP = _priceFeedIdXRP;
        priceFeedBNB = _priceFeedIdBNB;
        priceFeedDOGE = _priceFeedIdDOGE;
        priceFeedPEPE = _priceFeedIdPEPE;
        priceFeedSHIB = _priceFeedIdSHIB;

        betLockBuffer = _betLockBuffer;
        dataWaitWindow = _dataWaitWindow;
        feeCollector = _feeCollectorAddress;
        feeBps = _feeBps;
        minBetAmount = _minBetAmount;
        maxBetAmount = _maxBetAmount;
        maxOpenRoundsPerUser = _maxOpenRoundsPerUser;
        minOpenTime = _minOpenTime;
        minLockTime = _minLockTime;
        paused = false;
        advanceCooldown = _advanceCooldown;
        priceMaxAge = _priceMaxAge;

        // Emit initial configuration event, for fetching start block
        emit contractInitialized();
    }

    // ************ Modifiers ************
    uint256 private _status = 1;
    modifier nonReentrant() {
        if (_status == 2) revert Reentrancy();
        _status = 2;
        _;
        _status = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyFeeCollector() {
        if (msg.sender != feeCollector) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert GamePaused();
        _;
    }

    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    // ************ Public Functions ************
    function deposit(uint128 amount) external whenNotPaused nonReentrant {
        _deposit(msg.sender, amount);
    }

    function withdrawAll() external nonReentrant {
        if (balanceOf[msg.sender] <= 0) revert InvalidAmount();
        paymentToken.safeTransfer(msg.sender, balanceOf[msg.sender]);
        emit Withdrawn(msg.sender, balanceOf[msg.sender]);
        balanceOf[msg.sender] = 0;
    }

    function createOpenRoundAndBet(
        uint64 lockAt,
        uint64 closeAt,
        Asset asset,
        Position position,
        uint128 amount
    ) external whenNotPaused nonReentrant notContract {
        if (amount < minBetAmount || amount > maxBetAmount) revert InvalidAmount();
        if (balanceOf[msg.sender] < amount) revert NotEnoughBalance();
        // Count how many open rounds this user has already created and limit to prevent spam
        uint256 userCreatedOpenRounds = 0;
        for (uint256 i = 0; i < openRoundIds.length; i++) {
            if (rounds[openRoundIds[i]].creator == msg.sender) {
                userCreatedOpenRounds++;
            }
        }
        if (userCreatedOpenRounds >= maxOpenRoundsPerUser) {
            revert TooManyOpenRounds(); // Too many open rounds created by this user
        }
        
        uint128 roundId = nextRoundId++;
        _createRound(roundId, lockAt, closeAt, asset, msg.sender);
        _placeBet(roundId, position, amount, msg.sender);
    }

    /**
     * @notice Place a bet on a specific round by transferring tokens from your wallet (requires prior ERC20 approval).
     * @dev This will transfer `amount` tokens from the caller and place a bet on `roundId`.
     */
    function placeBet(
        uint128 roundId,
        Position position,
        uint128 amount
    ) external whenNotPaused nonReentrant notContract {
        _placeBet(roundId, position, amount, msg.sender);
    }
    
    /**
     * @notice Claim payouts for multiple bets. Includes refunds for cancelled/tied rounds or winnings for successful bets.
     * @param betIds Array of bet IDs to claim for.
     */
    function claim(uint128[] calldata betIds) external nonReentrant {
        uint128 totalPayout = 0;
        for (uint128 i = 0; i < betIds.length; ++i) {
            uint128 betId = betIds[i];
            Bet storage bet = bets[betId];
            if (bet.amount == 0 || bet.claimed || bet.user != msg.sender) {
                continue;
            }
            Round storage r = rounds[bet.roundId];

            if (r.status == RoundStatus.Cancelled) {
                totalPayout += bet.amount;
                bet.claimed = true;
                emit BetRefunded(betId, bet.user, bet.amount);
            } else if (r.status == RoundStatus.Closed) {
                bool isWinningBet = r.finalPosition == bet.position;
                if (!isWinningBet) continue;

                (uint128 payoutUp, uint128 payoutDown) = _calculateRoundPayouts(bet.roundId);
                uint128 payOutMultiplier = bet.position == Position.Up ? payoutUp : payoutDown;

                uint128 roundPayout = payOutMultiplier * bet.amount / SCALE;
                uint128 feeAmount = 0;
                if (feeCollector != address(0) && feeBps > 0) {
                    feeAmount = (roundPayout * feeBps) / 10000;
                }
                if (feeAmount > 0) {
                    roundPayout -= feeAmount;
                    feePool += feeAmount;
                }
                totalPayout += roundPayout;
                bet.claimed = true;
                emit BetClaimed(betId, bet.user, roundPayout);
            }
        }
        if (totalPayout > 0) {
            balanceOf[msg.sender] += totalPayout;
        }
    }

    function advance() external {
        if (paused) revert GamePaused();

        if (block.timestamp < lastAdvanceTimestamp + advanceCooldown) {
            revert NotReadyToAdvance();
        }
        // Start all open rounds that are ready to be started
        for (uint256 i = openRoundIds.length; i > 0; i--) {
            uint128 roundId = openRoundIds[i - 1];
            if (block.timestamp >= rounds[roundId].lockAt) {
                _startRound(roundId);
            }
        }
        // Close all live rounds that are ready to be closed
        for (uint256 i = liveRoundIds.length; i > 0; i--) {
            uint128 roundId = liveRoundIds[i - 1];
            if (block.timestamp >= rounds[roundId].closeAt) {
                _closeRound(roundId);
            }
        }
        lastAdvanceTimestamp = block.timestamp;
    }


    // ************ Get Functions for Querying State ************

    function getMetadata() external view returns (
        address _owner,
        address _paymentToken,
        uint64 _betLockBuffer,
        uint64 _dataWaitWindow,
        uint32 _feeBps,
        uint256 _minBetAmount,
        uint256 _maxBetAmount,
        uint256 _maxOpenRoundsPerUser,
        uint256 _minOpenTime,
        uint256 _minLockTime,
        uint256 _advanceCooldown,
        uint256 _priceMaxAge,
        bool _paused
    ) {
        return (
            owner,
            address(paymentToken),
            betLockBuffer,
            dataWaitWindow,
            feeBps,
            minBetAmount,
            maxBetAmount,
            maxOpenRoundsPerUser,
            minOpenTime,
            minLockTime,
            advanceCooldown,
            priceMaxAge,
            paused
        );
    }

    function getPriceFeeds() external view returns (
        bytes32 _priceFeedETH,
        bytes32 _priceFeedARB,
        bytes32 _priceFeedAAVE,
        bytes32 _priceFeedBTC,
        bytes32 _priceFeedSOL,
        bytes32 _priceFeedXRP,
        bytes32 _priceFeedBNB,
        bytes32 _priceFeedDOGE,
        bytes32 _priceFeedPEPE,
        bytes32 _priceFeedSHIB) {
        return (
            priceFeedETH,
            priceFeedARB,
            priceFeedAAVE,
            priceFeedBTC,
            priceFeedSOL,
            priceFeedXRP,
            priceFeedBNB,
            priceFeedDOGE,
            priceFeedPEPE,
            priceFeedSHIB
        );
    }

    function getActiveRoundIds() external view returns (uint128[] memory, uint128[] memory) {
        return (openRoundIds, liveRoundIds);
    }

    // Gets the next deadline for advancing rounds. Deadline is calculated based on the soonest lockAt or closeAt time among open and live rounds.
    function getNextAdvanceDeadline() external view returns (uint256) {
        uint256 nextDeadline = type(uint256).max;
        for (uint256 i = 0; i < openRoundIds.length; i++) {
            uint128 roundId = openRoundIds[i];
            if (rounds[roundId].lockAt < nextDeadline) {
                nextDeadline = rounds[roundId].lockAt;
            }
        }
        for (uint256 i = 0; i < liveRoundIds.length; i++) {
            uint128 roundId = liveRoundIds[i];
            if (rounds[roundId].closeAt < nextDeadline) {
                nextDeadline = rounds[roundId].closeAt;
            }
        }
        return nextDeadline;
    }

    function getRound(uint128 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getBet(uint128 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    function getUserBalance() external view returns (uint128) {
        return balanceOf[msg.sender];
    }

    // Returns the up and down payout multipliers for a given round
    function calculateRoundPayouts(uint128 roundId) external view returns (uint128 payoutUp, uint128 payoutDown) {
        if (rounds[roundId].lockAt == 0) revert RoundNotFound();
        return _calculateRoundPayouts(roundId);
    }

    function getPrice(Asset asset) external view returns (int256) {
        (bool success, int256 price) = _fetchPrice(asset);
        if (!success) revert PriceFeedNotAvailable();
        return price;
    }

    // ************ Admin Functions ************

    function getFeePool() external onlyOwner view returns (uint256) {
        return feePool;
    }

    /**
     * @notice Get balance of any user for debugging issues.
     * @param user: address of the user
     * @dev Callable by owner
     */
    function getBalance(address user) external view onlyOwner returns (uint128) {
        return balanceOf[user];
    }

    /**
     * @notice Get all bets placed by a specific user.
     * @param user: address of the user
     * @dev Callable by owner
     */
    function getAllBetsForUser(address user) external view onlyOwner returns (Bet[] memory) {
        uint128 totalBets = nextBetId - 1;
        
        // Allocate temporary array for bet IDs (max possible size)
        uint128[] memory tempBetIds = new uint128[](totalBets);
        uint128 count = 0;

        // Single pass: collect matching bet IDs
        for (uint128 i = 1; i <= totalBets; ++i) {
            if (bets[i].user == user) {
                tempBetIds[count++] = i;
            }
        }

        // Allocate result array with exact size
        Bet[] memory userBets = new Bet[](count);
        
        // Populate using stored IDs
        for (uint128 i = 0; i < count; ++i) {
            userBets[i] = bets[tempBetIds[i]];
        }

        return userBets;
    }

    function setBetLimits(
        uint128 _minBetAmount,
        uint128 _maxBetAmount
    ) external onlyOwner {
        if (_minBetAmount == 0) revert InvalidMinBetAmount();
        if (_maxBetAmount < _minBetAmount) revert InvalidMaxBetAmount();

        minBetAmount = _minBetAmount;
        maxBetAmount = _maxBetAmount;
        emit BetLimitsUpdated(minBetAmount, maxBetAmount);
    }

    function setFeeConfig(
        address _feeCollector,
        uint32 _feeBps
    ) external onlyOwner {
        if (_feeBps > 10000) revert FeeTooHigh(); // max 100%
        feeCollector = _feeCollector;
        feeBps = _feeBps;
        emit FeeConfigUpdated(feeCollector, feeBps);
    }

    function setPriceAddressFeedETH(bytes32 feedId) external onlyOwner {
        priceFeedETH = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedETH))), Asset.Eth);
    }

    function setPriceAddressFeedARB(bytes32 feedId) external onlyOwner {
        priceFeedARB = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedARB))), Asset.Arb);
    }

    function setPriceAddressFeedAAVE(bytes32 feedId) external onlyOwner {
        priceFeedAAVE = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedAAVE))), Asset.Aave);
    }

    function setPriceAddressFeedBTC(bytes32 feedId) external onlyOwner {
        priceFeedBTC = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedBTC))), Asset.Btc);
    }

    function setPriceAddressFeedSOL(bytes32 feedId) external onlyOwner {
        priceFeedSOL = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedSOL))), Asset.Sol);
    }

    function setPriceAddressFeedXRP(bytes32 feedId) external onlyOwner {
        priceFeedXRP = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedXRP))), Asset.Xrp);
    }

    function setPriceAddressFeedBNB(bytes32 feedId) external onlyOwner {
        priceFeedBNB = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedBNB))), Asset.Bnb);
    }

    function setPriceAddressFeedDOGE(bytes32 feedId) external onlyOwner {
        priceFeedDOGE = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedDOGE))), Asset.Doge);
    }

    function setPriceAddressFeedPEPE(bytes32 feedId) external onlyOwner {
        priceFeedPEPE = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedPEPE))), Asset.Pepe);
    }

    function setPriceAddressFeedSHIB(bytes32 feedId) external onlyOwner {
        priceFeedSHIB = feedId;
        emit PriceFeedAddressConfigured(address(uint160(uint256(priceFeedSHIB))), Asset.Shib);
    }

    function setPauseState(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function setBetLockBuffer(uint64 _betLockBuffer) external onlyOwner {
        betLockBuffer = _betLockBuffer;
    }

    function setDataWaitWindow(uint64 _dataWaitWindow) external onlyOwner {
        dataWaitWindow = _dataWaitWindow;
    }

    function setAdvanceCooldown(uint256 _advanceCooldown) external onlyOwner {
        advanceCooldown = _advanceCooldown;
    }

    function setPriceMaxAge(uint256 _priceMaxAge) external onlyOwner {
        if (_priceMaxAge == 0) revert InvalidPriceMaxAge();
        priceMaxAge = _priceMaxAge;
    }

    function setMaxOpenRoundsPerUser(uint128 _maxOpenRoundsPerUser) external onlyOwner {
        if (_maxOpenRoundsPerUser == 0) revert InvalidMaxOpenRoundsPerUser();
        maxOpenRoundsPerUser = _maxOpenRoundsPerUser;
    }

    function setMinOpenTime(uint256 _minOpenTime) external onlyOwner {
        if (_minOpenTime == 0) revert InvalidMinOpenTime();
        minOpenTime = _minOpenTime;
    }

    function setMinLockTime(uint256 _minLockTime) external onlyOwner {
        if (_minLockTime == 0) revert InvalidMinLockTime();
        minLockTime = _minLockTime;
    }

    function withdrawCollectedFees() external onlyOwner nonReentrant {
        if (feeCollector == address(0)) revert NoFeeCollectorSet();
        uint128 amount = feePool;
        if (amount == 0) return;
        paymentToken.safeTransfer(feeCollector, amount);
        feePool = 0;
    }
    
    function startRound(uint128 roundId) external onlyOwner {
        _startRound(roundId);
    }

    function closeRound(uint128 roundId) external onlyOwner {
        _closeRound(roundId);
    }

    /**
     * @notice It allows the owner to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @param _amount: token amount
     * @dev Callable by owner
     */
    function recoverToken(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(paymentToken), "Cannot be prediction token address");
        IERC20(_token).safeTransfer(address(msg.sender), _amount);

        emit TokenRecovery(_token, _amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NotOwner();
        owner = newOwner;
    }

    // ************ Internal helper Functions ************

    function _deposit(address from, uint128 amount) internal {
        if (amount == 0) revert InvalidAmount();
        paymentToken.safeTransferFrom(from, address(this), amount);
        balanceOf[from] += amount;
        emit Deposited(from, amount);
    }

    function _placeBet(
        uint128 roundId,
        Position position,
        uint128 amount,
        address user
    ) internal {
        if (position != Position.Up && position != Position.Down)
            revert InvalidBetPosition();
        if (amount == 0) revert InvalidAmount();
        if (amount < minBetAmount) revert BetAmountBelowMinimum();
        if (amount > maxBetAmount) revert BetAmountAboveMaximum();
        if (balanceOf[user] < amount) revert NotEnoughBalance();

        Round storage round = rounds[roundId];
        if (round.lockAt == 0) revert RoundNotFound();
        if (round.status != RoundStatus.Open || block.timestamp > round.lockAt - betLockBuffer) revert RoundNotOpen();

        bets[nextBetId] = Bet({
            roundId: roundId,
            user: user,
            position: position,
            amount: amount,
            claimed: false
        });
        balanceOf[user] -= amount;
        if (position == Position.Up) {
            round.upAmount += amount;
        } else {
            round.downAmount += amount;
        }
        emit BetPlaced(nextBetId, roundId, user, position, amount);
        nextBetId++;

        (uint128 payoutUp, uint128 payoutDown) = _calculateRoundPayouts(roundId);
        emit PayoutsCalculated(roundId, payoutUp, payoutDown);
    }

    function _calculateRoundPayouts(uint128 roundId) internal view returns (uint128 payoutUp, uint128 payoutDown) {
        Round storage r = rounds[roundId];
        uint128 totalPool = r.upAmount + r.downAmount;
        if (totalPool == 0) {
            return (SCALE, SCALE);
        }

        payoutUp = r.upAmount > 0 ? (totalPool * SCALE) / r.upAmount : 0;
        payoutDown = r.downAmount > 0 ? (totalPool * SCALE) / r.downAmount : 0;

        return (payoutUp, payoutDown);
    }

    function _createRound(
        uint128 roundId,
        uint64 lockAt,
        uint64 closeAt,
        Asset asset,
        address creator
    ) internal {
        if (rounds[roundId].lockAt != 0) revert RoundAlreadyExists();
        if (lockAt <= block.timestamp + minLockTime || closeAt <= lockAt + minOpenTime)
            revert InvalidRoundTimes();

        Round storage r = rounds[roundId];
        r.lockAt = lockAt;
        r.closeAt = closeAt;
        r.lockPrice = 0;
        r.closePrice = 0;
        r.upAmount = 0;
        r.downAmount = 0;
        r.status = RoundStatus.Open;
        r.asset = asset;
        r.creator = creator;

        openRoundIds.push(roundId);
        emit RoundCreated(roundId, lockAt, closeAt, asset);
    }

    function _startRound(uint128 roundId) internal returns (bool){
        Round storage round = rounds[roundId];

        // Return early if round is not yet ready to start
        if (round.status != RoundStatus.Open) return false;
        if (block.timestamp < round.lockAt) return false;

        // Cancel round if starting is not done on time or no bets were placed on both sides
        if (round.lockAt == 0 || block.timestamp > round.lockAt + dataWaitWindow || round.upAmount == 0 || round.downAmount == 0) {
            round.status = RoundStatus.Cancelled;
            _removeFromOpenRounds(roundId);
            emit RoundCancelled(roundId);
            return true;
        }

        // Get price from oracle, keep round open if price fetch fails
        (bool priceSuccess, int256 price) = _fetchPrice(round.asset);
        if (!priceSuccess || price <= 0) return false;
        
        // Start the round
        round.lockPrice = price;
        round.status = RoundStatus.Live;
        _removeFromOpenRounds(roundId);
        liveRoundIds.push(roundId);
        emit RoundStarted(roundId, round.lockPrice);
        return true;
    }

    function _closeRound(uint128 roundId) internal returns (bool){
        Round storage round = rounds[roundId];
        if (round.lockAt == 0) return false;
        if (round.status != RoundStatus.Live) return false;
        if (block.timestamp < round.closeAt) return false;
        if (block.timestamp > round.closeAt + dataWaitWindow) {
            round.status = RoundStatus.Cancelled;
            _removeFromLiveRounds(roundId);
            emit RoundCancelled(roundId);
            return true;
        }

        (bool priceSuccess, int256 price) = _fetchPrice(round.asset);
        if (!priceSuccess || price <= 0) return false;
        round.closePrice = price;
        Position finalPos;
        if (round.closePrice > round.lockPrice) {
            finalPos = Position.Up;
        } else if (round.closePrice < round.lockPrice) {
            finalPos = Position.Down;
        } else {
            finalPos = Position.Unset; // tie
        }
        if (finalPos == Position.Unset) {
            round.status = RoundStatus.Cancelled;
            _removeFromLiveRounds(roundId);
            emit RoundCancelled(roundId);
        } else {
            round.finalPosition = finalPos;
            round.status = RoundStatus.Closed;
            _removeFromLiveRounds(roundId);
            emit RoundClosed(roundId, round.closePrice, round.finalPosition);
        } 
        return true;   
    }

    function _fetchPrice(Asset asset) internal view returns (bool success, int256 price) {
    
        bytes32 priceFeedId;
        
        if (asset == Asset.Eth) {
            priceFeedId = priceFeedETH;
        } else if (asset == Asset.Arb) {
            priceFeedId = priceFeedARB;
        } else if (asset == Asset.Aave) {
            priceFeedId = priceFeedAAVE;
        } else if (asset == Asset.Btc) {
            priceFeedId = priceFeedBTC;
        } else if (asset == Asset.Sol) {
            priceFeedId = priceFeedSOL;
        } else if (asset == Asset.Xrp) {
            priceFeedId = priceFeedXRP;
        } else if (asset == Asset.Bnb) {
            priceFeedId = priceFeedBNB;
        } else if (asset == Asset.Doge) {
            priceFeedId = priceFeedDOGE;
        } else if (asset == Asset.Pepe) {
            priceFeedId = priceFeedPEPE;
        } else if (asset == Asset.Shib) {
            priceFeedId = priceFeedSHIB;
        } else {
            revert PriceFeedNotConfigured();
        }
        
        if (priceFeedId == bytes32(0)) revert PriceFeedNotConfigured();

        PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceFeedId, priceMaxAge);
        if (pythPrice.price <= 0 || pythPrice.conf == type(uint64).max) {
            return (false, 0);
        }
        return (true, pythPrice.price);
    }

    function _removeFromOpenRounds(uint128 roundId) internal {
        for (uint256 i = 0; i < openRoundIds.length; i++) {
            if (openRoundIds[i] == roundId) {
                openRoundIds[i] = openRoundIds[openRoundIds.length - 1];
                openRoundIds.pop();
                break;
            }
        }
    }

    function _removeFromLiveRounds(uint128 roundId) internal {
        for (uint256 i = 0; i < liveRoundIds.length; i++) {
            if (liveRoundIds[i] == roundId) {
                liveRoundIds[i] = liveRoundIds[liveRoundIds.length - 1];
                liveRoundIds.pop();
                break;
            }
        }
    }

    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}