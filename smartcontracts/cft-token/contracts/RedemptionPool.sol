// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ICFTTokenBurn
/// @notice Minimal token interface required by the redemption pool.
interface ICFTTokenBurn {
    function totalSupply() external view returns (uint256);
    function burnFromRole(address from, uint256 amount) external;
}

/// @title RedemptionPool
/// @notice Holds USDC revenue and allows contributors to redeem CFT for a pro-rata share.
/// @dev The pool must hold BURNER_ROLE on the token so it can burn CFT after transfer.
contract RedemptionPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroUsdcAddress();
    error ZeroCftAddress();
    error ZeroAmount();
    error SlippageExceeded(uint256 minimumOut, uint256 actualOut);
    error ZeroUsdcOut();

    IERC20 public immutable usdc;
    ICFTTokenBurn public immutable cft;

    event RevenueDeposited(address indexed from, uint256 amount);
    event Redeemed(address indexed redeemer, uint256 cftIn, uint256 usdcOut);

    /// @notice Creates a redemption pool bound to a USDC token and CFT token.
    /// @param usdc_ Address of the ERC-20 asset paid out on redemption.
    /// @param cft_ Address of the CFT token being redeemed.
    constructor(address usdc_, address cft_) {
        if (usdc_ == address(0)) revert ZeroUsdcAddress();
        if (cft_ == address(0)) revert ZeroCftAddress();
        usdc = IERC20(usdc_);
        cft = ICFTTokenBurn(cft_);
    }

    /// @notice Quotes the USDC output for redeeming a given amount of CFT.
    /// @param cftAmountIn Amount of CFT to redeem.
    /// @return usdcOut Pro-rata USDC output based on pool balance and CFT supply.
    function quote(uint256 cftAmountIn) public view returns (uint256 usdcOut) {
        uint256 U = usdc.balanceOf(address(this));
        uint256 C = cft.totalSupply();
        if (cftAmountIn == 0 || U == 0 || C == 0) return 0;
        usdcOut = Math.mulDiv(cftAmountIn, U, C);
    }

    /// @notice Deposits USDC revenue that backs future redemptions.
    /// @param usdcAmount Amount of USDC to deposit into the pool.
    function depositRevenue(uint256 usdcAmount) external {
        if (usdcAmount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        emit RevenueDeposited(msg.sender, usdcAmount);
    }

    /// @notice Redeems CFT for USDC using an existing allowance.
    /// @param cftAmountIn Amount of CFT to redeem.
    /// @param minUsdcOut Minimum acceptable USDC output.
    function redeem(uint256 cftAmountIn, uint256 minUsdcOut) external nonReentrant returns (uint256 usdcOut) {
        return _redeem(msg.sender, cftAmountIn, minUsdcOut);
    }

    /// @notice Redeems CFT for USDC after setting allowance via EIP-2612 permit.
    /// @dev This enables a one-transaction redeem flow for wallets that support permit.
    /// @param cftAmountIn Amount of CFT to redeem.
    /// @param minUsdcOut Minimum acceptable USDC output.
    /// @param deadline Permit signature deadline.
    /// @param v Recovery byte of the permit signature.
    /// @param r First 32 bytes of the permit signature.
    /// @param s Second 32 bytes of the permit signature.
    function redeemWithPermit(
        uint256 cftAmountIn,
        uint256 minUsdcOut,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256 usdcOut) {
        IERC20Permit(address(cft)).permit(
            msg.sender,
            address(this),
            cftAmountIn,
            deadline,
            v,
            r,
            s
        );

        return _redeem(msg.sender, cftAmountIn, minUsdcOut);
    }

    /// @dev Executes the redeem flow once allowance is available.
    /// @param redeemer Account redeeming CFT.
    /// @param cftAmountIn Amount of CFT to redeem.
    /// @param minUsdcOut Minimum acceptable USDC output.
    /// @return usdcOut Final USDC amount sent to the redeemer.
    function _redeem(address redeemer, uint256 cftAmountIn, uint256 minUsdcOut)
        internal
        returns (uint256 usdcOut)
    {
        if (cftAmountIn == 0) revert ZeroAmount();

        usdcOut = quote(cftAmountIn);
        if (usdcOut < minUsdcOut) revert SlippageExceeded(minUsdcOut, usdcOut);
        if (usdcOut == 0) revert ZeroUsdcOut();

        IERC20(address(cft)).safeTransferFrom(redeemer, address(this), cftAmountIn);

        cft.burnFromRole(address(this), cftAmountIn);

        usdc.safeTransfer(redeemer, usdcOut);

        emit Redeemed(redeemer, cftAmountIn, usdcOut);
    }
}