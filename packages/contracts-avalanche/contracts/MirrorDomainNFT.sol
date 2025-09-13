// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title MirrorDomainNFT
/// @notice ERC-721 representing Doma domain custody proof on Avalanche Fuji
contract MirrorDomainNFT is ERC721URIStorage, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    struct SourceDomain {
        address domaCircle;
        uint256 domaChainId;
        uint256 domaTokenId;
        bytes32 proofHash;
    }

    // tokenId => source domain info
    mapping(uint256 => SourceDomain) public source;
    // tokenId => circle
    mapping(uint256 => address) public circleOf;
    // circle => set of tokenIds
    mapping(address => EnumerableSet.UintSet) private _circleTokens;

    event MirrorMinted(address indexed circle, uint256 indexed tokenId, uint256 domaChainId, uint256 domaTokenId, bytes32 proofHash, string uri);
    event MirrorBurned(uint256 indexed tokenId);

    constructor(address relayer) ERC721("MirrorDomainNFT", "MDNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, relayer);
    }

    modifier onlyRelayer() {
        require(hasRole(RELAYER_ROLE, msg.sender), "Not relayer");
        _;
    }

    function _mintMirror(
        address circle,
        uint256 domaChainId,
        uint256 domaTokenId,
        bytes32 proofHash,
        string calldata uri,
        uint256 tokenId
    ) internal {
        _mint(circle, tokenId);
        _setTokenURI(tokenId, uri);
        source[tokenId] = SourceDomain(circle, domaChainId, domaTokenId, proofHash);
        circleOf[tokenId] = circle;
        _circleTokens[circle].add(tokenId);
        emit MirrorMinted(circle, tokenId, domaChainId, domaTokenId, proofHash, uri);
    }

    function _burnMirror(uint256 tokenId) internal {
        address circle = ownerOf(tokenId);
        _burn(tokenId);
        delete source[tokenId];
        delete circleOf[tokenId];
        _circleTokens[circle].remove(tokenId);
        emit MirrorBurned(tokenId);
    }

    function mint(
        address circle,
        uint256 domaChainId,
        uint256 domaTokenId,
        bytes32 proofHash,
        string calldata uri,
        uint256 tokenId
    ) external onlyRelayer {
        _mintMirror(circle, domaChainId, domaTokenId, proofHash, uri, tokenId);
    }

    function burn(uint256 tokenId) external onlyRelayer {
        _burnMirror(tokenId);
    }

    function batchMint(
        address[] calldata circles,
        uint256[] calldata domaChainIds,
        uint256[] calldata domaTokenIds,
        bytes32[] calldata proofHashes,
        string[] calldata uris,
        uint256[] calldata tokenIds
    ) external onlyRelayer {
        require(
            circles.length == domaChainIds.length &&
            domaChainIds.length == domaTokenIds.length &&
            domaTokenIds.length == proofHashes.length &&
            proofHashes.length == uris.length &&
            uris.length == tokenIds.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < circles.length; i++) {
            _mintMirror(circles[i], domaChainIds[i], domaTokenIds[i], proofHashes[i], uris[i], tokenIds[i]);
        }
    }

    function batchBurn(uint256[] calldata tokenIds) external onlyRelayer {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _burnMirror(tokenIds[i]);
        }
    }

    function tokensOfCircle(address circle) external view returns (uint256[] memory) {
        uint256 len = _circleTokens[circle].length();
        uint256[] memory ids = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            ids[i] = _circleTokens[circle].at(i);
        }
        return ids;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
