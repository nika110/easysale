"""
DAO Governance Services - Token-weighted off-chain voting.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
import logging

from app.models import DaoProposal, DaoVote, Property, UserPropertyBalance, User
from app.schemas import DaoProposalCreate, DaoVoteCreate, DaoProposalResult

logger = logging.getLogger(__name__)


async def create_dao_proposal(
    db: AsyncSession,
    proposal_create: DaoProposalCreate
) -> DaoProposal:
    """
    Create a new DAO proposal for a property.
    
    Args:
        db: Database session
        proposal_create: Proposal creation data
        
    Returns:
        Created DaoProposal instance
    """
    # Verify property exists
    property_result = await db.execute(
        select(Property).where(Property.id == proposal_create.property_id)
    )
    property_obj = property_result.scalar_one_or_none()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Verify creator exists
    user_result = await db.execute(
        select(User).where(User.id == proposal_create.created_by_user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify creator owns tokens in this property
    balance_result = await db.execute(
        select(UserPropertyBalance).where(
            UserPropertyBalance.user_id == proposal_create.created_by_user_id,
            UserPropertyBalance.property_id == proposal_create.property_id
        )
    )
    balance = balance_result.scalar_one_or_none()
    if not balance or balance.tokens <= 0:
        raise HTTPException(
            status_code=403,
            detail="Only token holders can create proposals for this property"
        )
    
    # Validate options
    if len(proposal_create.options) < 2:
        raise HTTPException(
            status_code=400,
            detail="Proposal must have at least 2 options"
        )
    
    # Check if property is fully funded (all tokens sold)
    if property_obj.tokens_sold < property_obj.total_tokens:
        raise HTTPException(
            status_code=400,
            detail="Cannot create proposal: property must be fully funded (all tokens sold)"
        )
    
    # Determine status based on dates
    now = datetime.utcnow()
    status = "active"  # Default to active so users can vote immediately
    if proposal_create.start_at and proposal_create.end_at:
        # Make start_at and end_at timezone-naive for comparison
        start_at_naive = proposal_create.start_at.replace(tzinfo=None) if proposal_create.start_at.tzinfo else proposal_create.start_at
        end_at_naive = proposal_create.end_at.replace(tzinfo=None) if proposal_create.end_at.tzinfo else proposal_create.end_at
        
        if start_at_naive >= end_at_naive:
            raise HTTPException(
                status_code=400,
                detail="start_at must be before end_at"
            )
        if now < start_at_naive:
            status = "draft"  # Not started yet
        elif start_at_naive <= now < end_at_naive:
            status = "active"
        elif now >= end_at_naive:
            status = "closed"
    
    # Create proposal
    proposal = DaoProposal(
        property_id=proposal_create.property_id,
        title=proposal_create.title,
        description=proposal_create.description,
        proposal_type=proposal_create.proposal_type,
        options_json=proposal_create.options,
        min_quorum_percent=proposal_create.min_quorum_percent,
        status=status,
        start_at=proposal_create.start_at,
        end_at=proposal_create.end_at,
        created_by_user_id=proposal_create.created_by_user_id,
        created_at=now,
        updated_at=now
    )
    
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)
    
    logger.info(f"Created DAO proposal {proposal.id} for property {proposal.property_id}")
    return proposal


async def get_proposal(db: AsyncSession, proposal_id: int) -> DaoProposal:
    """Get a proposal by ID."""
    result = await db.execute(
        select(DaoProposal).where(DaoProposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


async def get_all_proposals(
    db: AsyncSession,
    user_id: Optional[int] = None,
    status: Optional[str] = None
) -> list[DaoProposal]:
    """Get all proposals, optionally filtered by user or status."""
    query = select(DaoProposal).order_by(DaoProposal.created_at.desc())
    
    if user_id:
        query = query.where(DaoProposal.created_by_user_id == user_id)
    
    if status:
        query = query.where(DaoProposal.status == status)
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_property_proposals(
    db: AsyncSession,
    property_id: int,
    status: Optional[str] = None
) -> list[DaoProposal]:
    """Get all proposals for a property, optionally filtered by status."""
    query = select(DaoProposal).where(DaoProposal.property_id == property_id)
    
    if status:
        query = query.where(DaoProposal.status == status)
    
    query = query.order_by(DaoProposal.created_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def cast_vote(
    db: AsyncSession,
    proposal_id: int,
    vote_create: DaoVoteCreate
) -> DaoVote:
    """
    Cast a vote on a proposal.
    Vote weight = user's current token balance for that property.
    
    Args:
        db: Database session
        proposal_id: Proposal ID
        vote_create: Vote data
        
    Returns:
        Created DaoVote instance
    """
    # Get proposal
    proposal = await get_proposal(db, proposal_id)
    
    # Check proposal is active
    if proposal.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal is {proposal.status}, not active"
        )
    
    # Check voting period
    now = datetime.utcnow()
    if proposal.start_at:
        start_at_naive = proposal.start_at.replace(tzinfo=None) if proposal.start_at.tzinfo else proposal.start_at
        if now < start_at_naive:
            raise HTTPException(status_code=400, detail="Voting has not started yet")
    if proposal.end_at:
        end_at_naive = proposal.end_at.replace(tzinfo=None) if proposal.end_at.tzinfo else proposal.end_at
        if now > end_at_naive:
            raise HTTPException(status_code=400, detail="Voting has ended")
    
    # Verify user exists
    user_result = await db.execute(
        select(User).where(User.id == vote_create.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's token balance for this property
    balance_result = await db.execute(
        select(UserPropertyBalance).where(
            UserPropertyBalance.user_id == vote_create.user_id,
            UserPropertyBalance.property_id == proposal.property_id
        )
    )
    balance = balance_result.scalar_one_or_none()
    
    if not balance or balance.tokens <= 0:
        raise HTTPException(
            status_code=403,
            detail="You must own tokens in this property to vote"
        )
    
    # Validate option index
    if vote_create.selected_option_index < 0 or \
       vote_create.selected_option_index >= len(proposal.options_json):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid option index. Must be 0-{len(proposal.options_json)-1}"
        )
    
    # Check if user already voted
    existing_vote_result = await db.execute(
        select(DaoVote).where(
            DaoVote.proposal_id == proposal_id,
            DaoVote.user_id == vote_create.user_id
        )
    )
    existing_vote = existing_vote_result.scalar_one_or_none()
    
    if existing_vote:
        raise HTTPException(
            status_code=400,
            detail="You have already voted on this proposal"
        )
    
    # Create vote with weight = current token balance
    vote = DaoVote(
        proposal_id=proposal_id,
        user_id=vote_create.user_id,
        selected_option_index=vote_create.selected_option_index,
        weight_tokens=balance.tokens,
        created_at=datetime.utcnow()
    )
    
    db.add(vote)
    await db.commit()
    await db.refresh(vote)
    
    logger.info(
        f"User {vote_create.user_id} voted on proposal {proposal_id} "
        f"with weight {balance.tokens} tokens"
    )
    
    return vote


async def compute_proposal_results(
    db: AsyncSession,
    proposal_id: int
) -> DaoProposalResult:
    """
    Compute voting results for a proposal.
    
    Args:
        db: Database session
        proposal_id: Proposal ID
        
    Returns:
        DaoProposalResult with vote counts and percentages
    """
    # Get proposal
    proposal = await get_proposal(db, proposal_id)
    
    # Get property to know total tokens
    property_result = await db.execute(
        select(Property).where(Property.id == proposal.property_id)
    )
    property_obj = property_result.scalar_one()
    total_tokens = property_obj.total_tokens
    
    # Get all votes for this proposal
    votes_result = await db.execute(
        select(DaoVote).where(DaoVote.proposal_id == proposal_id)
    )
    votes = list(votes_result.scalars().all())
    
    # Count votes per option
    option_votes = [0] * len(proposal.options_json)
    total_votes_cast = 0
    
    for vote in votes:
        option_votes[vote.selected_option_index] += vote.weight_tokens
        total_votes_cast += vote.weight_tokens
    
    # Calculate percentages
    results = []
    for i, option in enumerate(proposal.options_json):
        votes_for_option = option_votes[i]
        percentage = (votes_for_option / total_votes_cast * 100) if total_votes_cast > 0 else 0.0
        results.append({
            "option": option,
            "votes": votes_for_option,
            "percentage": round(percentage, 2)
        })
    
    # Check quorum
    quorum_reached = (total_votes_cast / total_tokens * 100) >= proposal.min_quorum_percent
    
    # Find winning option (most votes)
    winning_option = None
    if results:
        max_votes = max(r["votes"] for r in results)
        if max_votes > 0:
            winning_option = next(r["option"] for r in results if r["votes"] == max_votes)
    
    return DaoProposalResult(
        proposal_id=proposal_id,
        total_tokens=total_tokens,
        votes_cast=total_votes_cast,
        quorum_reached=quorum_reached,
        results=results,
        winning_option=winning_option,
        status=proposal.status
    )


async def close_proposal(db: AsyncSession, proposal_id: int) -> DaoProposal:
    """
    Close a proposal (mark as closed).
    
    Args:
        db: Database session
        proposal_id: Proposal ID
        
    Returns:
        Updated DaoProposal instance
    """
    proposal = await get_proposal(db, proposal_id)
    
    if proposal.status == "closed":
        raise HTTPException(status_code=400, detail="Proposal is already closed")
    
    proposal.status = "closed"
    proposal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(proposal)
    
    logger.info(f"Closed proposal {proposal_id}")
    return proposal


async def approve_proposal(
    db: AsyncSession,
    proposal_id: int
) -> DaoProposal:
    """
    Approve a proposal (admin action for rent decisions).
    
    Args:
        db: Database session
        proposal_id: Proposal ID
        
    Returns:
        Updated DaoProposal instance
    """
    proposal = await get_proposal(db, proposal_id)
    
    if proposal.status == "approved":
        raise HTTPException(status_code=400, detail="Proposal is already approved")
    
    proposal.status = "approved"
    proposal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(proposal)
    
    logger.info(f"Approved proposal {proposal_id} (property {proposal.property_id})")
    return proposal


async def get_rent_proposals(
    db: AsyncSession,
    status: Optional[str] = None
) -> list[DaoProposal]:
    """
    Get all rent decision proposals.
    
    Args:
        db: Database session
        status: Optional status filter
        
    Returns:
        List of DaoProposal instances
    """
    query = select(DaoProposal).where(
        DaoProposal.proposal_type == "rent_decision"
    ).order_by(DaoProposal.created_at.desc())
    
    if status:
        query = query.where(DaoProposal.status == status)
    
    result = await db.execute(query)
    proposals = list(result.scalars().all())
    
    return proposals


async def get_property_rent_status(
    db: AsyncSession,
    property_id: int
) -> dict:
    """
    Get the rental status of a property.
    
    Args:
        db: Database session
        property_id: Property ID
        
    Returns:
        Dict with rental status information
    """
    # Get approved rent decision proposal for this property
    query = select(DaoProposal).where(
        DaoProposal.property_id == property_id,
        DaoProposal.proposal_type == "rent_decision",
        DaoProposal.status == "approved"
    ).order_by(DaoProposal.updated_at.desc())
    
    result = await db.execute(query)
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        return {
            "is_rented": False,
            "monthly_rent": None,
            "approved_at": None
        }
    
    # Get the winning option (rent amount) from proposal results
    results = await compute_proposal_results(db, proposal.id)
    
    return {
        "is_rented": True,
        "monthly_rent": results.winning_option if results.winning_option else None,
        "approved_at": proposal.updated_at.isoformat() if proposal.updated_at else None,
        "proposal_id": proposal.id,
        "proposal_title": proposal.title
    }


async def calculate_user_rent_payout(
    db: AsyncSession,
    property_id: int,
    user_id: int
) -> dict:
    """
    Calculate user's expected monthly rent payout.
    
    Args:
        db: Database session
        property_id: Property ID
        user_id: User ID
        
    Returns:
        Dict with payout information
    """
    # Get property
    property_result = await db.execute(select(Property).where(Property.id == property_id))
    property_obj = property_result.scalar_one_or_none()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get user's token balance
    balance_result = await db.execute(
        select(UserPropertyBalance).where(
            UserPropertyBalance.user_id == user_id,
            UserPropertyBalance.property_id == property_id
        )
    )
    balance = balance_result.scalar_one_or_none()
    if not balance or balance.tokens <= 0:
        return {
            "has_tokens": False,
            "monthly_payout": 0,
            "ownership_percentage": 0
        }
    
    # Get rent status
    rent_status = await get_property_rent_status(db, property_id)
    if not rent_status["is_rented"] or not rent_status["monthly_rent"]:
        return {
            "has_tokens": True,
            "is_rented": False,
            "monthly_payout": 0,
            "ownership_percentage": (balance.tokens / property_obj.total_tokens) * 100
        }
    
    # Calculate payout
    monthly_rent = float(rent_status["monthly_rent"])
    ownership_percentage = (balance.tokens / property_obj.total_tokens) * 100
    monthly_payout = monthly_rent * (balance.tokens / property_obj.total_tokens)
    
    return {
        "has_tokens": True,
        "is_rented": True,
        "monthly_rent": monthly_rent,
        "tokens_owned": balance.tokens,
        "total_tokens": property_obj.total_tokens,
        "ownership_percentage": ownership_percentage,
        "monthly_payout": monthly_payout
    }


async def claim_rent(
    db: AsyncSession,
    property_id: int,
    user_id: int
) -> dict:
    """
    Claim accumulated rent for a property.
    
    Users can claim once per month per property.
    
    Args:
        db: Database session
        property_id: Property ID
        user_id: User ID
        
    Returns:
        Dict with claim result
    """
    from app.models import RentClaim
    
    # Calculate payout
    payout_info = await calculate_user_rent_payout(db, property_id, user_id)
    
    if not payout_info["has_tokens"]:
        raise HTTPException(status_code=400, detail="You don't own tokens in this property")
    
    if not payout_info["is_rented"]:
        raise HTTPException(status_code=400, detail="This property is not currently rented")
    
    monthly_payout = payout_info["monthly_payout"]
    if monthly_payout <= 0:
        raise HTTPException(status_code=400, detail="No rent to claim")
    
    # Check if user has already claimed for this month
    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year
    
    existing_claim_query = select(RentClaim).where(
        RentClaim.user_id == user_id,
        RentClaim.property_id == property_id,
        RentClaim.claim_period_month == current_month,
        RentClaim.claim_period_year == current_year
    )
    existing_claim_result = await db.execute(existing_claim_query)
    existing_claim = existing_claim_result.scalar_one_or_none()
    
    if existing_claim:
        raise HTTPException(
            status_code=400, 
            detail=f"You have already claimed rent for this property in {now.strftime('%B %Y')}. Next claim available on {now.replace(day=1, month=now.month % 12 + 1).strftime('%B 1, %Y')}."
        )
    
    # Get user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create rent claim record
    rent_claim = RentClaim(
        user_id=user_id,
        property_id=property_id,
        amount_claimed_usd=monthly_payout,
        tokens_owned_at_claim=payout_info["tokens_owned"],
        monthly_rent_at_claim=payout_info["monthly_rent"],
        claim_period_month=current_month,
        claim_period_year=current_year
    )
    db.add(rent_claim)
    
    # Add rent to user's balance
    user.mock_balance_usd += monthly_payout
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    logger.info(
        f"User {user_id} claimed ${monthly_payout:.2f} rent from property {property_id} for {now.strftime('%B %Y')}"
    )
    
    return {
        "success": True,
        "amount_claimed": monthly_payout,
        "new_balance": user.mock_balance_usd,
        "property_id": property_id,
        "claim_period": f"{now.strftime('%B %Y')}"
    }
