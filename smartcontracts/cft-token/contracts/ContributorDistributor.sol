// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ICFTTokenMint
/// @notice Minimal mint interface required by the contributor distributor.
interface ICFTTokenMint {
    function mint(address to, uint256 amount) external;
}

/// @title ContributorDistributor
/// @notice Mints CFT payouts for approved contributor tasks.
/// @dev Accounts with PAYOUT_ROLE can mint task-specific rewards exactly once per task id.
contract ContributorDistributor is AccessControl {
    bytes32 public constant PAYOUT_ROLE = keccak256("PAYOUT_ROLE");

    error ZeroCftAddress();
    error ZeroAdminAddress();
    error ZeroRecipientAddress();
    error ZeroAmount();
    error TaskAlreadyPaid(bytes32 taskId);

    ICFTTokenMint public immutable cft;

    // Prevent paying the same task twice
    mapping(bytes32 => bool) public taskPaid;

    event Paid(address indexed to, uint256 amount, bytes32 indexed taskId);

    /// @notice Creates a distributor tied to a token and admin.
    /// @param cftToken_ Address of the CFT token to mint.
    /// @param admin_ Address receiving admin and payout roles.
    constructor(address cftToken_, address admin_) {
        if (cftToken_ == address(0)) revert ZeroCftAddress();
        if (admin_ == address(0)) revert ZeroAdminAddress();

        cft = ICFTTokenMint(cftToken_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PAYOUT_ROLE, admin_);
    }

    /// @notice Mints a payout for a task that has not yet been paid.
    /// @param to Contributor receiving the payout.
    /// @param amount Amount of CFT to mint.
    /// @param taskId Unique task identifier used to prevent double payment.
    function payout(address to, uint256 amount, bytes32 taskId)
        external
        onlyRole(PAYOUT_ROLE)
    {
        if (to == address(0)) revert ZeroRecipientAddress();
        if (amount == 0) revert ZeroAmount();
        if (taskPaid[taskId]) revert TaskAlreadyPaid(taskId);

        taskPaid[taskId] = true;

        cft.mint(to, amount);

        emit Paid(to, amount, taskId);
    }
}