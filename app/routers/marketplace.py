"""
API endpoints for secondary marketplace.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas import (
    MarketplaceListingCreate, MarketplaceListingRead, MarketplaceListingWithDetails,
    MarketplacePurchaseCreate, MarketplacePurchaseRead, MarketplacePurchaseResponse,
    MarketplaceStats
)
from app.marketplace_services import (
    create_marketplace_listing, get_marketplace_listing,
    list_marketplace_listings, purchase_from_marketplace,
    cancel_marketplace_listing, get_marketplace_stats,
    get_user_marketplace_purchases, get_user_marketplace_sales
)

router = APIRouter()


@router.post("/listings", response_model=MarketplaceListingRead, status_code=201)
async def create_listing(
    listing_create: MarketplaceListingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new marketplace listing.
    
    User lists their tokens for sale at their desired price.
    Tokens are locked (deducted from balance) until sold or cancelled.
    
    **Example:**
    ```json
    {
        "seller_id": 1,
        "property_id": 1,
        "tokens": 1000,
        "price_per_token_usd": 0.95
    }
    ```
    """
    listing = await create_marketplace_listing(db, listing_create)
    
    # Build response with property name
    return MarketplaceListingRead(
        id=listing.id,
        seller_id=listing.seller_id,
        property_id=listing.property_id,
        property_name=listing.property.name,
        tokens_listed=listing.tokens_listed,
        tokens_remaining=listing.tokens_remaining,
        price_per_token_usd=listing.price_per_token_usd,
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at
    )


@router.get("/listings", response_model=list[MarketplaceListingWithDetails])
async def get_listings(
    property_id: Optional[int] = None,
    seller_id: Optional[int] = None,
    status: str = "active",
    db: AsyncSession = Depends(get_db)
):
    """
    List all marketplace listings with filters.
    
    **Query Parameters:**
    - `property_id`: Filter by property (optional)
    - `seller_id`: Filter by seller (optional)
    - `status`: Filter by status (default: "active")
    
    **Returns:**
    List of listings with full property details, including:
    - Original price vs listing price
    - Discount/premium percentage
    - Property information (name, location, yield, etc.)
    """
    return await list_marketplace_listings(db, property_id, seller_id, status)


@router.get("/listings/{listing_id}", response_model=MarketplaceListingWithDetails)
async def get_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific marketplace listing by ID.
    
    **Returns:**
    Full listing details with property information.
    """
    listing = await get_marketplace_listing(db, listing_id)
    
    # Calculate discount
    original_price = 1.0
    discount_percent = None
    if listing.price_per_token_usd != original_price:
        discount_percent = ((original_price - listing.price_per_token_usd) / original_price) * 100
    
    return MarketplaceListingWithDetails(
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


@router.post("/buy", response_model=MarketplacePurchaseResponse)
async def buy_tokens(
    purchase_create: MarketplacePurchaseCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Purchase tokens from a marketplace listing.
    
    **Process:**
    1. Validates listing is active and has enough tokens
    2. Calculates total price and 2.5% platform fee
    3. Checks buyer has sufficient balance
    4. Transfers tokens to buyer
    5. Transfers money to seller (minus fee)
    6. Updates listing status
    
    **Example:**
    ```json
    {
        "buyer_id": 2,
        "listing_id": 1,
        "tokens": 500
    }
    ```
    
    **Returns:**
    Purchase details including:
    - Transaction information
    - Updated balances for buyer and seller
    - Platform fee charged
    """
    return await purchase_from_marketplace(db, purchase_create)


@router.post("/listings/{listing_id}/cancel", response_model=MarketplaceListingRead)
async def cancel_listing(
    listing_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a marketplace listing.
    
    **Requirements:**
    - User must be the seller
    - Listing must be active
    
    **Process:**
    - Returns remaining tokens to seller's balance
    - Marks listing as "cancelled"
    
    **Query Parameters:**
    - `user_id`: ID of the user cancelling (must match seller_id)
    """
    listing = await cancel_marketplace_listing(db, listing_id, user_id)
    
    return MarketplaceListingRead(
        id=listing.id,
        seller_id=listing.seller_id,
        property_id=listing.property_id,
        property_name=listing.property.name,
        tokens_listed=listing.tokens_listed,
        tokens_remaining=listing.tokens_remaining,
        price_per_token_usd=listing.price_per_token_usd,
        status=listing.status,
        created_at=listing.created_at,
        updated_at=listing.updated_at
    )


@router.get("/stats", response_model=MarketplaceStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Get marketplace statistics.
    
    **Returns:**
    - Total active listings
    - Total tokens listed
    - All-time trading volume (USD)
    - Average discount/premium percentage
    """
    return await get_marketplace_stats(db)


@router.get("/users/{user_id}/purchases", response_model=list[MarketplacePurchaseRead])
async def get_user_purchases(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all marketplace purchases for a user (as buyer).
    
    **Returns:**
    List of purchases where user was the buyer.
    """
    return await get_user_marketplace_purchases(db, user_id)


@router.get("/users/{user_id}/sales", response_model=list[MarketplacePurchaseRead])
async def get_user_sales(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all marketplace sales for a user (as seller).
    
    **Returns:**
    List of purchases where user was the seller.
    """
    return await get_user_marketplace_sales(db, user_id)


@router.get("/users/{user_id}/listings", response_model=list[MarketplaceListingWithDetails])
async def get_user_listings(
    user_id: int,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all marketplace listings for a user (as seller).
    
    **Query Parameters:**
    - `status`: Filter by status (optional, e.g., "active", "completed", "cancelled")
    
    **Returns:**
    List of listings created by the user.
    """
    return await list_marketplace_listings(db, seller_id=user_id, status=status)

