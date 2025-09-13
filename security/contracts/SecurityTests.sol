// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../../packages/contracts-avalanche/contracts/BastionProtocol.sol";
import "../../packages/contracts-avalanche/contracts/CollateralManager.sol";
import "../../packages/contracts-avalanche/contracts/LendingPool.sol";

/**
 * @title Reentrancy Attack Test Suite
 * @dev Comprehensive tests for reentrancy vulnerabilities across all Bastion contracts
 */
contract ReentrancySecurityTest is Test {
    BastionProtocol bastionProtocol;
    CollateralManager collateralManager;
    LendingPool lendingPool;
    
    MaliciousReentrantContract maliciousContract;
    address attacker;
    address victim;
    
    uint256 constant INITIAL_BALANCE = 100 ether;
    uint256 constant LOAN_AMOUNT = 10 ether;
    uint256 constant COLLATERAL_AMOUNT = 20 ether;

    function setUp() public {
        // Deploy contracts
        bastionProtocol = new BastionProtocol();
        collateralManager = new CollateralManager();
        lendingPool = new LendingPool();
        
        // Setup test accounts
        attacker = makeAddr("attacker");
        victim = makeAddr("victim");
        
        // Fund accounts
        vm.deal(attacker, INITIAL_BALANCE);
        vm.deal(victim, INITIAL_BALANCE);
        
        // Deploy malicious contract
        vm.prank(attacker);
        maliciousContract = new MaliciousReentrantContract(
            address(bastionProtocol),
            address(collateralManager),
            address(lendingPool)
        );
    }

    /**
     * @dev Test reentrancy attack on lending pool withdrawal
     */
    function testReentrancyAttackOnWithdrawal() public {
        // Setup: Victim deposits collateral and borrows
        vm.startPrank(victim);
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        lendingPool.borrow(LOAN_AMOUNT);
        vm.stopPrank();
        
        // Attack: Malicious contract attempts reentrancy
        vm.startPrank(attacker);
        vm.expectRevert("ReentrancyGuard: reentrant call");
        maliciousContract.attemptReentrancyWithdrawal();
        vm.stopPrank();
        
        // Verify: Attack was prevented
        assertEq(address(maliciousContract).balance, 0);
        assertTrue(lendingPool.totalBorrowed() == LOAN_AMOUNT);
    }

    /**
     * @dev Test reentrancy attack on collateral liquidation
     */
    function testReentrancyAttackOnLiquidation() public {
        // Setup: Create undercollateralized position
        vm.startPrank(victim);
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        lendingPool.borrow(LOAN_AMOUNT);
        vm.stopPrank();
        
        // Simulate price drop making position liquidatable
        vm.mockCall(
            address(bastionProtocol.priceOracle()),
            abi.encodeWithSignature("getPrice(address)"),
            abi.encode(5000e18) // 50% price drop
        );
        
        // Attack: Attempt reentrancy during liquidation
        vm.startPrank(attacker);
        vm.expectRevert("ReentrancyGuard: reentrant call");
        maliciousContract.attemptReentrancyLiquidation(victim);
        vm.stopPrank();
        
        // Verify: Attack was prevented
        assertTrue(collateralManager.isHealthy(victim) == false);
        assertEq(maliciousContract.stolenAmount(), 0);
    }

    /**
     * @dev Test cross-contract reentrancy attack
     */
    function testCrossContractReentrancy() public {
        // Setup: Victim has positions across multiple contracts
        vm.startPrank(victim);
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        lendingPool.borrow(LOAN_AMOUNT);
        vm.stopPrank();
        
        // Attack: Attempt cross-contract reentrancy
        vm.startPrank(attacker);
        vm.expectRevert("ReentrancyGuard: reentrant call");
        maliciousContract.attemptCrossContractReentrancy();
        vm.stopPrank();
        
        // Verify: All contracts maintain consistent state
        assertEq(collateralManager.getCollateralAmount(victim), COLLATERAL_AMOUNT);
        assertEq(lendingPool.getBorrowAmount(victim), LOAN_AMOUNT);
    }

    /**
     * @dev Test flash loan reentrancy attack
     */
    function testFlashLoanReentrancyAttack() public {
        // Setup: Fund lending pool
        vm.deal(address(lendingPool), 1000 ether);
        
        // Attack: Attempt flash loan reentrancy
        vm.startPrank(attacker);
        vm.expectRevert("Flash loan reentrancy detected");
        maliciousContract.attemptFlashLoanReentrancy(100 ether);
        vm.stopPrank();
        
        // Verify: Flash loan state is clean
        assertEq(lendingPool.getFlashLoanBalance(), 0);
        assertEq(address(maliciousContract).balance, 0);
    }

    /**
     * @dev Test read-only reentrancy attack
     */
    function testReadOnlyReentrancy() public {
        // Setup: Create position with manipulatable view functions
        vm.startPrank(victim);
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        vm.stopPrank();
        
        // Attack: Attempt to manipulate view functions during callback
        vm.startPrank(attacker);
        vm.expectRevert("Read-only reentrancy detected");
        maliciousContract.attemptReadOnlyReentrancy();
        vm.stopPrank();
        
        // Verify: View functions return consistent values
        assertEq(collateralManager.getTotalValueLocked(), COLLATERAL_AMOUNT);
    }
}

