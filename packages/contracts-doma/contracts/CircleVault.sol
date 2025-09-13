// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title CircleVault
/// @notice Secure custody for domain NFTs won in auctions, with governance and emergency controls
contract CircleVault is Ownable, Pausable, ReentrancyGuard {
    IERC721 public immutable domainNFT;
    address[] public signers;
    uint256 public requiredSignatures;
    mapping(uint256 => address) public domainCustody;
    mapping(uint256 => mapping(address => bool)) public withdrawalApprovals;
    mapping(uint256 => uint256) public withdrawalApprovalCount;

    event CustodyChanged(uint256 indexed domainTokenId, address indexed newCustodian, string action);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    error NotSigner();
    error AlreadyApproved();
    error NotEnoughApprovals();
    error NotInCustody();
    error NotAuthorized();
    error InvalidSigners();

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

    constructor(address _domainNFT, address[] memory _signers, uint256 _required) Ownable(msg.sender) {
        require(_domainNFT != address(0), "Zero address");
        require(_signers.length >= _required && _required > 0, "Invalid signers");
        domainNFT = IERC721(_domainNFT);
        signers = _signers;
        requiredSignatures = _required;
    }

    /// @notice Called by AuctionAdapter when a domain is claimed from auction
    function onClaim(uint256 auctionId, uint256 domainTokenId) external whenNotPaused nonReentrant {
        // Transfer NFT to vault
        domainNFT.transferFrom(msg.sender, address(this), domainTokenId);
        domainCustody[domainTokenId] = address(this);
        emit CustodyChanged(domainTokenId, address(this), "escrow");
    }

    /// @notice Deposit domain NFT for auction custody
    function depositDomain(uint256 auctionId, uint256 domainTokenId) external whenNotPaused nonReentrant {
        // Transfer NFT to vault
        domainNFT.transferFrom(msg.sender, address(this), domainTokenId);
        domainCustody[domainTokenId] = address(this);
        emit CustodyChanged(domainTokenId, address(this), "auction_deposit");
    }

    /// @notice Internal withdrawal logic
    function _withdraw(uint256 domainTokenId, address recipient) internal {
        require(domainCustody[domainTokenId] == address(this), "Not in custody");
        domainCustody[domainTokenId] = recipient;
        domainNFT.safeTransferFrom(address(this), recipient, domainTokenId);
        emit CustodyChanged(domainTokenId, recipient, "withdraw");
        // Reset approvals
        for (uint256 i = 0; i < signers.length; i++) {
            withdrawalApprovals[domainTokenId][signers[i]] = false;
        }
        withdrawalApprovalCount[domainTokenId] = 0;
    }

    /// @notice Governance-controlled withdrawal (multi-sig)
    function withdraw(uint256 domainTokenId, address recipient) external onlySigner whenNotPaused nonReentrant {
        if (withdrawalApprovals[domainTokenId][msg.sender]) revert AlreadyApproved();
        withdrawalApprovals[domainTokenId][msg.sender] = true;
        withdrawalApprovalCount[domainTokenId]++;
        if (withdrawalApprovalCount[domainTokenId] >= requiredSignatures) {
            _withdraw(domainTokenId, recipient);
        }
    }

    /// @notice Interface compliance - single signature withdrawal for auction adapters
    function withdrawDomain(uint256 auctionId, address to) external onlySigner whenNotPaused nonReentrant {
        // For auction adapter compatibility, we pass auctionId as domainTokenId
        _withdraw(auctionId, to);
    }

    /// @notice Gas-optimized batch withdrawal for multiple domains
    function batchWithdraw(uint256[] calldata domainTokenIds, address[] calldata recipients) external onlySigner whenNotPaused nonReentrant {
        require(domainTokenIds.length == recipients.length, "Length mismatch");
        for (uint256 i = 0; i < domainTokenIds.length; i++) {
            _withdraw(domainTokenIds[i], recipients[i]);
        }
    }

    /// @notice Emergency circuit breaker
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }
    function emergencyUnpause() external onlyOwner {
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
