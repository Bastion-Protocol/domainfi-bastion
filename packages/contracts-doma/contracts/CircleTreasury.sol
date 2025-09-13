// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAuctionAdapter {
    function placeBid(uint256 auctionId, uint256 amount, uint256 minAmountOut) external;
    function settleAuction(uint256 auctionId) external;
    function claimAuction(uint256 auctionId) external;
}

/// @title CircleTreasury
/// @notice Manages USDC funds, proposals, and multi-sig governance for auction bids
contract CircleTreasury is Ownable, Pausable, ReentrancyGuard {
    IERC20 public immutable usdc;
    IAuctionAdapter public auctionAdapter;
    address[] public signers;
    uint256 public requiredSignatures;

    struct Proposal {
        uint256 auctionId;
        uint256 amount;
        uint256 minAmountOut;
        uint256 approvals;
        bool executed;
        mapping(address => bool) approvedBy;
    }
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, uint256 auctionId, uint256 amount, uint256 minAmountOut);
    event ProposalApproved(uint256 indexed proposalId, address indexed signer);
    event ProposalExecuted(uint256 indexed proposalId);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    error NotSigner();
    error AlreadyApproved();
    error NotEnoughApprovals();
    error ProposalAlreadyExecuted();
    error InvalidSigners();
    error InvalidAdapter();

    modifier onlySigner() {
        bool isValidSigner = false;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == msg.sender) {
                isValidSigner = true;
                break;
            }
        }
        if (!isValidSigner) revert NotSigner();
        _;
    }

    constructor(address _usdc, address _adapter, address[] memory _signers, uint256 _required) Ownable(msg.sender) {
        require(_usdc != address(0) && _adapter != address(0), "Zero address");
        require(_signers.length >= _required && _required > 0, "Invalid signers");
        usdc = IERC20(_usdc);
        auctionAdapter = IAuctionAdapter(_adapter);
        signers = _signers;
        requiredSignatures = _required;
    }

    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Zero amount");
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(address to, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
        require(amount > 0, "Zero amount");
        usdc.transfer(to, amount);
        emit Withdraw(to, amount);
    }

    function createProposal(uint256 auctionId, uint256 amount, uint256 minAmountOut) external onlySigner whenNotPaused returns (uint256) {
        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.auctionId = auctionId;
        p.amount = amount;
        p.minAmountOut = minAmountOut;
        emit ProposalCreated(proposalCount, auctionId, amount, minAmountOut);
        return proposalCount;
    }

    function approveProposal(uint256 proposalId) external onlySigner whenNotPaused {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();
        if (p.approvedBy[msg.sender]) revert AlreadyApproved();
        p.approvedBy[msg.sender] = true;
        p.approvals++;
        emit ProposalApproved(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external onlySigner whenNotPaused nonReentrant {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert ProposalAlreadyExecuted();
        if (p.approvals < requiredSignatures) revert NotEnoughApprovals();
        p.executed = true;
        usdc.approve(address(auctionAdapter), p.amount);
        auctionAdapter.placeBid(p.auctionId, p.amount, p.minAmountOut);
        emit ProposalExecuted(proposalId);
    }

    function setAuctionAdapter(address _adapter) external onlyOwner {
        if (_adapter == address(0)) revert InvalidAdapter();
        auctionAdapter = IAuctionAdapter(_adapter);
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    function isSigner(address account) public view returns (bool) {
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == account) return true;
        }
        return false;
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }
}
