// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IChainlinkAggregator {
    function latestAnswer() external view returns (int256);
}

contract CollateralManager is Ownable, Pausable, ReentrancyGuard {
    enum AssetType { MirrorNFT, WAVAX, USDCe }

    struct CollateralConfig {
        uint256 ltv; // Loan-to-value ratio (bps, e.g. 7500 = 75%)
        uint256 liquidationThreshold; // (bps)
        address priceFeed; // Chainlink aggregator
        address token; // ERC20 or ERC721
        bool isERC721;
    }

    mapping(AssetType => CollateralConfig) public collateralConfigs;
    mapping(address => mapping(AssetType => uint256)) public erc20Collateral; // user => asset => amount
    mapping(address => mapping(AssetType => uint256[])) public erc721Collateral; // user => asset => tokenIds
    mapping(address => bool) public isLiquidated;
    bool public oraclePaused;

    event CollateralPosted(address indexed user, AssetType indexed asset, uint256 amountOrTokenId);
    event CollateralWithdrawn(address indexed user, AssetType indexed asset, uint256 amountOrTokenId);
    event Liquidated(address indexed user);
    event OraclePaused(address indexed by);
    event OracleUnpaused(address indexed by);

    error OraclePausedError();
    error NotEnoughCollateral();
    error NotOwnerOfNFT();
    error NotLiquidatable();
    error InvalidAsset();

    modifier oracleActive() {
        if (oraclePaused) revert OraclePausedError();
        _;
    }

    constructor(
        address mirrorNFT,
        address wavax,
        address usdc,
        address mirrorNFTFeed,
        address wavaxFeed,
        address usdcFeed
    ) Ownable(msg.sender) {
        collateralConfigs[AssetType.MirrorNFT] = CollateralConfig({
            ltv: 6000, // 60%
            liquidationThreshold: 8000, // 80%
            priceFeed: mirrorNFTFeed,
            token: mirrorNFT,
            isERC721: true
        });
        collateralConfigs[AssetType.WAVAX] = CollateralConfig({
            ltv: 7500, // 75%
            liquidationThreshold: 8500, // 85%
            priceFeed: wavaxFeed,
            token: wavax,
            isERC721: false
        });
        collateralConfigs[AssetType.USDCe] = CollateralConfig({
            ltv: 9000, // 90%
            liquidationThreshold: 9500, // 95%
            priceFeed: usdcFeed,
            token: usdc,
            isERC721: false
        });
    }

    function _postCollateral(address user, AssetType asset, uint256 amountOrTokenId) internal {
        CollateralConfig memory cfg = collateralConfigs[asset];
        if (cfg.isERC721) {
            IERC721(cfg.token).transferFrom(user, address(this), amountOrTokenId);
            erc721Collateral[user][asset].push(amountOrTokenId);
        } else {
            IERC20(cfg.token).transferFrom(user, address(this), amountOrTokenId);
            erc20Collateral[user][asset] += amountOrTokenId;
        }
        emit CollateralPosted(user, asset, amountOrTokenId);
    }

    function postCollateral(AssetType asset, uint256 amountOrTokenId) external whenNotPaused nonReentrant oracleActive {
        _postCollateral(msg.sender, asset, amountOrTokenId);
    }

    function _withdrawCollateral(address user, AssetType asset, uint256 amountOrTokenId) internal {
        CollateralConfig memory cfg = collateralConfigs[asset];
        if (cfg.isERC721) {
            // Only allow withdrawal if user owns the NFT in vault
            uint256[] storage tokens = erc721Collateral[user][asset];
            bool found = false;
            for (uint256 i = 0; i < tokens.length; i++) {
                if (tokens[i] == amountOrTokenId) {
                    tokens[i] = tokens[tokens.length - 1];
                    tokens.pop();
                    found = true;
                    break;
                }
            }
            if (!found) revert NotOwnerOfNFT();
            IERC721(cfg.token).safeTransferFrom(address(this), user, amountOrTokenId);
        } else {
            if (erc20Collateral[user][asset] < amountOrTokenId) revert NotEnoughCollateral();
            erc20Collateral[user][asset] -= amountOrTokenId;
            IERC20(cfg.token).transfer(user, amountOrTokenId);
        }
        emit CollateralWithdrawn(user, asset, amountOrTokenId);
    }

    function withdrawCollateral(AssetType asset, uint256 amountOrTokenId) external whenNotPaused nonReentrant oracleActive {
        _withdrawCollateral(msg.sender, asset, amountOrTokenId);
    }

    function calculateHealthFactor(address user) public view oracleActive returns (uint256 healthFactorBps) {
        uint256 totalCollateralUsd = 0;
        uint256 totalDebtUsd = 1; // Avoid div by zero
        for (uint8 i = 0; i < 3; i++) {
            CollateralConfig memory cfg = collateralConfigs[AssetType(i)];
            uint256 price = getPrice(cfg.priceFeed);
            if (cfg.isERC721) {
                uint256[] storage tokens = erc721Collateral[user][AssetType(i)];
                totalCollateralUsd += tokens.length * price * cfg.ltv / 10000;
            } else {
                totalCollateralUsd += erc20Collateral[user][AssetType(i)] * price * cfg.ltv / 1e18 / 10000;
            }
        }
        // For demo, assume totalDebtUsd = 1. In production, integrate with lending logic.
        healthFactorBps = (totalCollateralUsd * 10000) / totalDebtUsd;
    }

    function liquidate(address user) external whenNotPaused nonReentrant oracleActive {
        require(!isLiquidated[user], "Already liquidated");
        uint256 health = calculateHealthFactor(user);
        bool canLiquidate = false;
        for (uint8 i = 0; i < 3; i++) {
            CollateralConfig memory cfg = collateralConfigs[AssetType(i)];
            if (health < cfg.liquidationThreshold) {
                canLiquidate = true;
                break;
            }
        }
        if (!canLiquidate) revert NotLiquidatable();
        isLiquidated[user] = true;
        emit Liquidated(user);
        // In production, transfer collateral to liquidator or auction
    }

    function getPrice(address feed) public view oracleActive returns (uint256) {
        int256 answer = IChainlinkAggregator(feed).latestAnswer();
        require(answer > 0, "Invalid price");
        return uint256(answer);
    }

    function pauseOracle() external onlyOwner {
        oraclePaused = true;
        emit OraclePaused(msg.sender);
    }
    function unpauseOracle() external onlyOwner {
        oraclePaused = false;
        emit OracleUnpaused(msg.sender);
    }

    // Batch operations for gas efficiency
    function batchPostCollateral(AssetType[] calldata assets, uint256[] calldata amountsOrTokenIds) external whenNotPaused nonReentrant oracleActive {
        require(assets.length == amountsOrTokenIds.length, "Length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            _postCollateral(msg.sender, assets[i], amountsOrTokenIds[i]);
        }
    }
    function batchWithdrawCollateral(AssetType[] calldata assets, uint256[] calldata amountsOrTokenIds) external whenNotPaused nonReentrant oracleActive {
        require(assets.length == amountsOrTokenIds.length, "Length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            _withdrawCollateral(msg.sender, assets[i], amountsOrTokenIds[i]);
        }
    }
}
