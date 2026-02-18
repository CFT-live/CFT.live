// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ICFTTokenBurn {
    function totalSupply() external view returns (uint256);
    function burnFromRole(address from, uint256 amount) external;
}

contract RedemptionPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    ICFTTokenBurn public immutable cft;

    event RevenueDeposited(address indexed from, uint256 amount);
    event Redeemed(address indexed redeemer, uint256 cftIn, uint256 usdcOut);

    constructor(address usdc_, address cft_) {
        require(usdc_ != address(0), "usdc=0");
        require(cft_ != address(0), "cft=0");
        usdc = IERC20(usdc_);
        cft = ICFTTokenBurn(cft_);
    }

    function quote(uint256 cftAmountIn) public view returns (uint256 usdcOut) {
        uint256 U = usdc.balanceOf(address(this));
        uint256 C = cft.totalSupply();
        if (cftAmountIn == 0 || U == 0 || C == 0) return 0;
        usdcOut = Math.mulDiv(cftAmountIn, U, C);
    }

    function depositRevenue(uint256 usdcAmount) external {
        require(usdcAmount > 0, "amount=0");
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        emit RevenueDeposited(msg.sender, usdcAmount);
    }

    function redeem(uint256 cftAmountIn, uint256 minUsdcOut) external nonReentrant returns (uint256 usdcOut) {
        require(cftAmountIn > 0, "amount=0");

        usdcOut = quote(cftAmountIn);
        require(usdcOut >= minUsdcOut, "slippage");
        require(usdcOut > 0, "usdcOut=0");

        // Pull CFT into the pool (user must approve first)
        IERC20(address(cft)).safeTransferFrom(msg.sender, address(this), cftAmountIn);

        // Burn the CFT now held by the pool (pool must have BURNER_ROLE on the token)
        cft.burnFromRole(address(this), cftAmountIn);

        // Pay USDC out
        usdc.safeTransfer(msg.sender, usdcOut);

        emit Redeemed(msg.sender, cftAmountIn, usdcOut);
    }
}