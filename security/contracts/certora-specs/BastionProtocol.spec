/*
 * Formal Verification Specification for BastionProtocol
 * Using Certora Verification Language (CVL)
 */

methods {
    // State-changing functions
    depositCollateral(uint256 amount) external;
    withdrawCollateral(uint256 amount) external;
    borrow(uint256 amount) external;
    repay(uint256 amount) external;
    liquidate(address borrower) external;
    
    // View functions
    getCollateralBalance(address user) external returns (uint256) envfree;
    getBorrowBalance(address user) external returns (uint256) envfree;
    getHealthFactor(address user) external returns (uint256) envfree;
    getTotalCollateral() external returns (uint256) envfree;
    getTotalBorrowed() external returns (uint256) envfree;
    isLiquidatable(address user) external returns (bool) envfree;
    
    // Oracle functions
    getAssetPrice(address asset) external returns (uint256) envfree;
    
    // System state
    paused() external returns (bool) envfree;
    emergencyStop() external returns (bool) envfree;
}

/*
 * INVARIANT 1: Solvency Invariant
 * The protocol must always be solvent - total collateral value >= total borrowed value
 */
invariant solvencyInvariant()
    getTotalCollateral() * getAssetPrice(collateralAsset()) >= getTotalBorrowed() * getAssetPrice(borrowAsset());

/*
 * INVARIANT 2: User Health Factor Invariant
 * Users with health factor >= 1 should not be liquidatable
 */
invariant healthFactorInvariant(address user)
    getHealthFactor(user) >= 1e18 => !isLiquidatable(user);

/*
 * INVARIANT 3: Balance Consistency
 * Sum of individual user balances equals total protocol balances
 */
invariant balanceConsistency()
    sumOfUserCollateralBalances() == getTotalCollateral() &&
    sumOfUserBorrowBalances() == getTotalBorrowed();

/*
 * INVARIANT 4: Non-negative Balances
 * User balances should never be negative
 */
invariant nonNegativeBalances(address user)
    getCollateralBalance(user) >= 0 && getBorrowBalance(user) >= 0;

/*
 * RULE 1: Deposit Increases User Balance
 * Depositing collateral should increase user's collateral balance
 */
rule depositIncreasesBalance(address user, uint256 amount) {
    require amount > 0;
    require !paused();
    
    uint256 balanceBefore = getCollateralBalance(user);
    
    depositCollateral(e, amount);
    
    uint256 balanceAfter = getCollateralBalance(user);
    
    assert balanceAfter == balanceBefore + amount;
}

/*
 * RULE 2: Withdraw Decreases User Balance
 * Withdrawing collateral should decrease user's collateral balance
 */
rule withdrawDecreasesBalance(address user, uint256 amount) {
    require amount > 0;
    require !paused();
    require getCollateralBalance(user) >= amount;
    require getHealthFactor(user) >= 1.2e18; // Minimum health factor after withdrawal
    
    uint256 balanceBefore = getCollateralBalance(user);
    
    withdrawCollateral(e, amount);
    
    uint256 balanceAfter = getCollateralBalance(user);
    
    assert balanceAfter == balanceBefore - amount;
}

/*
 * RULE 3: Borrow Increases Debt
 * Borrowing should increase user's borrow balance
 */
rule borrowIncreasesDebt(address user, uint256 amount) {
    require amount > 0;
    require !paused();
    require getHealthFactor(user) >= 1.2e18; // Sufficient collateral
    
    uint256 debtBefore = getBorrowBalance(user);
    
    borrow(e, amount);
    
    uint256 debtAfter = getBorrowBalance(user);
    
    assert debtAfter == debtBefore + amount;
}

/*
 * RULE 4: Repay Decreases Debt
 * Repaying should decrease user's borrow balance
 */
rule repayDecreasesDebt(address user, uint256 amount) {
    require amount > 0;
    require !paused();
    require getBorrowBalance(user) >= amount;
    
    uint256 debtBefore = getBorrowBalance(user);
    
    repay(e, amount);
    
    uint256 debtAfter = getBorrowBalance(user);
    
    assert debtAfter == debtBefore - amount;
}

