"""
Marketplace contract interaction functions.
On-chain secondary marketplace for trading property tokens with USDC.
"""
from web3 import Web3
from web3.exceptions import ContractLogicError
import logging
from typing import Optional, Dict, Any
from eth_account import Account

from .client import (
    w3,
    owner_account,
    CHAIN_ID,
    is_blockchain_enabled
)

logger = logging.getLogger(__name__)


class BlockchainError(Exception):
    """Custom exception for blockchain errors."""
    pass


# Marketplace ABI
MARKETPLACE_ABI = [
    {
        "inputs": [
            {"name": "tokenContract", "type": "address"},
            {"name": "tokenId", "type": "uint256"},
            {"name": "amount", "type": "uint256"},
            {"name": "pricePerToken", "type": "uint256"}
        ],
        "name": "createOrder",
        "outputs": [{"name": "orderId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "orderId", "type": "uint256"},
            {"name": "amountToBuy", "type": "uint256"}
        ],
        "name": "buy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "orderId", "type": "uint256"}],
        "name": "cancelOrder",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "orderId", "type": "uint256"}],
        "name": "getOrder",
        "outputs": [{
            "components": [
                {"name": "id", "type": "uint256"},
                {"name": "seller", "type": "address"},
                {"name": "tokenContract", "type": "address"},
                {"name": "tokenId", "type": "uint256"},
                {"name": "amount", "type": "uint256"},
                {"name": "remaining", "type": "uint256"},
                {"name": "pricePerToken", "type": "uint256"},
                {"name": "isActive", "type": "bool"}
            ],
            "name": "",
            "type": "tuple"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "nextOrderId",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]


def get_marketplace_contract(marketplace_address: str):
    """
    Get Marketplace contract instance.
    
    Args:
        marketplace_address: Address of the Marketplace contract
        
    Returns:
        Contract instance or None if invalid
    """
    if not marketplace_address:
        logger.warning("Marketplace address not provided")
        return None
    
    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(marketplace_address),
            abi=MARKETPLACE_ABI
        )
        return contract
    except Exception as e:
        logger.error(f"Failed to create marketplace contract instance: {e}")
        return None


async def create_marketplace_order_onchain(
    marketplace_address: str,
    seller_private_key: str,
    token_contract: str,
    amount: int,
    price_per_token_usdc: int  # USDC has 6 decimals
) -> tuple[str, int]:
    """
    Create a sell order on the marketplace contract.
    Seller must approve marketplace to transfer their tokens first.
    
    Args:
        marketplace_address: Marketplace contract address
        seller_private_key: Seller's private key
        token_contract: RealEstate1155 contract address
        amount: Number of tokens to sell
        price_per_token_usdc: Price per token in USDC (with 6 decimals)
        
    Returns:
        Tuple of (transaction_hash, order_id)
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    marketplace = get_marketplace_contract(marketplace_address)
    if not marketplace:
        raise BlockchainError("Marketplace contract not available")
    
    try:
        # Get seller account
        seller_account = Account.from_key(seller_private_key)
        
        # Build transaction
        TOKEN_ID = 1  # Always 1 for our properties
        tx = marketplace.functions.createOrder(
            token_contract,
            TOKEN_ID,
            amount,
            price_per_token_usdc
        ).build_transaction({
            'from': seller_account.address,
            'nonce': w3.eth.get_transaction_count(seller_account.address),
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = seller_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Create order tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        # Get order ID from logs (OrderCreated event)
        order_id = None
        for log in receipt['logs']:
            try:
                # Try to decode as OrderCreated event
                if len(log['topics']) > 0:
                    # First topic is event signature, second is orderId
                    if len(log['topics']) >= 2:
                        order_id = int(log['topics'][1].hex(), 16)
                        break
            except:
                continue
        
        if order_id is None:
            # Fallback: get next order ID - 1
            order_id = marketplace.functions.nextOrderId().call() - 1
        
        logger.info(f"✅ Order created on-chain: Order ID {order_id}, tx: {tx_hash.hex()}")
        return tx_hash.hex(), order_id
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error creating order: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


async def buy_from_marketplace_onchain(
    marketplace_address: str,
    buyer_private_key: str,
    order_id: int,
    amount: int
) -> str:
    """
    Buy tokens from a marketplace order using USDC.
    Buyer must have approved marketplace to spend their USDC first.
    
    Args:
        marketplace_address: Marketplace contract address
        buyer_private_key: Buyer's private key
        order_id: Order ID to buy from
        amount: Number of tokens to buy
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    marketplace = get_marketplace_contract(marketplace_address)
    if not marketplace:
        raise BlockchainError("Marketplace contract not available")
    
    try:
        # Get buyer account
        buyer_account = Account.from_key(buyer_private_key)
        
        # Build transaction
        tx = marketplace.functions.buy(
            order_id,
            amount
        ).build_transaction({
            'from': buyer_account.address,
            'nonce': w3.eth.get_transaction_count(buyer_account.address),
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = buyer_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Buy from order {order_id} tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"✅ Bought {amount} tokens from order {order_id}: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error buying from order: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error buying from order: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


async def cancel_marketplace_order_onchain(
    marketplace_address: str,
    seller_private_key: str,
    order_id: int
) -> str:
    """
    Cancel a marketplace order and return tokens to seller.
    
    Args:
        marketplace_address: Marketplace contract address
        seller_private_key: Seller's private key
        order_id: Order ID to cancel
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        BlockchainError: If transaction fails
    """
    if not is_blockchain_enabled():
        raise BlockchainError("Blockchain not configured")
    
    marketplace = get_marketplace_contract(marketplace_address)
    if not marketplace:
        raise BlockchainError("Marketplace contract not available")
    
    try:
        # Get seller account
        seller_account = Account.from_key(seller_private_key)
        
        # Build transaction
        tx = marketplace.functions.cancelOrder(
            order_id
        ).build_transaction({
            'from': seller_account.address,
            'nonce': w3.eth.get_transaction_count(seller_account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })
        
        # Sign transaction
        signed_tx = seller_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"Cancel order {order_id} tx sent: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise BlockchainError(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"✅ Cancelled order {order_id}: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except ContractLogicError as e:
        logger.error(f"Contract logic error cancelling order: {e}")
        raise BlockchainError(f"Contract error: {str(e)}")
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise BlockchainError(f"Blockchain error: {str(e)}")


def get_marketplace_order(
    marketplace_address: str,
    order_id: int
) -> Optional[Dict[str, Any]]:
    """
    Get order details from marketplace contract (view function).
    
    Args:
        marketplace_address: Marketplace contract address
        order_id: Order ID
        
    Returns:
        Dictionary with order info or None if error
    """
    if not is_blockchain_enabled():
        return None
    
    marketplace = get_marketplace_contract(marketplace_address)
    if not marketplace:
        return None
    
    try:
        order = marketplace.functions.getOrder(order_id).call()
        
        return {
            "id": int(order[0]),
            "seller": order[1],
            "token_contract": order[2],
            "token_id": int(order[3]),
            "amount": int(order[4]),
            "remaining": int(order[5]),
            "price_per_token": int(order[6]),
            "is_active": bool(order[7])
        }
        
    except Exception as e:
        logger.error(f"Error getting order {order_id}: {e}")
        return None

