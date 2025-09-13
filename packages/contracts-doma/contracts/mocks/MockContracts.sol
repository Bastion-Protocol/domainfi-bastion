// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAuctionAdapter {
    event BidPlaced(uint256 auctionId, uint256 amount, uint256 minAmountOut);

    function placeBid(uint256 auctionId, uint256 amount, uint256 minAmountOut) external {
        emit BidPlaced(auctionId, amount, minAmountOut);
    }
}

contract MockAuction {
    function placeBid(uint256 auctionId, uint256 amount, uint256 minAmountOut) external {}
    function settle(uint256 auctionId) external {}
    function claim(uint256 auctionId) external {}
}

contract MockVault {
    function depositDomain(uint256 auctionId, uint256 domainTokenId) external {}
    function withdrawDomain(uint256 auctionId, address to) external {}
}
