"""
Business logic services for the real estate tokenization platform.
"""
from datetime import datetime
from typing import Optional
import math
import logging
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import User, Property, Investment, UserPropertyBalance
from app.schemas import (
    UserCreate, PropertyCreate, InvestmentCreate, 
    UserPropertyBalanceRead, PortfolioSummaryRead,
    InvestmentResponse, PaginatedPropertiesResponse
)
from app.config import settings
from app.blockchain.wallets import generate_new_wallet, fund_wallet_with_gas

logger = logging.getLogger(__name__)


def validate_positive_number(value: float, field_name: str):
    """Validate that a number is not negative."""
    if value < 0:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must not be negative. Got: {value}"
        )


async def create_user(db: AsyncSession, user_create: UserCreate) -> User:
    """
    Create a new user with initial mock balance.
    
    Args:
        db: Database session
        user_create: User creation data
        
    Returns:
        Created User instance
    """
    user = User(
        email=user_create.email,
        full_name=user_create.full_name,
        mock_balance_usd=settings.INITIAL_USER_BALANCE_USD,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: int) -> User:
    """
    Get a user by ID.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        User instance
        
    Raises:
        HTTPException: If user not found
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")
    return user


async def list_users(db: AsyncSession) -> list[User]:
    """
    List all users.
    
    Args:
        db: Database session
        
    Returns:
        List of User instances
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def ensure_user_wallet(db: AsyncSession, user: User) -> User:
    """
    Ensure user has a blockchain wallet. Creates one if not exists.
    Also funds the wallet with ETH for gas fees.
    
    Args:
        db: Database session
        user: User instance
        
    Returns:
        User instance with wallet
    """
    # Check if user already has a wallet
    if user.blockchain_address and user.blockchain_private_key:
        return user
    
    # Generate new wallet
    logger.info(f"Generating blockchain wallet for user {user.id}")
    wallet = generate_new_wallet()
    
    # Update user
    user.blockchain_address = wallet["address"]
    user.blockchain_private_key = wallet["private_key"]
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    logger.info(f"✅ Wallet created for user {user.id}: {wallet['address']}")
    
    # Fund wallet with ETH for gas fees
    try:
        tx_hash = await fund_wallet_with_gas(wallet["address"], amount_eth=0.1)
        logger.info(f"✅ Funded wallet {wallet['address']} with 0.1 ETH for gas: {tx_hash}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to fund wallet {wallet['address']} with gas: {e}")
        # Don't fail user creation if gas funding fails
    
    return user


