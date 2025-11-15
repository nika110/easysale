// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RealEstate1155.sol";

/**
 * @title PropertyFactory
 * @dev Factory contract to deploy individual RealEstate1155 contracts for each property
 * 
 * ARCHITECTURE:
 * - ONE PropertyFactory deployed per platform
 * - Each property gets its OWN RealEstate1155 contract instance
 * - Factory tracks all deployed contracts by propertyId
 * - Platform owner controls the factory
 */
contract PropertyFactory is Ownable {
    // Mapping from backend property_id to deployed contract address
    mapping(uint256 => address) public propertyContracts;

    // Array of all deployed contract addresses (for enumeration)
    address[] public allContracts;

    // USDC token address (for rent distribution)
    address public usdcAddress;

    // Events
    event PropertyContractDeployed(
        uint256 indexed propertyId,
        address indexed contractAddress,
        uint256 totalTokens,
        uint256 pricePerToken,
        string name,
        string symbol
    );

    constructor(address _usdcAddress) Ownable(msg.sender) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        usdcAddress = _usdcAddress;
    }

    /**
     * @dev Deploy a new RealEstate1155 contract for a property
     * 
     * @param propertyId Unique property identifier (from backend database)
     * @param totalTokens Total token supply for this property
     * @param pricePerToken Price per token (informational)
     * @param baseURI Base URI for token metadata
     * @param propertyName Name for the property contract
     * @param propertySymbol Symbol for the property contract
     * @return contractAddress Address of the newly deployed contract
     */
    function createPropertyContract(
        uint256 propertyId,
        uint256 totalTokens,
        uint256 pricePerToken,
        string memory baseURI,
        string memory propertyName,
        string memory propertySymbol
    ) external onlyOwner returns (address contractAddress) {
        require(
            propertyContracts[propertyId] == address(0),
            "Property contract already exists"
        );
        require(totalTokens > 0, "Total tokens must be > 0");

        // Deploy new RealEstate1155 contract with USDC address
        RealEstate1155 newContract = new RealEstate1155(
            totalTokens,
            pricePerToken,
            baseURI,
            propertyName,
            propertySymbol,
            usdcAddress
        );

        // Transfer ownership of the new contract to the factory owner (platform)
        newContract.transferOwnership(owner());

        // Store contract address
        contractAddress = address(newContract);
        propertyContracts[propertyId] = contractAddress;
        allContracts.push(contractAddress);

        emit PropertyContractDeployed(
            propertyId,
            contractAddress,
            totalTokens,
            pricePerToken,
            propertyName,
            propertySymbol
        );

        return contractAddress;
    }

    /**
     * @dev Get contract address for a property
     * @param propertyId Property identifier
     * @return Contract address or address(0) if not deployed
     */
    function getPropertyContract(uint256 propertyId)
        external
        view
        returns (address)
    {
        return propertyContracts[propertyId];
    }

    /**
     * @dev Check if a property contract exists
     * @param propertyId Property identifier
     * @return True if contract exists
     */
    function propertyContractExists(uint256 propertyId)
        external
        view
        returns (bool)
    {
        return propertyContracts[propertyId] != address(0);
    }

    /**
     * @dev Get total number of deployed contracts
     * @return Number of contracts
     */
    function getTotalContracts() external view returns (uint256) {
        return allContracts.length;
    }

    /**
     * @dev Get contract address by index
     * @param index Index in the array
     * @return Contract address
     */
    function getContractByIndex(uint256 index) external view returns (address) {
        require(index < allContracts.length, "Index out of bounds");
        return allContracts[index];
    }
}