/*
 * RULE 5: Liquidation Conditions
 * Liquidation should only be possible when user is undercollateralized
 */
rule liquidationConditions(address borrower, address liquidator) {
    require borrower != liquidator;
    require !paused();
    
    bool liquidatableBefore = isLiquidatable(borrower);
    uint256 healthFactorBefore = getHealthFactor(borrower);
    
    liquidate(e, borrower);
    
    // Liquidation should only succeed if user was liquidatable
    assert liquidatableBefore;
    assert healthFactorBefore < 1e18;
}

/*
 * RULE 6: Health Factor Monotonicity
 * Actions that increase collateral or decrease debt should improve health factor
 */
rule healthFactorMonotonicity(address user, uint256 amount) {
    require amount > 0;
    require !paused();
    
    uint256 healthFactorBefore = getHealthFactor(user);
    
    // Test collateral deposit
    depositCollateral(e, amount);
    uint256 healthFactorAfterDeposit = getHealthFactor(user);
    assert healthFactorAfterDeposit >= healthFactorBefore;
    
    // Reset state and test debt repayment
    require getBorrowBalance(user) >= amount;
    repay(e, amount);
    uint256 healthFactorAfterRepay = getHealthFactor(user);
    assert healthFactorAfterRepay >= healthFactorBefore;
}

/*
 * RULE 7: Emergency Stop Functionality
 * When emergency stop is active, critical functions should be paused
 */
rule emergencyStopFunctionality(address user, uint256 amount) {
    require emergencyStop();
    
    // All critical functions should revert when emergency stop is active
    depositCollateral@withrevert(e, amount);
    assert lastReverted;
    
    withdrawCollateral@withrevert(e, amount);
    assert lastReverted;
    
    borrow@withrevert(e, amount);
    assert lastReverted;
}

/*
 * RULE 8: Price Oracle Validation
 * Functions should handle oracle price updates correctly
 */
rule priceOracleValidation(address user, uint256 newPrice) {
    require newPrice > 0;
    require newPrice <= MAX_REASONABLE_PRICE();
    
    uint256 healthFactorBefore = getHealthFactor(user);
    
    // Simulate price update
    updateAssetPrice(e, collateralAsset(), newPrice);
    
    uint256 healthFactorAfter = getHealthFactor(user);
    
    // Health factor should change proportionally to price change
    assert healthFactorAfter != healthFactorBefore => newPrice != getAssetPrice(collateralAsset());
}

/*
 * RULE 9: Reentrancy Protection
 * State should not change during external calls
 */
rule reentrancyProtection(address user, uint256 amount) {
    uint256 totalCollateralBefore = getTotalCollateral();
    uint256 totalBorrowedBefore = getTotalBorrowed();
    
    depositCollateral(e, amount);
    
    uint256 totalCollateralAfter = getTotalCollateral();
    uint256 totalBorrowedAfter = getTotalBorrowed();
    
    // Only collateral should change, not borrowed amount
    assert totalCollateralAfter == totalCollateralBefore + amount;
    assert totalBorrowedAfter == totalBorrowedBefore;
}

/*
 * RULE 10: Interest Accrual Consistency
 * Interest should accrue consistently over time
 */
rule interestAccrualConsistency(address user, uint256 timeElapsed) {
    require timeElapsed > 0;
    require getBorrowBalance(user) > 0;
    
    uint256 debtBefore = getBorrowBalance(user);
    
    // Simulate time passage
    advanceTime(timeElapsed);
    accrueInterest(e, user);
    
    uint256 debtAfter = getBorrowBalance(user);
    
    // Debt should increase due to interest
    assert debtAfter > debtBefore;
    
    // Interest should be proportional to time elapsed
    uint256 interest = debtAfter - debtBefore;
    assert interest <= debtBefore * getInterestRate() * timeElapsed / (365 days * 1e18);
}

/*
 * Helper functions for specifications
 */
ghost sumOfUserCollateralBalances() returns uint256;
ghost sumOfUserBorrowBalances() returns uint256;
ghost MAX_REASONABLE_PRICE() returns uint256;
ghost collateralAsset() returns address;
ghost borrowAsset() returns address;
ghost getInterestRate() returns uint256;
