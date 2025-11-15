"""
DAO Governance Router - Token-weighted off-chain voting endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db import get_db
from app.schemas import (
    DaoProposalCreate,
    DaoProposalRead,
    DaoVoteCreate,
    DaoVoteRead,
    DaoProposalResult
)
from app.dao_services import (
    create_dao_proposal,
    get_proposal,
    get_property_proposals,
    cast_vote,
    compute_proposal_results,
    close_proposal
)

router = APIRouter()


@router.post("/proposals", response_model=DaoProposalRead, status_code=201)
async def create_proposal_endpoint(
    proposal_create: DaoProposalCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new DAO proposal for a property.
    
    Requirements:
    - User must own tokens in the property
    - Proposal must have at least 2 options
    - If dates provided, start_at must be before end_at
    """
    proposal = await create_dao_proposal(db, proposal_create)
    return proposal


@router.get("/properties/{property_id}/proposals", response_model=list[DaoProposalRead])
async def get_property_proposals_endpoint(
    property_id: int,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all proposals for a property.
    
    Optional query param:
    - status: Filter by status ("draft", "active", "closed")
    """
    proposals = await get_property_proposals(db, property_id, status)
    return proposals


@router.get("/proposals/{proposal_id}", response_model=DaoProposalRead)
async def get_proposal_endpoint(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific proposal by ID."""
    proposal = await get_proposal(db, proposal_id)
    return proposal


@router.post("/proposals/{proposal_id}/vote", response_model=DaoVoteRead, status_code=201)
async def cast_vote_endpoint(
    proposal_id: int,
    vote_create: DaoVoteCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Cast a vote on a proposal.
    
    Vote weight = user's current token balance for that property.
    
    Requirements:
    - Proposal must be active
    - User must own tokens in the property
    - User can only vote once per proposal
    - Voting must be within the time window (if set)
    """
    vote = await cast_vote(db, proposal_id, vote_create)
    return vote


@router.get("/proposals/{proposal_id}/results", response_model=DaoProposalResult)
async def get_proposal_results_endpoint(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get voting results for a proposal.
    
    Returns:
    - Total tokens in property
    - Total votes cast (weighted by token balance)
    - Whether quorum was reached
    - Vote breakdown per option
    - Winning option (if any)
    """
    results = await compute_proposal_results(db, proposal_id)
    return results


@router.post("/proposals/{proposal_id}/close", response_model=DaoProposalRead)
async def close_proposal_endpoint(
    proposal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Close a proposal (mark as closed).
    
    This would typically be called by an admin or automatically
    when the end_at time is reached.
    """
    proposal = await close_proposal(db, proposal_id)
    return proposal

