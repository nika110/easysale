"""
User management endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas import UserCreate, UserRead, UserWalletUpdate, UserWalletInfo
from app.services import create_user, get_user, list_users, update_user_wallet, ensure_user_wallet

router = APIRouter()


@router.post("", response_model=UserRead, status_code=201)
async def create_user_endpoint(
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user with initial mock balance and blockchain wallet.
    """
    user = await create_user(db, user_create)
    # Auto-generate blockchain wallet for new user
    user = await ensure_user_wallet(db, user)
    return user


@router.get("", response_model=list[UserRead])
async def list_users_endpoint(
    db: AsyncSession = Depends(get_db),
):
    """
    List all users.
    """
    users = await list_users(db)
    return users


@router.get("/{user_id}", response_model=UserRead)
async def get_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific user by ID.
    """
    user = await get_user(db, user_id)
    return user


@router.get("/{user_id}/wallet", response_model=UserWalletInfo)
async def get_user_wallet_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's blockchain wallet information.
    """
    user = await get_user(db, user_id)
    return UserWalletInfo(
        user_id=user.id,
        blockchain_address=user.blockchain_address
    )


@router.patch("/{user_id}/wallet", response_model=UserRead)
async def update_user_wallet_endpoint(
    user_id: int,
    wallet_update: UserWalletUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update user's blockchain wallet address.
    """
    user = await update_user_wallet(db, user_id, wallet_update.blockchain_wallet_address)
    return user

