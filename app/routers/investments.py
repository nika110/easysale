"""Investment (token purchase) endpoints."""
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
    Buy property tokens.
    
    Flow:
    1. Validate user and property
    2. Process investment in database (user pays via card/bank)
    3. Mint tokens directly to user's wallet on blockchain
    4. Return response with transaction hash
    """
    user_result = await db.execute(select(User).where(User.id == investment_create.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user = await ensure_user_wallet(db, user)
    
    response = await invest_in_property(db, investment_create)
    
    property_result = await db.execute(select(Property).where(Property.id == investment_create.property_id))
    property = property_result.scalar_one_or_none()
    
    chain_tx_hash = None
    if is_blockchain_enabled() and property and property.token_contract_address and user and user.blockchain_address:
        try:
            chain_tx_hash = await mint_to_user(
                contract_address=property.token_contract_address,
                to_address=user.blockchain_address,
                amount=investment_create.tokens
            )
            logger.info(f"✅ Blockchain mint successful: {chain_tx_hash}")
        except BlockchainError as e:
        
            logger.error(f"⚠️ Blockchain mint failed (non-fatal): {e}")
            chain_tx_hash = f"ERROR: {str(e)}"
        except Exception as e:
            chain_tx_hash = f"ERROR: {str(e)}"
    else:
        if not is_blockchain_enabled():
            chain_tx_hash = "Blockchain disabled"
        elif not property or not property.token_contract_address:
            chain_tx_hash = "Property not deployed"
        elif not user or not user.blockchain_address:
            chain_tx_hash = "User wallet not created"
    
    response_dict = response.model_dump()
    response_dict['investment']['chain_tx_hash'] = chain_tx_hash
    
    return response_dict

@router.get("", response_model=list[InvestmentRead])
async def list_investments_endpoint(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: AsyncSession = Depends(get_db),
):
    investments = await list_investments(db, user_id)
    return investments