/**
 * @title Malicious Reentrant Contract
 * @dev Contract that attempts various reentrancy attacks
 */
contract MaliciousReentrantContract {
    BastionProtocol public bastionProtocol;
    CollateralManager public collateralManager;
    LendingPool public lendingPool;
    
    uint256 public stolenAmount;
    bool public attacking;

    constructor(address _bastion, address _collateral, address _lending) {
        bastionProtocol = BastionProtocol(_bastion);
        collateralManager = CollateralManager(_collateral);
        lendingPool = LendingPool(_lending);
    }

    function attemptReentrancyWithdrawal() external {
        attacking = true;
        lendingPool.withdraw(1 ether);
    }

    function attemptReentrancyLiquidation(address target) external {
        attacking = true;
        collateralManager.liquidate(target);
    }

    function attemptCrossContractReentrancy() external {
        attacking = true;
        collateralManager.depositCollateral{value: 1 ether}();
    }

    function attemptFlashLoanReentrancy(uint256 amount) external {
        attacking = true;
        lendingPool.flashLoan(amount, "");
    }

    function attemptReadOnlyReentrancy() external {
        attacking = true;
        collateralManager.getTotalValueLocked();
    }

    // Fallback function to attempt reentrancy
    receive() external payable {
        if (attacking && address(this).balance < 50 ether) {
            stolenAmount += msg.value;
            
            // Attempt various reentrancy attacks
            if (msg.sender == address(lendingPool)) {
                lendingPool.withdraw(1 ether);
            } else if (msg.sender == address(collateralManager)) {
                collateralManager.withdraw(1 ether);
            }
        }
    }
}

/**
 * @title Access Control Security Test Suite
 * @dev Tests for privilege escalation and unauthorized access
 */
contract AccessControlSecurityTest is Test {
    BastionProtocol bastionProtocol;
    CollateralManager collateralManager;
    LendingPool lendingPool;
    
    address admin;
    address operator;
    address user;
    address attacker;

    function setUp() public {
        admin = makeAddr("admin");
        operator = makeAddr("operator");
        user = makeAddr("user");
        attacker = makeAddr("attacker");
        
        vm.startPrank(admin);
        bastionProtocol = new BastionProtocol();
        collateralManager = new CollateralManager();
        lendingPool = new LendingPool();
        
        // Setup roles
        bastionProtocol.grantRole(bastionProtocol.OPERATOR_ROLE(), operator);
        vm.stopPrank();
    }

    /**
     * @dev Test unauthorized admin function access
     */
    function testUnauthorizedAdminAccess() public {
        vm.startPrank(attacker);
        
        // Should fail to access admin functions
        vm.expectRevert("AccessControl: account is missing role");
        bastionProtocol.setEmergencyStop(true);
        
        vm.expectRevert("AccessControl: account is missing role");
        collateralManager.setLiquidationThreshold(8000);
        
        vm.expectRevert("AccessControl: account is missing role");
        lendingPool.setInterestRate(500);
        
        vm.stopPrank();
    }

    /**
     * @dev Test privilege escalation attempts
     */
    function testPrivilegeEscalation() public {
        vm.startPrank(operator);
        
        // Operator should not be able to grant admin roles
        vm.expectRevert("AccessControl: account is missing role");
        bastionProtocol.grantRole(bastionProtocol.DEFAULT_ADMIN_ROLE(), attacker);
        
        // Operator should not be able to revoke admin roles
        vm.expectRevert("AccessControl: account is missing role");
        bastionProtocol.revokeRole(bastionProtocol.DEFAULT_ADMIN_ROLE(), admin);
        
        vm.stopPrank();
    }

    /**
     * @dev Test role renunciation attacks
     */
    function testRoleRenunciationAttack() public {
        vm.startPrank(attacker);
        
        // Should not be able to renounce roles they don't have
        vm.expectRevert("AccessControl: can only renounce roles for self");
        bastionProtocol.renounceRole(bastionProtocol.DEFAULT_ADMIN_ROLE(), admin);
        
        vm.stopPrank();
    }

    /**
     * @dev Test signature replay attacks
     */
    function testSignatureReplayAttack() public {
        // Create valid signature from admin
        bytes32 hash = keccak256(abi.encodePacked("setEmergencyStop", true, block.timestamp));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(uint256(keccak256(abi.encode(admin))), hash);
        
        vm.startPrank(attacker);
        
        // First use should work (if we had meta-transactions)
        // Second use should fail due to nonce check
        vm.expectRevert("Invalid signature or nonce");
        bastionProtocol.setEmergencyStopWithSignature(true, v, r, s, 1);
        
        vm.stopPrank();
    }
}

