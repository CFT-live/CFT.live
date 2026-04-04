// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenFaucet
 * @notice A faucet for a single ERC-20 token chosen at deployment time.
 * @dev DEFAULT_ADMIN_ROLE controls withdrawals and pause. ALLOCATOR_ROLE
 * (granted to the backend wallet) assigns claimable balances to users.
 * Users claim tokens themselves via claim().
 */
contract TokenFaucet is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role that can allocate claimable amounts to users (backend wallet)
    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");

    /// @notice ERC-20 token distributed by this faucet
    IERC20 public immutable token;

    /// @notice Remaining amount each user is allowed to claim
    mapping(address => uint256) public claimableAmount;

    error ZeroAddress();
    error ZeroAmount();
    error ArrayLengthMismatch();
    error ExceedsClaimableBalance(uint256 requested, uint256 available);
    error InsufficientFaucetBalance(uint256 requested, uint256 available);

    event Claimed(address indexed user, uint256 amount);
    event ClaimAmountAdded(address indexed user, uint256 amountAdded, uint256 newTotal);
    event ClaimAmountSet(address indexed user, uint256 newAmount);
    event TokensWithdrawn(address indexed to, uint256 amount);

    /**
     * @param tokenAddress Address of the ERC-20 token this faucet will distribute
     * @param admin Address granted DEFAULT_ADMIN_ROLE (can grant/revoke roles, withdraw, pause)
     * @param allocator Address granted ALLOCATOR_ROLE (backend wallet that assigns rewards)
     */
    constructor(address tokenAddress, address admin, address allocator) {
        if (tokenAddress == address(0) || admin == address(0) || allocator == address(0)) {
            revert ZeroAddress();
        }

        token = IERC20(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ALLOCATOR_ROLE, allocator);
    }

    /**
     * @notice Claim some of your assigned tokens
     * @param amount Amount to claim in the token's smallest unit
     */
    function claim(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 availableToClaim = claimableAmount[msg.sender];
        if (amount > availableToClaim) {
            revert ExceedsClaimableBalance(amount, availableToClaim);
        }

        uint256 faucetBalance = token.balanceOf(address(this));
        if (amount > faucetBalance) {
            revert InsufficientFaucetBalance(amount, faucetBalance);
        }

        // Effects before interaction (CEI pattern)
        claimableAmount[msg.sender] = availableToClaim - amount;

        token.safeTransfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    /**
     * @notice Increase a user's claimable amount
     * @param user Address whose allowance should be increased
     * @param amountToAdd Amount to add
     */
    function addClaimAmount(address user, uint256 amountToAdd) external onlyRole(ALLOCATOR_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (amountToAdd == 0) revert ZeroAmount();

        uint256 newTotal = claimableAmount[user] + amountToAdd;
        claimableAmount[user] = newTotal;

        emit ClaimAmountAdded(user, amountToAdd, newTotal);
    }

    /**
     * @notice Set a user's claimable amount directly (overwrite)
     * @param user Address whose allowance should be set
     * @param newAmount New total claimable amount
     */
    function setClaimAmount(address user, uint256 newAmount) external onlyRole(ALLOCATOR_ROLE) {
        if (user == address(0)) revert ZeroAddress();

        claimableAmount[user] = newAmount;

        emit ClaimAmountSet(user, newAmount);
    }

    /**
     * @notice Batch increase claimable amounts for many users
     * @param users List of user addresses
     * @param amounts List of amounts to add for each user
     */
    function batchAddClaimAmount(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyRole(ALLOCATOR_ROLE) {
        if (users.length != amounts.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < users.length; ++i) {
            if (users[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();

            uint256 newTotal = claimableAmount[users[i]] + amounts[i];
            claimableAmount[users[i]] = newTotal;

            emit ClaimAmountAdded(users[i], amounts[i], newTotal);
        }
    }

    /**
     * @notice Withdraw tokens from the faucet
     * @dev For rescuing unused inventory or rebalancing funds
     * @param to Recipient of the withdrawn tokens
     * @param amount Amount to withdraw
     */
    function withdrawUnusedTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 faucetBalance = token.balanceOf(address(this));
        if (amount > faucetBalance) {
            revert InsufficientFaucetBalance(amount, faucetBalance);
        }

        token.safeTransfer(to, amount);

        emit TokensWithdrawn(to, amount);
    }

    /**
     * @notice Pause all claims — emergency stop
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause claims
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Returns the faucet's current token balance
     */
    function faucetTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}