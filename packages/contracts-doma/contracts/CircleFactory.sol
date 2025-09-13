// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ICircle.sol";

interface ICircleRegistry {
    function registerCircle(address circle) external;
}

/// @title CircleFactory
/// @notice Deploys minimal proxy Circle contracts and manages registry integration
contract CircleFactory is Ownable {
    using Clones for address;

    address public immutable circleImplementation;
    address public registry;

    event CircleCreated(address indexed creator, address indexed circle, string name);
    event RegistryUpdated(address indexed newRegistry);

    error NotAuthorized();
    error InvalidImplementation();
    error RegistryNotSet();

    constructor(address _circleImplementation, address _registry) Ownable(msg.sender) {
        if (_circleImplementation == address(0)) revert InvalidImplementation();
        circleImplementation = _circleImplementation;
        registry = _registry;
    }

    /// @notice Set the registry contract address
    function setRegistry(address _registry) external onlyOwner {
        registry = _registry;
        emit RegistryUpdated(_registry);
    }

    /// @notice Deploy a new Circle contract (minimal proxy)
    /// @param name The name of the new circle
    /// @param initData Initialization calldata for the circle
    /// @return circle The address of the new Circle
    function createCircle(string calldata name, bytes calldata initData) external returns (address circle) {
        if (registry == address(0)) revert RegistryNotSet();
        circle = Clones.clone(circleImplementation);
        // Initialize the new circle (assume initializer is `initialize(address owner, string calldata name, bytes calldata data)`)
        (bool ok, ) = circle.call(abi.encodeWithSignature("initialize(address,string,bytes)", msg.sender, name, initData));
        require(ok, "Initialization failed");
        ICircleRegistry(registry).registerCircle(circle);
        emit CircleCreated(msg.sender, circle, name);
    }
}
