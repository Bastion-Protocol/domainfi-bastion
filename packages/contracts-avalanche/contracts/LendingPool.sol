// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICollateralManager {
    function calculateHealthFactor(address user) external view returns (uint256);
    function postCollateral(uint8 asset, uint256 amountOrTokenId) external;
    function withdrawCollateral(uint8 asset, uint256 amountOrTokenId) external;
    function isLiquidated(address user) external view returns (bool);
}

contract LendingPool is Ownable, Pausable, ReentrancyGuard {
    enum Asset { USDCe, WAVAX }

    struct Loan {
        address borrower;
        uint8 collateralType;
        uint256 collateralIdOrAmount;
        Asset asset;
        uint256 principal;
        uint256 interestIndex;
        uint256 lastAccrued;
        bool liquidated;
    }

    mapping(Asset => IERC20) public supportedAssets;
    mapping(Asset => uint256) public totalLiquidity;
    mapping(Asset => uint256) public totalBorrows;
    mapping(Asset => uint256) public interestRateBps; // e.g. 500 = 5%
    mapping(Asset => uint256) public utilizationRateBps;
    mapping(uint256 => Loan) public loans;
    uint256 public loanCount;
    ICollateralManager public collateralManager;
    uint256 public constant YEAR = 365 days;

    event LoanCreated(uint256 indexed loanId, address indexed borrower, Asset asset, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event LoanLiquidated(uint256 indexed loanId);
    event LiquidityAdded(address indexed provider, Asset asset, uint256 amount);
    event LiquidityRemoved(address indexed provider, Asset asset, uint256 amount);
    event InterestRateUpdated(Asset asset, uint256 newRateBps);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    error NotEnoughLiquidity();
    error NotBorrower();
    error NotLiquidatable();
    error AlreadyLiquidated();
    error InvalidAsset();

    modifier onlySupportedAsset(Asset asset) {
        require(address(supportedAssets[asset]) != address(0), "Asset not supported");
        _;
    }

    constructor(address usdc, address wavax, address _collateralManager) Ownable(msg.sender) {
        supportedAssets[Asset.USDCe] = IERC20(usdc);
        supportedAssets[Asset.WAVAX] = IERC20(wavax);
        interestRateBps[Asset.USDCe] = 500; // 5% fixed
        interestRateBps[Asset.WAVAX] = 700; // 7% fixed
        collateralManager = ICollateralManager(_collateralManager);
    }

    function addLiquidity(Asset asset, uint256 amount) external onlySupportedAsset(asset) whenNotPaused nonReentrant {
        supportedAssets[asset].transferFrom(msg.sender, address(this), amount);
        totalLiquidity[asset] += amount;
        emit LiquidityAdded(msg.sender, asset, amount);
    }

    function removeLiquidity(Asset asset, uint256 amount) external onlySupportedAsset(asset) whenNotPaused nonReentrant {
        require(totalLiquidity[asset] >= amount, "Insufficient pool liquidity");
        totalLiquidity[asset] -= amount;
        supportedAssets[asset].transfer(msg.sender, amount);
        emit LiquidityRemoved(msg.sender, asset, amount);
    }

    function borrow(uint8 collateralType, uint256 collateralIdOrAmount, Asset asset, uint256 amount) external onlySupportedAsset(asset) whenNotPaused nonReentrant {
        require(totalLiquidity[asset] >= amount, "Insufficient pool liquidity");
        collateralManager.postCollateral(collateralType, collateralIdOrAmount);
        // LTV and health factor checks
        require(collateralManager.calculateHealthFactor(msg.sender) >= 10000, "Insufficient collateral");
        // Create loan
        loanCount++;
        loans[loanCount] = Loan({
            borrower: msg.sender,
            collateralType: collateralType,
            collateralIdOrAmount: collateralIdOrAmount,
            asset: asset,
            principal: amount,
            interestIndex: 0,
            lastAccrued: block.timestamp,
            liquidated: false
        });
        totalLiquidity[asset] -= amount;
        totalBorrows[asset] += amount;
        supportedAssets[asset].transfer(msg.sender, amount);
        emit LoanCreated(loanCount, msg.sender, asset, amount);
    }

    function repay(uint256 loanId, uint256 amount) external whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not borrower");
        require(!loan.liquidated, "Already liquidated");
        uint256 interest = accruedInterest(loanId);
        uint256 totalOwed = loan.principal + interest;
        require(amount <= totalOwed, "Repay too much");
        supportedAssets[loan.asset].transferFrom(msg.sender, address(this), amount);
        if (amount >= totalOwed) {
            // Full repayment
            totalLiquidity[loan.asset] += totalOwed;
            totalBorrows[loan.asset] -= loan.principal;
            loan.principal = 0;
        } else {
            // Partial repayment
            loan.principal -= amount;
            totalLiquidity[loan.asset] += amount;
            totalBorrows[loan.asset] -= amount;
        }
        loan.lastAccrued = block.timestamp;
        emit LoanRepaid(loanId, amount);
    }

    function liquidate(uint256 loanId) external whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        require(!loan.liquidated, "Already liquidated");
        require(collateralManager.isLiquidated(loan.borrower), "Not liquidatable");
        loan.liquidated = true;
        // In production, trigger collateral auction or transfer
        emit LoanLiquidated(loanId);
    }

    function accruedInterest(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        uint256 rate = interestRateBps[loan.asset];
        uint256 timeElapsed = block.timestamp - loan.lastAccrued;
        return (loan.principal * rate * timeElapsed) / (10000 * YEAR);
    }

    function setInterestRate(Asset asset, uint256 newRateBps) external onlyOwner onlySupportedAsset(asset) {
        interestRateBps[asset] = newRateBps;
        emit InterestRateUpdated(asset, newRateBps);
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }
    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }
}
