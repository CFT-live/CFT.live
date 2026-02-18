// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CFTToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public immutable MAX_SUPPLY;

    error MaxSupplyExceeded(uint256 attempted, uint256 max);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address admin_
    ) ERC20(name_, symbol_) {
        require(admin_ != address(0), "admin=0");
        MAX_SUPPLY = maxSupply_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 newTotal = totalSupply() + amount;
        if (newTotal > MAX_SUPPLY) revert MaxSupplyExceeded(newTotal, MAX_SUPPLY);
        _mint(to, amount);
    }

    // Intended to be called by RedemptionPool after it has received CFT via transferFrom.
    function burnFromRole(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
}