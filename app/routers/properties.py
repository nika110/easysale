"""
Property management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db import get_db
from app.schemas import (
    PropertyCreate, PropertyRead, PropertyUpdate, PropertyOnchainUpdate,
    PaginatedPropertiesResponse
)
from app.services import (
    create_property, get_property, list_properties, update_property,
    update_property_onchain, list_properties_paginated
)
from app.blockchain.client import is_blockchain_enabled
from app.blockchain.realestate1155 import create_property_contract_via_factory, BlockchainError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=PropertyRead, status_code=201)
async def create_property_endpoint(
    property_create: PropertyCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new property listing.
    
    If blockchain is enabled, automatically deploys the property contract on-chain.
    """
    # Create property in database
    property_obj = await create_property(db, property_create)
    
    # Auto-deploy on blockchain if enabled
    if is_blockchain_enabled():
        try:
            logger.info(f"Auto-deploying property {property_obj.id} on-chain...")
            
            # Deploy contract via factory
            tx_hash, contract_address = await create_property_contract_via_factory(
                property_id=property_obj.id,
                total_tokens=property_obj.total_tokens,
                price_per_token=1_000_000,  # 1 USDC (6 decimals)
                base_uri=f"https://api.example.com/metadata/",
                property_name=property_obj.name,
                property_symbol=f"RE{property_obj.id}"
            )
            
            # Update property with contract address
            property_obj.token_contract_address = contract_address
            property_obj.chain_name = "base"
            await db.commit()
            await db.refresh(property_obj)
            
            logger.info(f"✅ Property {property_obj.id} deployed at {contract_address} (tx: {tx_hash})")
            
        except BlockchainError as e:
            # Log error but don't fail the request
            # Property is created in DB, blockchain deployment can be retried later
            logger.error(f"⚠️ Blockchain deployment failed for property {property_obj.id}: {e}")
        except Exception as e:
            logger.error(f"⚠️ Unexpected error deploying property {property_obj.id}: {e}")
    else:
        logger.info("Blockchain not enabled, skipping auto-deployment")
    
    return property_obj


@router.get("", response_model=PaginatedPropertiesResponse)
async def list_properties_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    min_price_usd: Optional[int] = Query(None, ge=0, description="Minimum price filter"),
    max_price_usd: Optional[int] = Query(None, ge=0, description="Maximum price filter"),
    location: Optional[str] = Query(None, description="Location filter (partial match)"),
    db: AsyncSession = Depends(get_db),
):
    """
    List properties with pagination and filters.
    """
    return await list_properties_paginated(
        db=db,
        page=page,
        page_size=page_size,
        min_price_usd=min_price_usd,
        max_price_usd=max_price_usd,
        location=location,
    )


@router.get("/{property_id}", response_model=PropertyRead)
async def get_property_endpoint(
    property_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific property by ID.
    """
    property_obj = await get_property(db, property_id)
    return property_obj


@router.patch("/{property_id}", response_model=PropertyRead)
async def update_property_endpoint(
    property_id: int,
    property_update: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a property.
    """
    update_data = property_update.model_dump(exclude_unset=True)
    property_obj = await update_property(db, property_id, update_data)
    return property_obj


@router.patch("/{property_id}/onchain", response_model=PropertyRead)
async def update_property_onchain_endpoint(
    property_id: int,
    onchain_update: PropertyOnchainUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update property's on-chain contract details.
    """
    property_obj = await update_property_onchain(
        db=db,
        property_id=property_id,
        contract_address=onchain_update.token_contract_address,
        chain_name=onchain_update.chain_name or "base",
    )
    return property_obj

