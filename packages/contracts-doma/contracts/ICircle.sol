// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICircle - Interface for Circle contract management
/// @notice Defines core circle, treasury, governance, and member management functions
interface ICircle {
    // --- Events ---
    event MemberJoined(address indexed member);
    event MemberLeft(address indexed member);
    event TreasuryDeposit(address indexed from, uint256 amount);
    event TreasuryWithdrawal(address indexed to, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    // --- Circle Management ---
    function joinCircle(address member) external;
    function leaveCircle(address member) external;
    function isMember(address member) external view returns (bool);
    function getMemberCount() external view returns (uint256);

    // --- Treasury Management ---
    function deposit() external payable;
    function withdraw(address to, uint256 amount) external;
    function getTreasuryBalance() external view returns (uint256);

    // --- Governance ---
    function createProposal(string calldata description) external returns (uint256);
    function vote(uint256 proposalId, bool support) external;
    function executeProposal(uint256 proposalId) external;
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed
    );

    // --- Auction Integration ---
    function onAuctionResult(uint256 auctionId, address winner, uint256 amount) external;
}
