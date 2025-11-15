"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict


# ==================== User Schemas ====================

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    pass


class UserRead(BaseModel):
    """Schema for reading user data."""
    id: int
    email: EmailStr
    full_name: Optional[str]
    mock_balance_usd: float
    blockchain_address: Optional[str] = None  # User's blockchain wallet address
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserWalletUpdate(BaseModel):
    """Schema for updating user's blockchain wallet address."""
    blockchain_wallet_address: str


class UserWalletInfo(BaseModel):
    """Schema for user's blockchain wallet information."""
    user_id: int
    blockchain_address: Optional[str] = None


# ==================== Property Schemas ====================

class PropertyBase(BaseModel):
    """Base property schema."""
    name: str
    description: str
    location: str
    price_usd: int
    expected_annual_yield_percent: float
    image_url: Optional[str] = None


class PropertyCreate(PropertyBase):
    """Schema for creating a new property."""
    pass


class PropertyUpdate(BaseModel):
    """Schema for updating a property."""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    expected_annual_yield_percent: Optional[float] = None
    status: Optional[str] = None
    image_url: Optional[str] = None


class PropertyRead(BaseModel):
    """Schema for reading property data."""
    id: int
    name: str
    description: str
    location: str
    price_usd: int
    total_tokens: int
    tokens_sold: int
    expected_annual_yield_percent: float
    status: str
    image_url: Optional[str]
    token_contract_address: Optional[str] = None
    chain_name: str = "base"
    
    # Optional fields (for backward compatibility with old data structure)
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    apartment_name: Optional[str] = None
    floor: Optional[int] = None
    total_sqm: Optional[float] = None
    bedroom_sqm: Optional[float] = None
    bathroom_sqm: Optional[float] = None
    balcony_sqm: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PropertyOnchainUpdate(BaseModel):
    """Schema for updating property's blockchain contract details."""
    token_contract_address: str
    chain_name: Optional[str] = "base"


# ==================== Investment Schemas ====================

class InvestmentCreate(BaseModel):
    """Schema for creating a new investment (buying tokens)."""
    user_id: int
    property_id: int
    tokens: int


class InvestmentRead(BaseModel):
    """Schema for reading investment data."""
    id: int
    user_id: int
    property_id: int
    tokens: int
    invested_usd: float
    created_at: datetime
    chain_tx_hash: Optional[str] = None  # Blockchain transaction hash
    
    model_config = ConfigDict(from_attributes=True)


class InvestmentResponse(BaseModel):
    """Enhanced response for investment purchase."""
    investment: InvestmentRead
    updated_user_balance: float
    updated_property_tokens_sold: int
    updated_property_status: str
    user_property_balance_tokens: int


# ==================== Portfolio Schemas ====================

class UserPropertyBalanceRead(BaseModel):
    """Schema for reading a user's balance in a specific property."""
    property_id: int
    property_name: str
    tokens: int
    invested_usd: float
    expected_annual_yield_percent: float
    estimated_annual_income_usd: float


class PortfolioSummaryRead(BaseModel):
    """Schema for reading a user's complete portfolio summary."""
    user_id: int
    balances: list[UserPropertyBalanceRead]
    total_tokens: int
    total_invested_usd: float
    total_estimated_annual_income_usd: float
    remaining_mock_balance_usd: float


# ==================== Pagination Schemas ====================

class PaginatedPropertiesResponse(BaseModel):
    """Schema for paginated properties response."""
    items: list[PropertyRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class OnChainPropertyInfo(BaseModel):
    """On-chain property information."""
    contract_address: str
    total_tokens: int
    tokens_minted: int
    is_active: bool
    is_funded: bool


class PropertyOnChainStatus(BaseModel):
    """Combined backend and on-chain property status."""
    property_id: int
    backend: dict
    onchain: Optional[OnChainPropertyInfo] = None


# ==================== DAO Governance Schemas ====================

class DaoProposalBase(BaseModel):
    """Base DAO proposal schema."""
    property_id: int
    title: str
    description: str
    proposal_type: str  # "property_upgrade", "rent_adjustment", "general"
    options: list[str]  # e.g., ["Yes", "No", "Abstain"]
    min_quorum_percent: float = 10.0


class DaoProposalCreate(DaoProposalBase):
    """Schema for creating a DAO proposal."""
    created_by_user_id: int
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class DaoProposalRead(BaseModel):
    """Schema for reading DAO proposal data."""
    id: int
    property_id: int
    title: str
    description: str
    proposal_type: str
    options_json: list[str]
    min_quorum_percent: float
    status: str  # "draft", "active", "closed"
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DaoVoteCreate(BaseModel):
    """Schema for casting a vote."""
    user_id: int
    selected_option_index: int


class DaoVoteRead(BaseModel):
    """Schema for reading vote data."""
    id: int
    proposal_id: int
    user_id: int
    selected_option_index: int
    weight_tokens: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DaoProposalResult(BaseModel):
    """Schema for proposal voting results."""
    proposal_id: int
    total_tokens: int
    votes_cast: int
    quorum_reached: bool
    results: list[dict[str, Any]]  # [{"option": "Yes", "votes": 1000, "percentage": 50.0}, ...]
    winning_option: Optional[str] = None
    status: str

