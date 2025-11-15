"""
Blockchain client configuration and Web3 instance.
"""
from web3 import Web3
from eth_account import Account
import logging

logger = logging.getLogger(__name__)

# Import settings from config
from app.config import settings

# Configuration from settings
BLOCKCHAIN_RPC_URL = settings.BLOCKCHAIN_RPC_URL or "http://127.0.0.1:8545"
PROPERTY_FACTORY_ADDRESS = settings.PROPERTY_FACTORY_ADDRESS
OWNER_PRIVATE_KEY = settings.OWNER_PRIVATE_KEY  # NEVER LOG THIS
CHAIN_ID = int(settings.CHAIN_ID) if settings.CHAIN_ID else 1337

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_RPC_URL))

# Owner account
owner_account = None
if OWNER_PRIVATE_KEY:
    try:
        owner_account = Account.from_key(OWNER_PRIVATE_KEY)
        logger.info(f"Blockchain client initialized with owner: {owner_account.address}")
    except Exception as e:
        logger.error(f"Failed to load owner account: {e}")
else:
    logger.warning("OWNER_PRIVATE_KEY not set - blockchain transactions will fail")

# PropertyFactory ABI
PROPERTY_FACTORY_ABI = [
    {
        "inputs": [
            {"name": "propertyId", "type": "uint256"},
            {"name": "totalTokens", "type": "uint256"},
            {"name": "pricePerToken", "type": "uint256"},
            {"name": "baseURI", "type": "string"},
            {"name": "propertyName", "type": "string"},
            {"name": "propertySymbol", "type": "string"}
        ],
        "name": "createPropertyContract",
        "outputs": [{"name": "contractAddress", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "uint256"}],
        "name": "getPropertyContract",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "propertyId", "type": "uint256"}],
        "name": "propertyContractExists",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# RealEstate1155 ABI (per-property contract)
REAL_ESTATE_1155_ABI = [
    {
        "inputs": [{"name": "amount", "type": "uint256"}],
        "name": "mintForTreasury",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "mintTo",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "amount", "type": "uint256"}],
        "name": "burnFromTreasury",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getPropertyInfo",
        "outputs": [
            {"name": "_totalTokens", "type": "uint256"},
            {"name": "_tokensMinted", "type": "uint256"},
            {"name": "_pricePerToken", "type": "uint256"},
            {"name": "_isActive", "type": "bool"},
            {"name": "_isFunded", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokensAvailable",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalTokens",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokensMinted",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "isActive",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "isFunded",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "account", "type": "address"},
            {"name": "id", "type": "uint256"}
        ],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]


def get_property_factory_contract():
    """
    Get PropertyFactory contract instance.
    
    Returns:
        Contract instance or None if not configured
    """
    if not PROPERTY_FACTORY_ADDRESS:
        logger.warning("PROPERTY_FACTORY_ADDRESS not set")
        return None
    
    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(PROPERTY_FACTORY_ADDRESS),
            abi=PROPERTY_FACTORY_ABI
        )
        return contract
    except Exception as e:
        logger.error(f"Failed to create factory contract instance: {e}")
        return None


def get_realestate1155_contract(contract_address: str):
    """
    Get RealEstate1155 contract instance for a specific property.
    
    Args:
        contract_address: Address of the property's contract
        
    Returns:
        Contract instance or None if invalid address
    """
    if not contract_address:
        logger.warning("Contract address not provided")
        return None
    
    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=REAL_ESTATE_1155_ABI
        )
        return contract
    except Exception as e:
        logger.error(f"Failed to create contract instance for {contract_address}: {e}")
        return None


def is_blockchain_enabled() -> bool:
    """Check if blockchain integration is properly configured."""
    return bool(PROPERTY_FACTORY_ADDRESS and OWNER_PRIVATE_KEY and w3.is_connected())


def get_blockchain_status() -> dict:
    """Get blockchain connection status."""
    return {
        "connected": w3.is_connected(),
        "chain_id": CHAIN_ID,
        "rpc_url": BLOCKCHAIN_RPC_URL,
        "factory_address": PROPERTY_FACTORY_ADDRESS or "Not set",
        "owner_address": owner_account.address if owner_account else "Not set",
        "model": "factory (one contract per property)",
        "enabled": is_blockchain_enabled()
    }

