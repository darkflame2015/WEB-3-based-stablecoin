// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TipJar - simple contract to collect tips with messages
/// @notice Accepts ETH tips and lets the owner withdraw collected balance.
contract TipJar {
    event Tipped(address indexed from, uint256 amount, string message);
    event Withdrawn(address indexed to, uint256 amount);

    address public immutable owner;

    struct Tip {
        address from;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    Tip[] private tips;

    constructor() {
        owner = msg.sender;
    }

    /// @notice Send a tip with an optional message
    function tip(string calldata message) external payable {
        require(msg.value > 0, "No ETH sent");
        tips.push(Tip({
            from: msg.sender,
            amount: msg.value,
            message: message,
            timestamp: block.timestamp
        }));
        emit Tipped(msg.sender, msg.value, message);
    }

    /// @notice Owner withdraws the full balance
    function withdraw(address payable to) external {
        require(msg.sender == owner, "Not owner");
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "Transfer failed");
        emit Withdrawn(to, bal);
    }

    /// @notice Get total collected balance
    function balance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @notice List all tips
    function getTips() external view returns (Tip[] memory) {
        return tips;
    }
}
