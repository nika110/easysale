"""
Investment (token purchase) endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.db import get_db
from app.models import Property, User
from app.schemas import InvestmentCreate, InvestmentRead, InvestmentResponse
from app.services import invest_in_property, list_investments, ensure_user_wallet
from app.blockchain.realestate1155 import mint_to_user, BlockchainError
from app.blockchain.client import is_blockchain_enabled

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/buy", response_model=InvestmentResponse, status_code=201)
async def buy_tokens_endpoint(
    investment_create: InvestmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Buy property tokens (make an investment).
    
    Flow:
    1. Ensure user has blockchain wallet
    2. Process investment in database (user pays via card/bank)
    3. Mint tokens directly to user's wallet on blockchain
    4. Return response with transaction hash
    """
    # Get user and ensure they have a blockchain wallet
    user_result = await db.execute(select(User).where(User.id == investment_create.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user = await ensure_user_wallet(db, user)
    
    # Process investment in database
    response = await invest_in_property(db, investment_create)
    
    # Get property to check contract address
    property_result = await db.execute(select(Property).where(Property.id == investment_create.property_id))
    property = property_result.scalar_one_or_none()
    
    # Mint tokens directly to user's wallet on blockchain (if enabled)
    chain_tx_hash = None
    if is_blockchain_enabled() and property and property.token_contract_address and user and user.blockchain_address:
        try:
            logger.info(f"Minting {investment_create.tokens} tokens to user {user.blockchain_address} on contract {property.token_contract_address}")
            chain_tx_hash = await mint_to_user(
                contract_address=property.token_contract_address,
                to_address=user.blockchain_address,
                amount=investment_create.tokens
            )
            logger.info(f"✅ Blockchain mint successful: {chain_tx_hash}")
        except BlockchainError as e:
            # Log error but don't fail the request
            # Database is source of truth for user balances
            logger.error(f"⚠️ Blockchain mint failed (non-fatal): {e}")
            chain_tx_hash = f"ERROR: {str(e)}"
        except Exception as e:
            logger.error(f"⚠️ Unexpected blockchain error (non-fatal): {e}")
            chain_tx_hash = f"ERROR: {str(e)}"
    else:
        if not is_blockchain_enabled():
            logger.info("Blockchain not enabled, skipping on-chain mint")
        elif not property or not property.token_contract_address:
            logger.info("Property contract not deployed, skipping on-chain mint")
        elif not user or not user.blockchain_address:
            logger.info("User wallet not available, skipping on-chain mint")
    
    # Add transaction hash to response
    response_dict = response.model_dump()
    response_dict['investment']['chain_tx_hash'] = chain_tx_hash
    
    return response_dict


@router.get("", response_model=list[InvestmentRead])
async def list_investments_endpoint(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all investments, optionally filtered by user.
    """
    investments = await list_investments(db, user_id)
    return investments

