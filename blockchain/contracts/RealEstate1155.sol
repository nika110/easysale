// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IUSDC.sol";

/**
 * @title RealEstate1155
 * @dev ERC-1155 contract for a SINGLE real estate property (CUSTODIAL MODEL)
 * 
 * IMPORTANT: This is a CUSTODIAL/ADMIN-ONLY contract.
 * - Each property gets its OWN instance of this contract (deployed via PropertyFactory)
 * - End users in Georgia pay via card/bank (fiat) to the platform
 * - ONLY the platform backend (owner) interacts with this contract
 * - The contract serves as a transparent ledger for ONE property
 * - Individual user allocations are tracked OFF-CHAIN in the backend database
 * 
 * This contract represents ONE property with a fixed tokenId = 1.
 * The platform mints tokens to its treasury as users purchase via fiat.
 */
contract RealEstate1155 is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // Contract metadata
    string public name;
    string public symbol;

    // Fixed token ID for this property
    uint256 public constant TOKEN_ID = 1;

    // Base URI for metadata
    string private _baseMetadataURI;

    // Property information (single property per contract)
    uint256 public totalTokens;      // Total token supply
    uint256 public tokensMinted;     // Total tokens minted to treasury
    uint256 public pricePerToken;    // Price per token (informational)
    bool public isActive;            // Whether offering is active
    bool public isFunded;            // Whether property is fully funded

    // Rent distribution (USDC)
    IUSDC public usdc;                                    // USDC token contract
    uint256 public cumulativeRentPerToken;                // Cumulative rent per token (scaled by 1e18)
    mapping(address => uint256) public userRentIndex;     // User's last claimed cumulative index

    // Events
    event PropertyStatusChanged(bool isActive);
    event PropertyFunded();
    event TokensMintedToTreasury(
        uint256 amount,
        uint256 newTotalMinted
    );
    event TokensBurnedFromTreasury(
        uint256 amount,
        uint256 newTotalMinted
    );
    event TokensMinted(
        address indexed to,
        uint256 amount,
        uint256 newTotalMinted
    );
    event RentDeposited(
        uint256 amount,
        uint256 newCumulativeRentPerToken
    );
    event RentClaimed(
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Constructor - Creates a contract for ONE property
     * @param _totalTokens Total token supply for this property
     * @param _pricePerToken Price per token (informational, in USD cents or similar)
     * @param baseURI_ Base URI for token metadata
     * @param _name Property name
     * @param _symbol Property symbol
     * @param _usdc USDC token address for rent distribution
     */
    constructor(
        uint256 _totalTokens,
        uint256 _pricePerToken,
        string memory baseURI_,
        string memory _name,
        string memory _symbol,
        address _usdc
    ) ERC1155("") Ownable(msg.sender) {
        require(_totalTokens > 0, "Total tokens must be > 0");
        require(_usdc != address(0), "Invalid USDC address");
        
        totalTokens = _totalTokens;
        pricePerToken = _pricePerToken;
        tokensMinted = 0;
        isActive = true;
        isFunded = false;
        
        _baseMetadataURI = baseURI_;
        name = _name;
        symbol = _symbol;
        usdc = IUSDC(_usdc);
        cumulativeRentPerToken = 0;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @dev Toggle property active status
     * @param active New active status
     */
    function setPropertyActive(bool active) external onlyOwner {
        isActive = active;
        emit PropertyStatusChanged(active);
    }

    /**
     * @dev Manually mark property as funded
     */
    function markPropertyFunded() external onlyOwner {
        isFunded = true;
        isActive = false;
        emit PropertyFunded();
    }

    /**
     * @dev Update base metadata URI
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyOwner {
        _baseMetadataURI = newuri;
    }

    // ============================================
    // CUSTODIAL MINTING (ADMIN ONLY)
    // ============================================

    /**
     * @dev Mint tokens to treasury (platform wallet) after off-chain fiat payment
     * 
     * USAGE: When a user pays via card/bank (off-chain), the backend verifies payment
     * and calls this function to mint tokens to the platform's treasury.
     * The backend database tracks which user owns which tokens off-chain.
     * 
     * @param amount Number of tokens to mint
     */
    function mintForTreasury(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(isActive, "Property offering is not active");
        require(amount > 0, "Amount must be > 0");
        require(
            tokensMinted + amount <= totalTokens,
            "Not enough tokens available"
        );

        // Mint tokens to owner (platform treasury) with TOKEN_ID = 1
        _mint(owner(), TOKEN_ID, amount, "");

        // Update state
        tokensMinted += amount;

        // Check if property is now fully funded
        if (tokensMinted == totalTokens) {
            isActive = false;
            isFunded = true;
            emit PropertyFunded();
        }

        emit TokensMintedToTreasury(amount, tokensMinted);
    }

    /**
     * @dev Mint tokens directly to a user's wallet after off-chain fiat payment
     * 
     * USAGE: When a user pays via card/bank (off-chain), the backend verifies payment
     * and calls this function to mint tokens directly to the user's blockchain wallet.
     * This enables on-chain balance tracking for DAO voting and secondary markets.
     * 
     * @param to User's blockchain wallet address
     * @param amount Number of tokens to mint
     */
    function mintTo(address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(to != address(0), "Invalid address");
        require(isActive, "Property offering is not active");
        require(amount > 0, "Amount must be > 0");
        require(
            tokensMinted + amount <= totalTokens,
            "Not enough tokens available"
        );

        // Mint tokens to user's wallet with TOKEN_ID = 1
        _mint(to, TOKEN_ID, amount, "");

        // Update state
        tokensMinted += amount;

        // Check if property is now fully funded
        if (tokensMinted == totalTokens) {
            isActive = false;
            isFunded = true;
            emit PropertyFunded();
        }

        emit TokensMinted(to, amount, tokensMinted);
    }

    /**
     * @dev Burn tokens from treasury (for corrections/refunds)
     * 
     * USAGE: If a payment is refunded or needs correction, burn tokens from treasury.
     * 
     * @param amount Number of tokens to burn
     */
    function burnFromTreasury(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(amount > 0, "Amount must be > 0");
        require(tokensMinted >= amount, "Cannot burn more than minted");

        // Burn tokens from owner (platform treasury)
        _burn(owner(), TOKEN_ID, amount);

        // Update state
        tokensMinted -= amount;

        // If was funded but now not, reactivate
        if (isFunded && tokensMinted < totalTokens) {
            isFunded = false;
            isActive = true;
        }

        emit TokensBurnedFromTreasury(amount, tokensMinted);
    }

    // ============================================
    // RENT DISTRIBUTION (ON-CHAIN USDC)
    // ============================================

    /**
     * @dev Deposit rent in USDC for this property.
     * Rent is distributed pro-rata to all token holders.
     * 
     * @param amount Amount of USDC to deposit (in USDC's smallest unit, e.g., 6 decimals)
     */
    function depositRent(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(totalTokens > 0, "No tokens issued");
        
        // Transfer USDC from owner to this contract
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        // Update cumulative rent per token (scaled by 1e18 for precision)
        cumulativeRentPerToken += (amount * 1e18) / totalTokens;
        
        emit RentDeposited(amount, cumulativeRentPerToken);
    }

    /**
     * @dev Calculate claimable rent for a user.
     * 
     * @param user User address
     * @return Claimable USDC amount
     */
    function claimableRent(address user) public view returns (uint256) {
        uint256 userTokens = balanceOf(user, TOKEN_ID);
        if (userTokens == 0) return 0;
        
        uint256 accumulatedPerToken = cumulativeRentPerToken - userRentIndex[user];
        return (accumulatedPerToken * userTokens) / 1e18;
    }

    /**
     * @dev Claim accumulated rent in USDC.
     * User receives USDC proportional to their token holdings.
     */
    function claimRent() external nonReentrant {
        uint256 amount = claimableRent(msg.sender);
        require(amount > 0, "No rent to claim");
        
        // Update user's index to current cumulative
        userRentIndex[msg.sender] = cumulativeRentPerToken;
        
        // Transfer USDC to user
        require(
            usdc.transfer(msg.sender, amount),
            "USDC transfer failed"
        );
        
        emit RentClaimed(msg.sender, amount);
    }

    // ============================================
    // METADATA
    // ============================================

    /**
     * @dev Returns the URI for a given token ID
     * @param id Token ID (property ID)
     * @return Token metadata URI
     */
    function uri(uint256 id) public view override returns (string memory) {
        return
            string(
                abi.encodePacked(_baseMetadataURI, id.toString(), ".json")
            );
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @dev Get tokens available for minting
     * @return Number of tokens still available
     */
    function tokensAvailable() external view returns (uint256) {
        return totalTokens - tokensMinted;
    }

    /**
     * @dev Get property information
     * @return _totalTokens Total token supply
     * @return _tokensMinted Tokens minted to treasury
     * @return _pricePerToken Price per token
     * @return _isActive Whether offering is active
     * @return _isFunded Whether property is fully funded
     */
    function getPropertyInfo()
        external
        view
        returns (
            uint256 _totalTokens,
            uint256 _tokensMinted,
            uint256 _pricePerToken,
            bool _isActive,
            bool _isFunded
        )
    {
        return (totalTokens, tokensMinted, pricePerToken, isActive, isFunded);
    }
}

