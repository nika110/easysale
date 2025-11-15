"""
Portfolio management endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas import PortfolioSummaryRead
from app.services import get_portfolio_summary

router = APIRouter()


@router.get("/{user_id}", response_model=PortfolioSummaryRead)
async def get_portfolio_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a user's complete portfolio summary.
    """
    portfolio = await get_portfolio_summary(db, user_id)
    return portfolio