async def create_property(db: AsyncSession, property_create: PropertyCreate) -> Property:
    """
    Create a new property listing.
    
    Args:
        db: Database session
        property_create: Property creation data
        
    Returns:
        Created Property instance
    """
    # Validate inputs
    validate_positive_number(property_create.price_usd, "price_usd")
    validate_positive_number(property_create.expected_annual_yield_percent, "expected_annual_yield_percent")
    
    property_obj = Property(
        name=property_create.name,
        description=property_create.description,
        location=property_create.location,
        price_usd=property_create.price_usd,
        total_tokens=property_create.price_usd,  # 1 token = 1 USD
        tokens_sold=0,
        expected_annual_yield_percent=property_create.expected_annual_yield_percent,
        status="offering",
        image_url=property_create.image_url,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(property_obj)
    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def get_property(db: AsyncSession, property_id: int) -> Property:
    """
    Get a property by ID.
    
    Args:
        db: Database session
        property_id: Property ID
        
    Returns:
        Property instance
        
    Raises:
        HTTPException: If property not found
    """
    result = await db.execute(select(Property).where(Property.id == property_id))
    property_obj = result.scalar_one_or_none()
    if not property_obj:
        raise HTTPException(status_code=404, detail=f"Property with id {property_id} not found")
    return property_obj


async def list_properties(db: AsyncSession) -> list[Property]:
    """
    List all properties.
    
    Args:
        db: Database session
        
    Returns:
        List of Property instances
    """
    result = await db.execute(select(Property).order_by(Property.created_at.desc()))
    return list(result.scalars().all())


async def update_property(db: AsyncSession, property_id: int, property_update: dict) -> Property:
    """
    Update a property.
    
    Args:
        db: Database session
        property_id: Property ID
        property_update: Dictionary of fields to update
        
    Returns:
        Updated Property instance
        
    Raises:
        HTTPException: If property not found
    """
    property_obj = await get_property(db, property_id)
    
    for field, value in property_update.items():
        if value is not None:
            setattr(property_obj, field, value)
    
    property_obj.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def invest_in_property(db: AsyncSession, investment_create: InvestmentCreate) -> InvestmentResponse:
    """
    Process a token purchase (investment) in a property.
    
    This function:
    1. Validates user and property exist
    2. Checks property is in "offering" status
    3. Verifies enough tokens are available
    4. Verifies user has enough balance
    5. Deducts balance from user
    6. Increases tokens_sold on property
    7. Creates Investment record
    8. Updates or creates UserPropertyBalance
    9. Updates property status to "funded" if fully sold
    
    Args:
        db: Database session
        investment_create: Investment creation data
        
    Returns:
        Created Investment instance
        
    Raises:
        HTTPException: If validation fails or insufficient funds/tokens
    """
    # Validate tokens is positive
    validate_positive_number(investment_create.tokens, "tokens")
    
    # Use async transaction for atomicity
    async with db.begin_nested():
        # Fetch user
        user = await get_user(db, investment_create.user_id)
        
        # Fetch property
        property_obj = await get_property(db, investment_create.property_id)
        
        # Ensure property is in offering status
        if property_obj.status != "offering":
            raise HTTPException(
                status_code=400,
                detail=f"Property is not available for investment. Current status: {property_obj.status}"
            )
        
        # Check tokens available
        tokens_available = property_obj.total_tokens - property_obj.tokens_sold
        if investment_create.tokens > tokens_available:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough tokens available. Requested: {investment_create.tokens}, Available: {tokens_available}"
            )
        
        # Calculate cost (1 token = 1 USD)
        cost_usd = float(investment_create.tokens)
        
        # Check user balance
        if user.mock_balance_usd < cost_usd:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Required: ${cost_usd}, Available: ${user.mock_balance_usd}"
            )
        
        # Deduct balance from user
        user.mock_balance_usd -= cost_usd
        user.updated_at = datetime.utcnow()
        
        # Increase tokens_sold on property
        property_obj.tokens_sold += investment_create.tokens
        property_obj.updated_at = datetime.utcnow()
        
        # Create Investment record
        investment = Investment(
            user_id=investment_create.user_id,
            property_id=investment_create.property_id,
            tokens=investment_create.tokens,
            invested_usd=cost_usd,
            created_at=datetime.utcnow(),
        )
        db.add(investment)
        
        # Update or create UserPropertyBalance
        result = await db.execute(
            select(UserPropertyBalance).where(
                UserPropertyBalance.user_id == investment_create.user_id,
                UserPropertyBalance.property_id == investment_create.property_id,
            )
        )
        balance = result.scalar_one_or_none()
        
        if balance:
            balance.tokens += investment_create.tokens
        else:
            balance = UserPropertyBalance(
                user_id=investment_create.user_id,
                property_id=investment_create.property_id,
                tokens=investment_create.tokens,
            )
            db.add(balance)
        
        # Check if property is fully funded
        if property_obj.tokens_sold >= property_obj.total_tokens:
            property_obj.status = "funded"
    
    # Commit the transaction
    await db.commit()
    await db.refresh(investment)
    await db.refresh(user)
    await db.refresh(property_obj)
    await db.refresh(balance)
    
    # Return enhanced response
    return InvestmentResponse(
        investment=investment,
        updated_user_balance=user.mock_balance_usd,
        updated_property_tokens_sold=property_obj.tokens_sold,
        updated_property_status=property_obj.status,
        user_property_balance_tokens=balance.tokens
    )


