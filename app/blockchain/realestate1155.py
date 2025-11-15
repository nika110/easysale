"""
RealEstate1155 contract interaction functions.
Factory pattern: Each property gets its own RealEstate1155 contract.
"""
from web3 import Web3
from web3.exceptions import ContractLogicError
import logging
from typing import Optional, Dict, Any, Tuple

from .client import (
    w3,
    get_property_factory_contract,
    get_realestate1155_contract,
    owner_account,
    CHAIN_ID,
    is_blockchain_enabled
)

logger = logging.getLogger(__name__)


class BlockchainError(Exception):
    """Custom exception for blockchain errors."""
    pass


async def create_property_contract_via_factory(
    property_id: int,
    total_tokens: int,
    price_per_token: int = 1,
    base_uri: str = "",
    property_name: str = "",
    property_symbol: str = ""
) -> Tuple[str, str]:
    """
    Deploy a new RealEstate1155 contract for a property via the factory.
    
    Args:
        property_id: Property ID (matches backend DB)
        total_tokens: Total token supply
        price_per_token: Price per token (default 1)
        base_uri: Base URI for metadata
        property_name: Name for the contract
        property_symbol: Symbol for the contract
        
    Returns:
        Tuple of (transaction_hash, contract_address)
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    factory = get_property_factory_contract()
    if not factory:
        raise BlockchainError("Factory contract not available")
    
    try:
        # Default values if not provided
        if not property_name:
            property_name = f"Property {property_id}"
        if not property_symbol:
            property_symbol = f"PROP{property_id}"
        if not base_uri:
            base_uri = f"https://api.example.com/metadata/{property_id}/"
        
        # Build transaction
        tx = factory.functions.createPropertyContract(
            property_id,
            total_tokens,
            price_per_token,
            base_uri,
            property_name,
            property_symbol
        ).build_transaction({
            'from': owner_account.address,
            'nonce': w3.eth.get_transaction_count(owner_account.address),
            'gas': 3000000,  # Higher gas for contract deployment
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = owner_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Property {property_id} contract deployment tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        # Get contract address from factory mapping
        contract_address = factory.functions.getPropertyContract(property_id).call()
        
        logger.info(f"Property {property_id} contract deployed at {contract_address}: {tx_hash.hex()}")
        return tx_hash.hex(), contract_address
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error deploying property {property_id}: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error deploying property {property_id} contract: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


async def mint_for_treasury(
    contract_address: str,
    amount: int
) -> str:
    """
    Mint tokens to treasury after user payment.
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        amount: Number of tokens to mint
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    if not contract_address:
        raise BlockchainError("Contract address not provided")
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        raise BlockchainError("Contract not available")
    
    try:
        # Build transaction (no propertyId parameter!)
        tx = contract.functions.mintForTreasury(
            amount
        ).build_transaction({
            'from': owner_account.address,
            'nonce': w3.eth.get_transaction_count(owner_account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = owner_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Mint {amount} tokens on contract {contract_address} tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"Minted {amount} tokens on contract {contract_address}: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error minting on {contract_address}: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error minting on contract {contract_address}: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


async def mint_to_user(
    contract_address: str,
    to_address: str,
    amount: int
) -> str:
    """
    Mint tokens directly to a user's wallet after off-chain payment.
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        to_address: User's blockchain wallet address
        amount: Number of tokens to mint
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    if not contract_address:
        raise BlockchainError("Contract address not provided")
    
    if not to_address:
        raise BlockchainError("User address not provided")
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        raise BlockchainError("Contract not available")
    
    try:
        # Build transaction for mintTo(to, amount)
        tx = contract.functions.mintTo(
            to_address,
            amount
        ).build_transaction({
            'from': owner_account.address,
            'nonce': w3.eth.get_transaction_count(owner_account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction with platform owner key
        signed_tx = owner_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Mint {amount} tokens to {to_address} on contract {contract_address} tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"✅ Minted {amount} tokens to {to_address} on contract {contract_address}: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error minting to user on {contract_address}: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error minting to user on contract {contract_address}: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


async def burn_from_treasury(
    contract_address: str,
    amount: int
) -> str:
    """
    Burn tokens from treasury (for refunds).
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        amount: Number of tokens to burn
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    if not contract_address:
        raise BlockchainError("Contract address not provided")
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        raise BlockchainError("Contract not available")
    
    try:
        # Build transaction (no propertyId parameter!)
        tx = contract.functions.burnFromTreasury(
            amount
        ).build_transaction({
            'from': owner_account.address,
            'nonce': w3.eth.get_transaction_count(owner_account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = owner_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Burn {amount} tokens on contract {contract_address} tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"Burned {amount} tokens on contract {contract_address}: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error burning on {contract_address}: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error burning on contract {contract_address}: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


def get_property_on_chain(contract_address: str) -> Optional[Dict[str, Any]]:
    """
    Get property information from blockchain (view function).
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        
    Returns:
        Dictionary with property info or None if error
    """
    if not is_blockchain_enabled():
        logger.warning("Blockchain not configured")
        return None
    
    if not contract_address:
        logger.warning("Contract address not provided")
        return None
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        return None
    
    try:
        # Get property info (no propertyId parameter!)
        info = contract.functions.getPropertyInfo().call()
        
        return {
            "total_tokens": int(info[0]),
            "tokens_minted": int(info[1]),
            "price_per_token": int(info[2]),
            "is_active": bool(info[3]),
            "is_funded": bool(info[4])
        }
        
    except Exception as e:
        logger.error(f"Error getting property info from contract {contract_address}: {e}")
        return None


def get_tokens_minted(contract_address: str) -> Optional[int]:
    """
    Get tokens minted for a property (view function).
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        
    Returns:
        Number of tokens minted or None if error
    """
    if not is_blockchain_enabled():
        return None
    
    if not contract_address:
        return None
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        return None
    
    try:
        minted = contract.functions.tokensMinted().call()
        return int(minted)
    except Exception as e:
        logger.error(f"Error getting tokens minted from contract {contract_address}: {e}")
        return None


def get_tokens_available(contract_address: str) -> Optional[int]:
    """
    Get tokens available for a property (view function).
    Uses the property's specific contract address.
    
    Args:
        contract_address: Address of the property's RealEstate1155 contract
        
    Returns:
        Number of tokens available or None if error
    """
    if not is_blockchain_enabled():
        return None
    
    if not contract_address:
        return None
    
    contract = get_realestate1155_contract(contract_address)
    if not contract:
        return None
    
    try:
        available = contract.functions.tokensAvailable().call()
        return int(available)
    except Exception as e:
        logger.error(f"Error getting tokens available from contract {contract_address}: {e}")
        return None

