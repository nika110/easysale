"""
Business logic services for the secondary marketplace.
"""
from datetime import datetime
from typing import Optional
import logging
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    User, Property, UserPropertyBalance, 
    MarketplaceListing, MarketplacePurchase
)
from app.schemas import (
    MarketplaceListingCreate, MarketplaceListingWithDetails,
    MarketplacePurchaseCreate, MarketplacePurchaseResponse,
    MarketplaceStats
)
from app.services import get_user, get_property
from app.blockchain.realestate1155 import transfer_tokens_custodial, BlockchainError

logger = logging.getLogger(__name__)

# Platform fee: 2.5%
PLATFORM_FEE_PERCENT = 2.5


async def create_marketplace_listing(
    db: AsyncSession, 
    listing_create: MarketplaceListingCreate
) -> MarketplaceListing:
    """
    Create a new marketplace listing.
    
    Validates:
    - User exists and owns the tokens
    - Property exists
    - User has enough tokens to list
    - Price is positive
    
    Args:
        db: Database session
        listing_create: Listing creation data
        
    Returns:
        Created MarketplaceListing instance
        
    Raises:
        HTTPException: If validation fails
    """
    # Validate inputs
    if listing_create.tokens <= 0:
        raise HTTPException(status_code=400, detail="Tokens must be positive")
    
    if listing_create.price_per_token_usd <= 0:
        raise HTTPException(status_code=400, detail="Price per token must be positive")
    
    # Fetch user and property
    user = await get_user(db, listing_create.seller_id)
    property_obj = await get_property(db, listing_create.property_id)
    
    # Check user's token balance
    result = await db.execute(
        select(UserPropertyBalance).where(
            UserPropertyBalance.user_id == listing_create.seller_id,
            UserPropertyBalance.property_id == listing_create.property_id
        )
    )
    balance = result.scalar_one_or_none()
    
    if not balance or balance.tokens < listing_create.tokens:
        available = balance.tokens if balance else 0
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient tokens. Requested: {listing_create.tokens}, Available: {available}"
        )
    
    # Use transaction for atomicity
    async with db.begin_nested():
        # Deduct tokens from user's balance (lock them)
        balance.tokens -= listing_create.tokens
        
        # Create listing
        listing = MarketplaceListing(
            seller_id=listing_create.seller_id,
            property_id=listing_create.property_id,
            tokens_listed=listing_create.tokens,
            tokens_remaining=listing_create.tokens,
            price_per_token_usd=listing_create.price_per_token_usd,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(listing)
    
    await db.commit()
    await db.refresh(listing)
    
    # Eagerly load property relationship
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.property))
        .where(MarketplaceListing.id == listing.id)
    )
    listing = result.scalar_one()
    
    logger.info(
        f"✅ Listing created: User {listing_create.seller_id} listed "
        f"{listing_create.tokens} tokens of property {listing_create.property_id} "
        f"at ${listing_create.price_per_token_usd}/token"
    )
    
    return listing


async def get_marketplace_listing(db: AsyncSession, listing_id: int) -> MarketplaceListing:
    """
    Get a marketplace listing by ID.
    
    Args:
        db: Database session
        listing_id: Listing ID
        
    Returns:
        MarketplaceListing instance
        
    Raises:
        HTTPException: If listing not found
    """
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.property))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    
    return listing


async def list_marketplace_listings(
    db: AsyncSession,
    property_id: Optional[int] = None,
    seller_id: Optional[int] = None,
    status: str = "active"
) -> list[MarketplaceListingWithDetails]:
    """
    List marketplace listings with filters.
    
    Args:
        db: Database session
        property_id: Optional filter by property
        seller_id: Optional filter by seller
        status: Filter by status (default: "active")
        
    Returns:
        List of listings with property details
    """
    query = (
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.property))
        .order_by(MarketplaceListing.created_at.desc())
    )
    
    if property_id:
        query = query.where(MarketplaceListing.property_id == property_id)
    
    if seller_id:
        query = query.where(MarketplaceListing.seller_id == seller_id)
    
    if status:
        query = query.where(MarketplaceListing.status == status)
    
    result = await db.execute(query)
    listings = list(result.scalars().all())
    
    # Build detailed response with property info
    detailed_listings = []
    for listing in listings:
        # Calculate discount/premium vs original price
        original_price = 1.0  # 1 token = $1 originally
        discount_percent = None
        if listing.price_per_token_usd != original_price:
            discount_percent = ((original_price - listing.price_per_token_usd) / original_price) * 100
        
        detailed_listings.append(
            MarketplaceListingWithDetails(
                id=listing.id,
                seller_id=listing.seller_id,
                property_id=listing.property_id,
                property_name=listing.property.name,
                property_location=listing.property.location,
                property_image_url=listing.property.image_url,
                expected_annual_yield_percent=listing.property.expected_annual_yield_percent,
                tokens_listed=listing.tokens_listed,
                tokens_remaining=listing.tokens_remaining,
                price_per_token_usd=listing.price_per_token_usd,
                original_price_per_token_usd=original_price,
                discount_percent=discount_percent,
                status=listing.status,
                created_at=listing.created_at,
                updated_at=listing.updated_at
            )
        )
    
    return detailed_listings


