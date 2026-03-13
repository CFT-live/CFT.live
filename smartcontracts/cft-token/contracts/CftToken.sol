// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CFTToken
/// @notice ERC-20 reward token for contributor payouts and USDC-backed redemptions.
/// @dev Minting is restricted to accounts with MINTER_ROLE. Burning through
/// `burnFromRole` is restricted to accounts with BURNER_ROLE and only from the
/// caller's own balance so burner contracts cannot destroy arbitrary holder funds.
contract CFTToken is ERC20, ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error ZeroAdminAddress();
    error BurnFromMismatch(address requestedFrom, address caller);

    /// @notice Creates the token and assigns the default admin role.
    /// @param name_ ERC-20 name and EIP-2612 signing domain name.
    /// @param symbol_ ERC-20 symbol.
    /// @param admin_ Address that receives DEFAULT_ADMIN_ROLE.
    constructor(
        string memory name_,
        string memory symbol_,
        address admin_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (admin_ == address(0)) revert ZeroAdminAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    /// @notice Mints new CFT to a contributor or payout destination.
    /// @param to Recipient of the minted CFT.
    /// @param amount Amount of CFT to mint.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burns CFT held by the burner-role caller.
    /// @dev The burner role is limited to burning its own balance. This keeps the
    /// redemption pool flow working while preventing arbitrary burns from user wallets.
    /// @param from Address whose tokens are being burned.
    /// @param amount Amount of CFT to burn.
    function burnFromRole(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        if (from != _msgSender()) revert BurnFromMismatch(from, _msgSender());
        _burn(from, amount);
    }
}