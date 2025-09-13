// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAuction {
    function placeBid(uint256 auctionId, uint256 amount, uint256 minAmountOut) external;
    function settle(uint256 auctionId) external;
    function claim(uint256 auctionId) external;
}

interface ICircleVault {
    function depositDomain(uint256 auctionId, uint256 domainTokenId) external;
    function withdrawDomain(uint256 auctionId, address to) external;
}

/// @title AuctionAdapter
/// @notice Interfaces with Doma auction contracts and CircleVault for domain custody
contract AuctionAdapter is Ownable, ReentrancyGuard {
    IAuction public auction;
    ICircleVault public vault;

    event BidPlaced(address indexed circle, uint256 indexed auctionId, uint256 amount, uint256 minAmountOut);
    event AuctionSettled(uint256 indexed auctionId);
    event AuctionClaimed(uint256 indexed auctionId, address indexed claimer);
    event DomainDeposited(uint256 indexed auctionId, address indexed domain);
    event DomainWithdrawn(uint256 indexed auctionId, address indexed to);

    error SlippageProtection();
    error NotCircleTreasury();
    error InvalidAuction();
    error InvalidVault();

    modifier onlyTreasury() {
        // Only callable by CircleTreasury (set as owner or via registry)
        if (msg.sender != owner()) revert NotCircleTreasury();
        _;
    }

    constructor(address _auction, address _vault) Ownable(msg.sender) {
        if (_auction == address(0)) revert InvalidAuction();
        if (_vault == address(0)) revert InvalidVault();
        auction = IAuction(_auction);
        vault = ICircleVault(_vault);
    }

    function placeBid(uint256 auctionId, uint256 amount, uint256 minAmountOut) external onlyTreasury nonReentrant {
        // Slippage protection: check minAmountOut logic as needed
        auction.placeBid(auctionId, amount, minAmountOut);
        emit BidPlaced(msg.sender, auctionId, amount, minAmountOut);
    }

    function settleAuction(uint256 auctionId) external onlyTreasury nonReentrant {
        auction.settle(auctionId);
        emit AuctionSettled(auctionId);
    }

    function claimAuction(uint256 auctionId) external onlyTreasury nonReentrant {
        auction.claim(auctionId);
        emit AuctionClaimed(auctionId, msg.sender);
    }

    function depositDomain(uint256 auctionId, uint256 domainTokenId) external onlyTreasury {
        vault.depositDomain(auctionId, domainTokenId);
        emit DomainDeposited(auctionId, address(0)); // Use address(0) for tokenId events
    }

    function withdrawDomain(uint256 auctionId, address to) external onlyTreasury {
        vault.withdrawDomain(auctionId, to);
        emit DomainWithdrawn(auctionId, to);
    }

    function setAuction(address _auction) external onlyOwner {
        if (_auction == address(0)) revert InvalidAuction();
        auction = IAuction(_auction);
    }

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert InvalidVault();
        vault = ICircleVault(_vault);
    }
}
