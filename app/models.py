"""
SQLAlchemy database models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.db import Base


class User(Base):
    """User model representing a platform user."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    mock_balance_usd = Column(Float, nullable=False, default=10000.0)
    
    # Blockchain wallet (auto-generated per user)
    blockchain_address = Column(String, unique=True, nullable=True, index=True)  # User's EOA address
    blockchain_private_key = Column(String, nullable=True)  # HACKATHON ONLY - encrypt in production!
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    investments = relationship("Investment", back_populates="user")
    property_balances = relationship("UserPropertyBalance", back_populates="user")


class Property(Base):
    """Property model representing an individual apartment/unit that can be purchased."""
    
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Main property information
    name = Column(String, nullable=False)  # Display name
    
    # Optional: Project/apartment structure (for backward compatibility)
    project_id = Column(String, nullable=True, index=True)  # e.g., "PROJ-001"
    project_name = Column(String, nullable=True)  # e.g., "Sunset Towers"
    apartment_name = Column(String, nullable=True)  # e.g., "Unit 101 - Garden View"
    floor = Column(Integer, nullable=True)  # Floor number
    
    # Common fields
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    
    # Pricing and tokenization
    price_usd = Column(Integer, nullable=False)  # Price of THIS apartment
    total_tokens = Column(Integer, nullable=False)  # Tokens for THIS apartment
    tokens_sold = Column(Integer, nullable=False, default=0)
    
    # Property details
    expected_annual_yield_percent = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="offering")
    image_url = Column(String, nullable=True)
    
    # Blockchain fields
    token_contract_address = Column(String, nullable=True)  # On-chain token contract
    chain_name = Column(String, nullable=False, default="base")  # Blockchain network
    
    # Square meter measurements
    total_sqm = Column(Float, nullable=True)
    bedroom_sqm = Column(Float, nullable=True)
    bathroom_sqm = Column(Float, nullable=True)
    balcony_sqm = Column(Float, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    investments = relationship("Investment", back_populates="property")
    user_balances = relationship("UserPropertyBalance", back_populates="property")
    dao_proposals = relationship("DaoProposal", back_populates="property")


class Investment(Base):
    """Investment model representing a token purchase transaction."""
    
    __tablename__ = "investments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    tokens = Column(Integer, nullable=False)
    invested_usd = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="investments")
    property = relationship("Property", back_populates="investments")


class UserPropertyBalance(Base):
    """UserPropertyBalance model tracking current token holdings per property."""
    
    __tablename__ = "user_property_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    tokens = Column(Integer, nullable=False, default=0)
    
    # Unique constraint to ensure one balance record per user-property pair
    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uix_user_property"),
    )
    
    # Relationships
    user = relationship("User", back_populates="property_balances")
    property = relationship("Property", back_populates="user_balances")


class DaoProposal(Base):
    """DAO Proposal model for property governance."""
    
    __tablename__ = "dao_proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    proposal_type = Column(String, nullable=False)  # e.g., "property_upgrade", "rent_adjustment", "general"
    options_json = Column(JSON, nullable=False)  # e.g., ["Yes", "No", "Abstain"]
    min_quorum_percent = Column(Float, nullable=False, default=10.0)  # Minimum % of tokens that must vote
    status = Column(String, nullable=False, default="draft")  # "draft", "active", "closed"
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="dao_proposals")
    creator = relationship("User", foreign_keys=[created_by_user_id])
    votes = relationship("DaoVote", back_populates="proposal", cascade="all, delete-orphan")


class DaoVote(Base):
    """DAO Vote model tracking user votes on proposals."""
    
    __tablename__ = "dao_votes"
    
    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("dao_proposals.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    selected_option_index = Column(Integer, nullable=False)  # Index into options_json array
    weight_tokens = Column(Integer, nullable=False)  # User's token balance at time of vote
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Unique constraint: one vote per user per proposal
    __table_args__ = (
        UniqueConstraint("proposal_id", "user_id", name="uix_proposal_user"),
    )
    
    # Relationships
    proposal = relationship("DaoProposal", back_populates="votes")
    user = relationship("User")

