/**
 * API Client for EasySale Backend
 * Connects to FastAPI backend at http://localhost:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Types
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  mock_balance_usd: number;
  blockchain_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  name: string;
  description: string;
  location: string;
  price_usd: number;
  total_tokens: number;
  tokens_sold: number;
  expected_annual_yield_percent: number;
  status: string;
  image_url: string | null;
  token_contract_address: string | null;
  chain_name: string;
  project_id?: string | null;
  project_name?: string | null;
  apartment_name?: string | null;
  floor?: number | null;
  total_sqm?: number | null;
  bedroom_sqm?: number | null;
  bathroom_sqm?: number | null;
  balcony_sqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: number;
  user_id: number;
  property_id: number;
  tokens: number;
  invested_usd: number;
  created_at: string;
}

export interface UserPropertyBalance {
  id: number;
  user_id: number;
  property_id: number;
  tokens: number;
  property?: Property;
}

export interface PortfolioSummary {
  user_id: number;
  balances: UserPropertyBalance[];
  total_tokens: number;
  total_invested_usd: number;
  portfolio_value_usd: number;
  total_yield_percent: number;
  total_estimated_annual_income_usd: number;
  remaining_mock_balance_usd: number;
}

export interface DaoProposal {
  id: number;
  property_id: number;
  title: string;
  description: string;
  proposal_type: string;
  options_json: string[];
  min_quorum_percent: number;
  status: string;
  start_at: string | null;
  end_at: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface DaoProposalResult {
  proposal: DaoProposal;
  votes_by_option: Record<string, number>;
  total_votes: number;
  total_tokens_in_property: number;
  quorum_reached: boolean;
  winning_option: string | null;
}

// Error handling
class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new APIError(response.status, error.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== User API ====================

export const userAPI = {
  create: (email: string, full_name?: string) =>
    fetchAPI<User>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, full_name }),
    }),

  list: () => fetchAPI<User[]>('/users'),

  get: (userId: number) => fetchAPI<User>(`/users/${userId}`),

  getWallet: (userId: number) =>
    fetchAPI<{ user_id: number; blockchain_address: string | null }>(`/users/${userId}/wallet`),

  getWalletKeys: (userId: number) =>
    fetchAPI<{ 
      user_id: number; 
      blockchain_address: string | null; 
      blockchain_private_key: string | null 
    }>(`/users/${userId}/wallet/keys`),

  getBalance: (userId: number) =>
    fetchAPI<{ user_id: number; mock_balance_usd: number }>(`/users/${userId}/balance`),
};

// ==================== Property API ====================

export interface PaginatedPropertiesResponse {
  items: Property[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const propertyAPI = {
  list: (params?: {
    page?: number;
    page_size?: number;
    min_price_usd?: number;
    max_price_usd?: number;
    location?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.min_price_usd) searchParams.set('min_price_usd', params.min_price_usd.toString());
    if (params?.max_price_usd) searchParams.set('max_price_usd', params.max_price_usd.toString());
    if (params?.location) searchParams.set('location', params.location);

    const query = searchParams.toString();
    return fetchAPI<PaginatedPropertiesResponse>(`/properties${query ? `?${query}` : ''}`);
  },

  get: (propertyId: number) => fetchAPI<Property>(`/properties/${propertyId}`),

  create: (data: {
    name: string;
    description: string;
    location: string;
    price_usd: number;
    expected_annual_yield_percent: number;
    image_url?: string;
    project_id?: string;
    project_name?: string;
    apartment_name?: string;
    floor?: number;
    total_sqm?: number;
    bedroom_sqm?: number;
    bathroom_sqm?: number;
    balcony_sqm?: number;
    bedrooms?: number;
    bathrooms?: number;
  }) =>
    fetchAPI<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (propertyId: number, data: Partial<Property>) =>
    fetchAPI<Property>(`/properties/${propertyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ==================== Investment API ====================

export interface InvestmentResponse {
  investment: Investment;
  user_balance_after: number;
  property_tokens_sold_after: number;
}

export const investmentAPI = {
  buy: (userId: number, propertyId: number, tokens: number) =>
    fetchAPI<InvestmentResponse>('/investments/buy', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        property_id: propertyId,
        tokens,
      }),
    }),

  list: (userId?: number) => {
    const query = userId ? `?user_id=${userId}` : '';
    return fetchAPI<Investment[]>(`/investments${query}`);
  },
};

// ==================== Portfolio API ====================

export const portfolioAPI = {
  getSummary: (userId: number) =>
    fetchAPI<PortfolioSummary>(`/portfolio/${userId}`),
};

// ==================== DAO API ====================

export interface DaoProposal {
  id: number;
  property_id: number;
  title: string;
  description: string;
  proposal_type: string;
  options_json: string[];
  min_quorum_percent: number;
  status: string;
  start_at: string | null;
  end_at: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface DaoVote {
  id: number;
  proposal_id: number;
  user_id: number;
  option_selected: string;
  vote_weight: number;
  created_at: string;
}

export interface DaoProposalResult {
  proposal_id: number;
  total_tokens: number;
  votes_cast: number;
  quorum_reached: boolean;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
  }>;
  winning_option: string | null;
  status: string;
}

export const daoAPI = {
  // Create a new proposal
  createProposal: (data: {
    property_id: number;
    title: string;
    description: string;
    proposal_type: string;
    options: string[];
    min_quorum_percent?: number;
    created_by_user_id: number;
    start_at?: string;
    end_at?: string;
  }) =>
    fetchAPI<DaoProposal>('/dao/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get all proposals (optionally filtered by user or status)
  getAllProposals: (userId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId.toString());
    if (status) params.set('status', status);
    const query = params.toString();
    return fetchAPI<DaoProposal[]>(`/dao/proposals${query ? `?${query}` : ''}`);
  },

  // Get all proposals for a property
  getPropertyProposals: (propertyId: number, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();
    return fetchAPI<DaoProposal[]>(`/dao/properties/${propertyId}/proposals${query ? `?${query}` : ''}`);
  },

  // Get a specific proposal
  getProposal: (proposalId: number) =>
    fetchAPI<DaoProposal>(`/dao/proposals/${proposalId}`),

  // Cast a vote
  castVote: (proposalId: number, userId: number, selectedOptionIndex: number) =>
    fetchAPI<DaoVote>(`/dao/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        selected_option_index: selectedOptionIndex,
      }),
    }),

  // Get proposal results
  getProposalResults: (proposalId: number) =>
    fetchAPI<DaoProposalResult>(`/dao/proposals/${proposalId}/results`),

  // Close a proposal
  closeProposal: (proposalId: number) =>
    fetchAPI<DaoProposal>(`/dao/proposals/${proposalId}/close`, {
      method: 'POST',
    }),

  // Approve a proposal (admin action)
  approveProposal: (proposalId: number) =>
    fetchAPI<DaoProposal>(`/dao/proposals/${proposalId}/approve`, {
      method: 'POST',
    }),

  // Get rent proposals
  getRentProposals: (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();
    return fetchAPI<DaoProposal[]>(`/dao/rent-proposals${query ? `?${query}` : ''}`);
  },

  // Get property rent status
  getPropertyRentStatus: (propertyId: number) =>
    fetchAPI<{
      is_rented: boolean;
      monthly_rent: string | null;
      approved_at: string | null;
      proposal_id?: number;
      proposal_title?: string;
    }>(`/dao/properties/${propertyId}/rent-status`),

  // Get user's rent payout for a property
  getUserRentPayout: (propertyId: number, userId: number) =>
    fetchAPI<{
      has_tokens: boolean;
      is_rented: boolean;
      monthly_rent?: number;
      tokens_owned?: number;
      total_tokens?: number;
      ownership_percentage: number;
      monthly_payout: number;
    }>(`/dao/properties/${propertyId}/users/${userId}/rent-payout`),

  // Claim rent for a property
  claimRent: (propertyId: number, userId: number) =>
    fetchAPI<{
      success: boolean;
      amount_claimed: number;
      new_balance: number;
      property_id: number;
    }>(`/dao/properties/${propertyId}/users/${userId}/claim-rent`, {
      method: 'POST',
    }),
};

// ==================== Blockchain API ====================

export const blockchainAPI = {
  getBalance: (contractAddress: string, userAddress: string) =>
    fetchAPI<{ balance: number }>(`/blockchain/balance/${contractAddress}/${userAddress}`),

  deployProperty: (propertyId: number) =>
    fetchAPI<{ tx_hash: string; contract_address: string }>('/blockchain/deploy-property', {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    }),

  mintTokens: (contractAddress: string, toAddress: string, amount: number) =>
    fetchAPI<{ tx_hash: string }>('/blockchain/mint', {
      method: 'POST',
      body: JSON.stringify({
        contract_address: contractAddress,
        to_address: toAddress,
        amount,
      }),
    }),
};

// ==================== Marketplace API ====================

export interface MarketplaceListing {
  id: number;
  seller_id: number;
  property_id: number;
  property_name: string;
  property_location: string;
  property_image_url: string | null;
  expected_annual_yield_percent: number;
  tokens_listed: number;
  tokens_remaining: number;
  price_per_token_usd: number;
  original_price_per_token_usd: number;
  discount_percent: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplacePurchase {
  listing_id: number;
  tokens: number;
}

export const marketplaceAPI = {
  // List all active marketplace listings
  listListings: (propertyId?: number, sellerId?: number, status: string = 'active') => {
    const params = new URLSearchParams();
    if (propertyId) params.set('property_id', propertyId.toString());
    if (sellerId) params.set('seller_id', sellerId.toString());
    if (status) params.set('status', status);
    const query = params.toString();
    return fetchAPI<MarketplaceListing[]>(`/marketplace/listings${query ? `?${query}` : ''}`);
  },

  // Create a new listing (sell tokens)
  createListing: (sellerId: number, propertyId: number, tokens: number, pricePerToken: number) =>
    fetchAPI<MarketplaceListing>('/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify({
        seller_id: sellerId,
        property_id: propertyId,
        tokens,
        price_per_token_usd: pricePerToken,
      }),
    }),

  // Purchase from a listing
  purchaseListing: (listingId: number, buyerId: number, tokens: number) =>
    fetchAPI<any>('/marketplace/buy', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: listingId,
        buyer_id: buyerId,
        tokens,
      }),
    }),

  // Cancel a listing
  cancelListing: (listingId: number) =>
    fetchAPI<MarketplaceListing>(`/marketplace/listings/${listingId}/cancel`, {
      method: 'POST',
    }),

  // Get user's listings
  getUserListings: (userId: number, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();
    return fetchAPI<MarketplaceListing[]>(`/marketplace/users/${userId}/listings${query ? `?${query}` : ''}`);
  },
};
