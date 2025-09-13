// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BastionProtocol
 * @dev Cross-chain DeFi protocol for Avalanche network
 */
contract BastionProtocol is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event CrossChainTransfer(address indexed from, address indexed to, uint256 amount, uint256 destinationChain);

    // State variables
    mapping(address => mapping(address => uint256)) public userBalances;
    mapping(address => bool) public supportedTokens;
    
    uint256 public constant AVALANCHE_CHAIN_ID = 43113; // Fuji testnet
    uint256 public totalValueLocked;
    
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initialize supported tokens for Avalanche
        supportedTokens[0x5425890298aed601595a70AB815c96711a31Bc65] = true; // USDC on Fuji
        supportedTokens[0xd00ae08403B9bbb9124bB305C09058E32C39A48c] = true; // WAVAX on Fuji
    }

    /**
     * @dev Deposit tokens to the protocol
     */
    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        onlySupportedToken(token) 
    {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender][token] += amount;
        totalValueLocked += amount;
        
        emit Deposit(msg.sender, token, amount);
    }

    /**
     * @dev Withdraw tokens from the protocol
     */
    function withdraw(address token, uint256 amount) 
        external 
        nonReentrant 
        onlySupportedToken(token) 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender][token] >= amount, "Insufficient balance");
        
        userBalances[msg.sender][token] -= amount;
        totalValueLocked -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount);
    }

    /**
     * @dev Add supported token (only owner)
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove supported token (only owner)
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @dev Get user balance for a specific token
     */
    function getUserBalance(address user, address token) external view returns (uint256) {
        return userBalances[user][token];
    }
}