async def purchase_from_marketplace(
    db: AsyncSession,
    purchase_create: MarketplacePurchaseCreate
) -> MarketplacePurchaseResponse:
    """
    Purchase tokens from a marketplace listing.
    
    Process:
    1. Validate listing is active and has enough tokens
    2. Calculate total price and platform fee
    3. Check buyer has enough balance
    4. Transfer tokens to buyer
    5. Transfer money to seller (minus fee)
    6. Update listing status
    7. Create purchase record
    
    Args:
        db: Database session
        purchase_create: Purchase data
        
    Returns:
        MarketplacePurchaseResponse with transaction details
        
    Raises:
        HTTPException: If validation fails or insufficient funds
    """
    # Validate inputs
    if purchase_create.tokens <= 0:
        raise HTTPException(status_code=400, detail="Tokens must be positive")
    
    # Use transaction for atomicity
    async with db.begin_nested():
        # Fetch listing with property
        listing = await get_marketplace_listing(db, purchase_create.listing_id)
        
        # Validate listing
        if listing.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Listing is not active. Status: {listing.status}"
            )
        
        if purchase_create.tokens > listing.tokens_remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough tokens available. Requested: {purchase_create.tokens}, "
                       f"Available: {listing.tokens_remaining}"
            )
        
        # Prevent self-purchase
        if purchase_create.buyer_id == listing.seller_id:
            raise HTTPException(status_code=400, detail="Cannot buy your own listing")
        
        # Fetch buyer and seller
        buyer = await get_user(db, purchase_create.buyer_id)
        seller = await get_user(db, listing.seller_id)
        
        # Calculate prices
        total_price = purchase_create.tokens * listing.price_per_token_usd
        platform_fee = total_price * (PLATFORM_FEE_PERCENT / 100)
        seller_receives = total_price - platform_fee
        
        # Check buyer balance
        if buyer.mock_balance_usd < total_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Required: ${total_price:.2f}, "
                       f"Available: ${buyer.mock_balance_usd:.2f}"
            )
        
        # Transfer money
        buyer.mock_balance_usd -= total_price
        seller.mock_balance_usd += seller_receives
        buyer.updated_at = datetime.utcnow()
        seller.updated_at = datetime.utcnow()
        
        # Transfer tokens to buyer
        result = await db.execute(
            select(UserPropertyBalance).where(
                UserPropertyBalance.user_id == purchase_create.buyer_id,
                UserPropertyBalance.property_id == listing.property_id
            )
        )
        buyer_balance = result.scalar_one_or_none()
        
        if buyer_balance:
            buyer_balance.tokens += purchase_create.tokens
        else:
            buyer_balance = UserPropertyBalance(
                user_id=purchase_create.buyer_id,
                property_id=listing.property_id,
                tokens=purchase_create.tokens
            )
            db.add(buyer_balance)
        
        # Update listing
        listing.tokens_remaining -= purchase_create.tokens
        listing.updated_at = datetime.utcnow()
        
        if listing.tokens_remaining == 0:
            listing.status = "completed"
        
        # Create purchase record
        purchase = MarketplacePurchase(
            listing_id=purchase_create.listing_id,
            buyer_id=purchase_create.buyer_id,
            seller_id=listing.seller_id,
            property_id=listing.property_id,
            tokens_purchased=purchase_create.tokens,
            price_per_token_usd=listing.price_per_token_usd,
            total_price_usd=total_price,
            platform_fee_usd=platform_fee,
            seller_received_usd=seller_receives,
            created_at=datetime.utcnow()
        )
        db.add(purchase)
    
    # Commit database transaction first
    await db.commit()
    await db.refresh(purchase)
    await db.refresh(buyer)
    await db.refresh(seller)
    await db.refresh(buyer_balance)
    await db.refresh(listing)
    
    # Now execute blockchain transfer (after DB commit)
    property_obj = listing.property
    if (property_obj.token_contract_address and 
        buyer.blockchain_address and 
        seller.blockchain_address and 
        seller.blockchain_private_key):
        try:
            logger.info(
                f"🔗 Transferring {purchase_create.tokens} tokens on-chain: "
                f"{seller.blockchain_address} → {buyer.blockchain_address}"
            )
            
            tx_hash = await transfer_tokens_custodial(
                contract_address=property_obj.token_contract_address,
                from_address=seller.blockchain_address,
                to_address=buyer.blockchain_address,
                amount=purchase_create.tokens,
                from_private_key=seller.blockchain_private_key
            )
            
            logger.info(
                f"✅ Blockchain transfer successful: {tx_hash}"
            )
        except BlockchainError as e:
            logger.error(
                f"⚠️ Blockchain transfer failed (DB already committed): {e}"
            )
            # Note: Database transaction already committed
            # In production, you might want to:
            # 1. Retry the blockchain transaction
            # 2. Flag the purchase for manual review
            # 3. Implement a reconciliation process
    else:
        logger.warning(
            f"⚠️ Skipping blockchain transfer - missing contract address, user wallets, or seller private key"
        )
    
    logger.info(
        f"✅ Marketplace purchase: User {purchase_create.buyer_id} bought "
        f"{purchase_create.tokens} tokens from listing {purchase_create.listing_id} "
        f"for ${total_price:.2f} (fee: ${platform_fee:.2f})"
    )
    
    return MarketplacePurchaseResponse(
        purchase=purchase,
        buyer_new_balance_usd=buyer.mock_balance_usd,
        seller_new_balance_usd=seller.mock_balance_usd,
        buyer_new_token_balance=buyer_balance.tokens,
        listing_status=listing.status
    )


