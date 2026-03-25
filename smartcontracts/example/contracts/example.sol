// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ExampleContract is Ownable {
    IERC20 public immutable token;

    error ZeroAddress();

    event BalanceChecked(address indexed caller, uint256 amount);

    constructor(address tokenAddress, address initialOwner) Ownable(initialOwner) {
        if (tokenAddress == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }

        token = IERC20(tokenAddress);
    }

    function balance() external returns (uint256) {
        uint256 amount = token.balanceOf(msg.sender);
        emit BalanceChecked(msg.sender, amount);
        return amount;
    }
}