async def list_investments(db: AsyncSession, user_id: int = None) -> list[Investment]:
    """
    List investments, optionally filtered by user.
    
    Args:
        db: Database session
        user_id: Optional user ID to filter by
        
    Returns:
        List of Investment instances
    """
    query = select(Investment).order_by(Investment.created_at.desc())
    
    if user_id is not None:
        query = query.where(Investment.user_id == user_id)
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_portfolio_summary(db: AsyncSession, user_id: int) -> PortfolioSummaryRead:
    """
    Get a user's complete portfolio summary.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        PortfolioSummaryRead with all portfolio details
        
    Raises:
        HTTPException: If user not found
    """
    # Fetch user
    user = await get_user(db, user_id)
    
    # Fetch all UserPropertyBalance rows for this user with property details
    result = await db.execute(
        select(UserPropertyBalance)
        .options(selectinload(UserPropertyBalance.property))
        .where(UserPropertyBalance.user_id == user_id)
        .order_by(UserPropertyBalance.property_id)
    )
    balances = list(result.scalars().all())
    
    # Build balance list with yield calculations
    balance_list = []
    total_tokens = 0
    total_invested_usd = 0.0
    total_estimated_annual_income_usd = 0.0
    
    for balance in balances:
        invested_usd = float(balance.tokens)  # 1 token = 1 USD
        expected_yield = balance.property.expected_annual_yield_percent
        estimated_annual_income = invested_usd * expected_yield / 100.0
        
        balance_list.append(
            UserPropertyBalanceRead(
                property_id=balance.property_id,
                property_name=balance.property.name,
                tokens=balance.tokens,
                total_tokens=balance.property.total_tokens,
                invested_usd=invested_usd,
                expected_annual_yield_percent=expected_yield,
                estimated_annual_income_usd=estimated_annual_income,
            )
        )
        total_tokens += balance.tokens
        total_invested_usd += invested_usd
        total_estimated_annual_income_usd += estimated_annual_income
    
    # Calculate portfolio value (for now, same as invested; can be updated with market prices later)
    portfolio_value_usd = total_invested_usd
    
    # Calculate total yield percentage
    total_yield_percent = (total_estimated_annual_income_usd / total_invested_usd * 100.0) if total_invested_usd > 0 else 0.0
    
    return PortfolioSummaryRead(
        user_id=user_id,
        balances=balance_list,
        total_tokens=total_tokens,
        total_invested_usd=total_invested_usd,
        portfolio_value_usd=portfolio_value_usd,
        total_yield_percent=total_yield_percent,
        total_estimated_annual_income_usd=total_estimated_annual_income_usd,
        remaining_mock_balance_usd=user.mock_balance_usd,
    )


async def update_user_wallet(db: AsyncSession, user_id: int, wallet_address: str) -> User:
    """
    Update user's blockchain wallet address.
    
    Args:
        db: Database session
        user_id: User ID
        wallet_address: Blockchain wallet address
        
    Returns:
        Updated User instance
    """
    user = await get_user(db, user_id)
    user.blockchain_wallet_address = wallet_address
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def update_property_onchain(
    db: AsyncSession, 
    property_id: int, 
    contract_address: str, 
    chain_name: str = "base"
) -> Property:
    """
    Update property's on-chain contract details.
    
    Args:
        db: Database session
        property_id: Property ID
        contract_address: Token contract address
        chain_name: Blockchain network name
        
    Returns:
        Updated Property instance
    """
    property_obj = await get_property(db, property_id)
    property_obj.token_contract_address = contract_address
    property_obj.chain_name = chain_name
    property_obj.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(property_obj)
    return property_obj


async def list_properties_paginated(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    min_price_usd: Optional[int] = None,
    max_price_usd: Optional[int] = None,
    location: Optional[str] = None,
) -> PaginatedPropertiesResponse:
    """
    List properties with pagination and filters.
    
    Args:
        db: Database session
        page: Page number (1-indexed)
        page_size: Number of items per page
        min_price_usd: Minimum price filter
        max_price_usd: Maximum price filter
        location: Location filter (case-insensitive partial match)
        
    Returns:
        PaginatedPropertiesResponse with items and metadata
    """
    # Validate pagination parameters
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="page_size must be between 1 and 100")
    
    # Build query
    query = select(Property).order_by(Property.created_at.desc())
    
    # Apply filters
    if min_price_usd is not None:
        validate_positive_number(min_price_usd, "min_price_usd")
        query = query.where(Property.price_usd >= min_price_usd)
    
    if max_price_usd is not None:
        validate_positive_number(max_price_usd, "max_price_usd")
        query = query.where(Property.price_usd <= max_price_usd)
    
    if location:
        query = query.where(Property.location.ilike(f"%{location}%"))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Calculate pagination
    offset = (page - 1) * page_size
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Get paginated results
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    properties = list(result.scalars().all())
    
    return PaginatedPropertiesResponse(
        items=properties,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