async def cancel_marketplace_listing(
    db: AsyncSession,
    listing_id: int,
    user_id: int
) -> MarketplaceListing:
    """
    Cancel a marketplace listing and return tokens to seller.
    
    Args:
        db: Database session
        listing_id: Listing ID to cancel
        user_id: User ID (must be the seller)
        
    Returns:
        Cancelled MarketplaceListing instance
        
    Raises:
        HTTPException: If not authorized or listing not active
    """
    async with db.begin_nested():
        # Fetch listing
        listing = await get_marketplace_listing(db, listing_id)
        
        # Verify user is the seller
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this listing")
        
        # Verify listing is active
        if listing.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel listing with status: {listing.status}"
            )
        
        # Return remaining tokens to seller
        result = await db.execute(
            select(UserPropertyBalance).where(
                UserPropertyBalance.user_id == listing.seller_id,
                UserPropertyBalance.property_id == listing.property_id
            )
        )
        balance = result.scalar_one_or_none()
        
        if balance:
            balance.tokens += listing.tokens_remaining
        else:
            # Shouldn't happen, but handle gracefully
            balance = UserPropertyBalance(
                user_id=listing.seller_id,
                property_id=listing.property_id,
                tokens=listing.tokens_remaining
            )
            db.add(balance)
        
        # Update listing
        listing.status = "cancelled"
        listing.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Eagerly load property relationship
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.property))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one()
    
    logger.info(
        f"✅ Listing cancelled: Listing {listing_id}, "
        f"returned tokens to user {user_id}"
    )
    
    return listing


async def get_marketplace_stats(db: AsyncSession) -> MarketplaceStats:
    """
    Get marketplace statistics.
    
    Args:
        db: Database session
        
    Returns:
        MarketplaceStats with aggregated data
    """
    # Count active listings
    active_count_result = await db.execute(
        select(func.count(MarketplaceListing.id)).where(
            MarketplaceListing.status == "active"
        )
    )
    active_count = active_count_result.scalar() or 0
    
    # Sum tokens listed
    tokens_listed_result = await db.execute(
        select(func.sum(MarketplaceListing.tokens_remaining)).where(
            MarketplaceListing.status == "active"
        )
    )
    tokens_listed = tokens_listed_result.scalar() or 0
    
    # Calculate total trading volume
    volume_result = await db.execute(
        select(func.sum(MarketplacePurchase.total_price_usd))
    )
    total_volume = volume_result.scalar() or 0.0
    
    # Calculate average discount
    listings_result = await db.execute(
        select(MarketplaceListing.price_per_token_usd).where(
            MarketplaceListing.status == "active"
        )
    )
    prices = list(listings_result.scalars().all())
    
    avg_discount = None
    if prices:
        original_price = 1.0
        discounts = [((original_price - price) / original_price) * 100 for price in prices]
        avg_discount = sum(discounts) / len(discounts)
    
    return MarketplaceStats(
        total_active_listings=active_count,
        total_tokens_listed=tokens_listed,
        total_volume_usd=total_volume,
        average_discount_percent=avg_discount
    )


async def get_user_marketplace_purchases(
    db: AsyncSession,
    user_id: int
) -> list[MarketplacePurchase]:
    """
    Get all marketplace purchases for a user (as buyer).
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of MarketplacePurchase instances
    """
    result = await db.execute(
        select(MarketplacePurchase)
        .where(MarketplacePurchase.buyer_id == user_id)
        .order_by(MarketplacePurchase.created_at.desc())
    )
    return list(result.scalars().all())


async def get_user_marketplace_sales(
    db: AsyncSession,
    user_id: int
) -> list[MarketplacePurchase]:
    """
    Get all marketplace sales for a user (as seller).
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of MarketplacePurchase instances
    """
    result = await db.execute(
        select(MarketplacePurchase)
        .where(MarketplacePurchase.seller_id == user_id)
        .order_by(MarketplacePurchase.created_at.desc())
    )
    return list(result.scalars().all())

