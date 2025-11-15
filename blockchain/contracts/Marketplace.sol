// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IUSDC.sol";

/**
 * @title Marketplace
 * @dev Secondary marketplace for trading real estate tokens (ERC-1155) using USDC
 * 
 * FEATURES:
 * - Users can list their tokens for sale (create orders)
 * - Buyers can purchase tokens using USDC
 * - Platform charges a fee (in basis points)
 * - Tokens are held in escrow until sold or cancelled
 * - Partial fills supported (buy part of an order)
 */
contract Marketplace is ERC1155Holder, Ownable, ReentrancyGuard {
    // USDC token for payments
    IUSDC public usdc;
    
    // Fee recipient (platform treasury)
    address public feeRecipient;
    
    // Fee in basis points (e.g., 250 = 2.5%)
    uint256 public feeBps;
    
    // Order structure
    struct Order {
        uint256 id;
        address seller;
        address tokenContract;  // RealEstate1155 contract address
        uint256 tokenId;        // Always 1 for our properties
        uint256 amount;         // Original amount listed
        uint256 remaining;      // Remaining amount available
        uint256 pricePerToken;  // Price per token in USDC (6 decimals)
        bool isActive;
    }
    
    // Mapping from order ID to Order
    mapping(uint256 => Order) public orders;
    
    // Next order ID
    uint256 public nextOrderId = 1;
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed seller,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken
    );
    
    event OrderFilled(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed seller,
        uint256 remainingAmount
    );
    
    event FeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newFeeRecipient);
    
    /**
     * @dev Constructor
     * @param _usdc USDC token address
     * @param _feeRecipient Address to receive platform fees
     * @param _feeBps Fee in basis points (e.g., 250 = 2.5%)
     */
    constructor(
        address _usdc,
        address _feeRecipient,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_feeBps <= 1000, "Fee too high (max 10%)");
        
        usdc = IUSDC(_usdc);
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }
    
    /**
     * @dev Create a sell order (list tokens for sale)
     * 
     * @param tokenContract Address of the RealEstate1155 contract
     * @param tokenId Token ID (always 1 for our properties)
     * @param amount Number of tokens to sell
     * @param pricePerToken Price per token in USDC (6 decimals)
     * @return orderId The created order ID
     */
    function createOrder(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerToken
    ) external nonReentrant returns (uint256 orderId) {
        require(tokenContract != address(0), "Invalid token contract");
        require(amount > 0, "Amount must be > 0");
        require(pricePerToken > 0, "Price must be > 0");
        
        // Transfer tokens from seller to marketplace (escrow)
        IERC1155(tokenContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
        
        // Create order
        orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: amount,
            remaining: amount,
            pricePerToken: pricePerToken,
            isActive: true
        });
        
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenContract,
            tokenId,
            amount,
            pricePerToken
        );
        
        return orderId;
    }
    
    /**
     * @dev Buy tokens from an order
     * 
     * @param orderId Order ID to buy from
     * @param amountToBuy Number of tokens to buy
     */
    function buy(uint256 orderId, uint256 amountToBuy) external nonReentrant {
        Order storage order = orders[orderId];
        
        require(order.isActive, "Order not active");
        require(amountToBuy > 0, "Amount must be > 0");
        require(amountToBuy <= order.remaining, "Insufficient tokens available");
        require(msg.sender != order.seller, "Cannot buy your own order");
        
        // Calculate prices
        uint256 totalPrice = amountToBuy * order.pricePerToken;
        uint256 fee = (totalPrice * feeBps) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // Transfer USDC from buyer to seller
        require(
            usdc.transferFrom(msg.sender, order.seller, sellerAmount),
            "USDC transfer to seller failed"
        );
        
        // Transfer fee to platform (if any)
        if (fee > 0) {
            require(
                usdc.transferFrom(msg.sender, feeRecipient, fee),
                "USDC transfer to fee recipient failed"
            );
        }
        
        // Transfer tokens from escrow to buyer
        IERC1155(order.tokenContract).safeTransferFrom(
            address(this),
            msg.sender,
            order.tokenId,
            amountToBuy,
            ""
        );
        
        // Update order
        order.remaining -= amountToBuy;
        if (order.remaining == 0) {
            order.isActive = false;
        }
        
        emit OrderFilled(orderId, msg.sender, amountToBuy, totalPrice);
    }
    
    /**
     * @dev Cancel an order and return tokens to seller
     * 
     * @param orderId Order ID to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        
        require(order.seller == msg.sender, "Not the seller");
        require(order.isActive, "Order not active");
        require(order.remaining > 0, "No tokens to return");
        
        uint256 remainingAmount = order.remaining;
        
        // Mark order as inactive
        order.isActive = false;
        order.remaining = 0;
        
        // Return remaining tokens to seller
        IERC1155(order.tokenContract).safeTransferFrom(
            address(this),
            msg.sender,
            order.tokenId,
            remainingAmount,
            ""
        );
        
        emit OrderCancelled(orderId, msg.sender, remainingAmount);
    }
    
    /**
     * @dev Update platform fee (owner only)
     * 
     * @param newFeeBps New fee in basis points
     */
    function setFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }
    
    /**
     * @dev Update fee recipient (owner only)
     * 
     * @param newFeeRecipient New fee recipient address
     */
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid address");
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }
    
    /**
     * @dev Get order details
     * 
     * @param orderId Order ID
     * @return Order struct
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Check if order is active
     * 
     * @param orderId Order ID
     * @return True if order is active
     */
    function isOrderActive(uint256 orderId) external view returns (bool) {
        return orders[orderId].isActive;
    }
}

