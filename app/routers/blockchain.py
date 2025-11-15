"""
Blockchain integration endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.db import get_db
from app.models import Property
from app.schemas import PropertyOnChainStatus, OnChainPropertyInfo
from app.blockchain.realestate1155 import (
    create_property_contract_via_factory,
    get_property_on_chain,
    BlockchainError
)
from app.blockchain.client import (
    is_blockchain_enabled,
    get_blockchain_status
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/status")
async def blockchain_status():
    """
    Get blockchain connection status.
    """
    return get_blockchain_status()


@router.post("/properties/{property_id}/create-onchain")
async def create_property_onchain_endpoint(
    property_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Deploy a new RealEstate1155 contract for this property via the factory.
    
    This should be called after creating the property in the database.
    It will:
    1. Call factory.createPropertyContract() to deploy a NEW contract
    2. Update the backend property with the deployed contract address
    
    IMPORTANT: Each property gets its OWN contract instance!
    """
    if not is_blockchain_enabled():
        raise HTTPException(
            status_code=503,
            detail="Blockchain not configured. Set BLOCKCHAIN_RPC_URL, PROPERTY_FACTORY_ADDRESS, and OWNER_PRIVATE_KEY"
        )
    
    # Get property from database
    result = await db.execute(select(Property).where(Property.id == property_id))
    property = result.scalar_one_or_none()
    
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if already on-chain
    if property.token_contract_address:
        raise HTTPException(
            status_code=400,
            detail=f"Property already has a contract deployed at {property.token_contract_address}"
        )
    
    # Deploy new contract via factory
    try:
        tx_hash, contract_address = await create_property_contract_via_factory(
            property_id=property.id,
            total_tokens=property.price_usd,  # 1 token = 1 USD
            price_per_token=1,
            base_uri=f"https://api.example.com/metadata/{property.id}/",
            property_name=property.apartment_name or f"Property {property.id}",
            property_symbol=f"PROP{property.id}"
        )
        
        # Update backend with deployed contract address
        property.token_contract_address = contract_address
        property.chain_name = "base"
        await db.commit()
        await db.refresh(property)
        
        return {
            "success": True,
            "property_id": property_id,
            "tx_hash": tx_hash,
            "contract_address": contract_address,
            "total_tokens": property.price_usd,
            "message": f"New RealEstate1155 contract deployed for property {property_id}"
        }
        
    except BlockchainError as e:
        logger.error(f"Blockchain error deploying contract for property {property_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deploying contract for property {property_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(e)}")


@router.get("/properties/{property_id}/onchain-status", response_model=PropertyOnChainStatus)
async def get_property_onchain_status(
    property_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get combined backend and on-chain status for a property.
    
    Returns:
    - Backend data (from database)
    - On-chain data (from smart contract)
    """
    # Get property from database
    result = await db.execute(select(Property).where(Property.id == property_id))
    property = result.scalar_one_or_none()
    
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Backend data
    backend_data = {
        "total_tokens": property.total_tokens,
        "tokens_sold": property.tokens_sold,
        "status": property.status,
        "token_contract_address": property.token_contract_address,
        "chain_name": property.chain_name
    }
    
    # On-chain data (if available)
    onchain_data = None
    if property.token_contract_address and is_blockchain_enabled():
        try:
            # Use property's specific contract address
            onchain_info = get_property_on_chain(property.token_contract_address)
            if onchain_info:
                onchain_data = OnChainPropertyInfo(
                    contract_address=property.token_contract_address,
                    total_tokens=onchain_info["total_tokens"],
                    tokens_minted=onchain_info["tokens_minted"],
                    is_active=onchain_info["is_active"],
                    is_funded=onchain_info["is_funded"]
                )
        except Exception as e:
            logger.error(f"Error fetching on-chain data for property {property_id} from {property.token_contract_address}: {e}")
    
    return PropertyOnChainStatus(
        property_id=property_id,
        backend=backend_data,
        onchain=onchain_data
    )

