// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ICFTTokenMint {
    function mint(address to, uint256 amount) external;
}

contract ContributorDistributor is AccessControl {
    bytes32 public constant PAYOUT_ROLE = keccak256("PAYOUT_ROLE");

    ICFTTokenMint public immutable cft;

    // Prevent paying the same task twice
    mapping(bytes32 => bool) public taskPaid;

    event Paid(address indexed to, uint256 amount, bytes32 indexed taskId);

    constructor(address cftToken_, address admin_) {
        require(cftToken_ != address(0), "cft=0");
        require(admin_ != address(0), "admin=0");

        cft = ICFTTokenMint(cftToken_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PAYOUT_ROLE, admin_);
    }

    function payout(address to, uint256 amount, bytes32 taskId)
        external
        onlyRole(PAYOUT_ROLE)
    {
        require(to != address(0), "to=0");
        require(amount > 0, "amount=0");
        require(!taskPaid[taskId], "task paid");

        taskPaid[taskId] = true;

        cft.mint(to, amount);

        emit Paid(to, amount, taskId);
    }
}