/**
 * @title Oracle Manipulation Security Test Suite
 * @dev Tests for price oracle attacks and manipulation
 */
contract OracleSecurityTest is Test {
    BastionProtocol bastionProtocol;
    CollateralManager collateralManager;
    LendingPool lendingPool;
    MockPriceOracle priceOracle;
    
    address user;
    address attacker;
    
    uint256 constant COLLATERAL_AMOUNT = 10 ether;
    uint256 constant LOAN_AMOUNT = 5 ether;

    function setUp() public {
        user = makeAddr("user");
        attacker = makeAddr("attacker");
        
        bastionProtocol = new BastionProtocol();
        collateralManager = new CollateralManager();
        lendingPool = new LendingPool();
        priceOracle = new MockPriceOracle();
        
        vm.deal(user, 100 ether);
        vm.deal(attacker, 100 ether);
    }

    /**
     * @dev Test price manipulation during liquidation
     */
    function testPriceManipulationLiquidation() public {
        // Setup: User deposits collateral and borrows
        vm.startPrank(user);
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        lendingPool.borrow(LOAN_AMOUNT);
        vm.stopPrank();
        
        // Attack: Attacker manipulates price oracle
        vm.startPrank(attacker);
        priceOracle.setPrice(address(0), 5000e18); // 50% price drop
        
        // Should use time-weighted average, not instant price
        vm.expectRevert("Price change too sudden");
        collateralManager.liquidate(user);
        
        vm.stopPrank();
    }

    /**
     * @dev Test flash loan price manipulation
     */
    function testFlashLoanPriceManipulation() public {
        vm.startPrank(attacker);
        
        // Attack: Use flash loan to manipulate price and liquidate
        vm.expectRevert("Flash loan price manipulation detected");
        this.executeFlashLoanAttack();
        
        vm.stopPrank();
    }

    function executeFlashLoanAttack() external {
        // Flash loan large amount
        lendingPool.flashLoan(1000 ether, abi.encode("manipulate"));
    }

    /**
     * @dev Test oracle feed staleness
     */
    function testStaleOracleFeed() public {
        // Set stale timestamp
        priceOracle.setTimestamp(block.timestamp - 3700); // 1 hour + 100 seconds old
        
        vm.startPrank(user);
        vm.expectRevert("Price feed is stale");
        collateralManager.depositCollateral{value: COLLATERAL_AMOUNT}();
        vm.stopPrank();
    }

    /**
     * @dev Test oracle circuit breaker
     */
    function testOracleCircuitBreaker() public {
        // Set extreme price change
        priceOracle.setPrice(address(0), 1e18); // 99% drop
        
        vm.startPrank(user);
        vm.expectRevert("Circuit breaker triggered");
        collateralManager.getTotalValueLocked();
        vm.stopPrank();
    }
}

/**
 * @title Mock Price Oracle for Testing
 */
contract MockPriceOracle {
    mapping(address => uint256) public prices;
    mapping(address => uint256) public timestamps;
    
    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
        timestamps[asset] = block.timestamp;
    }
    
    function setTimestamp(uint256 timestamp) external {
        timestamps[address(0)] = timestamp;
    }
    
    function getPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
    
    function getTimestamp(address asset) external view returns (uint256) {
        return timestamps[asset];
    }
}
