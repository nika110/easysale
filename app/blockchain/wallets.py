"""
Blockchain wallet generation and management utilities.
"""
import os
import logging
from eth_account import Account
from web3 import Web3

logger = logging.getLogger(__name__)


def generate_new_wallet() -> dict:
    """
    Generate a new Ethereum wallet (EOA).
    
    Returns:
        dict: Contains 'address' and 'private_key'
    """
    # Generate random private key
    acct = Account.create(os.urandom(32))
    
    return {
        "address": acct.address,
        "private_key": acct.key.hex()
    }


async def fund_wallet_with_gas(wallet_address: str, amount_eth: float = 0.1) -> str:
    """
    Send ETH from platform owner to a user wallet for gas fees.
    
    Args:
        wallet_address: User's wallet address to fund
        amount_eth: Amount of ETH to send (default 0.1 ETH)
        
    Returns:
        Transaction hash as hex string
        
    Raises:
        Exception: If transaction fails
    """
    from .client import w3, owner_account, CHAIN_ID, is_blockchain_enabled
    
    if not is_blockchain_enabled():
        raise Exception("Blockchain not configured")
    
    if not owner_account:
        raise Exception("Owner account not available")
    
    try:
        # Convert ETH to Wei
        amount_wei = w3.to_wei(amount_eth, 'ether')
        
        # Build transaction
        tx = {
            'from': owner_account.address,
            'to': Web3.to_checksum_address(wallet_address),
            'value': amount_wei,
            'nonce': w3.eth.get_transaction_count(owner_account.address),
            'gas': 21000,  # Standard ETH transfer gas
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        }
        
        # Sign transaction
        signed_tx = owner_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        logger.info(f"💰 Sent {amount_eth} ETH to {wallet_address} for gas fees: {tx_hash.hex()}")
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            raise Exception(f"Transaction failed: {tx_hash.hex()}")
        
        logger.info(f"✅ Gas funding successful: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except Exception as e:
        logger.error(f"Error funding wallet {wallet_address}: {e}")
        raise


def get_account_from_private_key(private_key: str) -> Account:
    """
    Get an Account object from a private key.
    
    Args:
        private_key: Hex-encoded private key (with or without 0x prefix)
        
    Returns:
        Account: eth_account Account object
    """
    if not private_key.startswith('0x'):
        private_key = '0x' + private_key
    
    return Account.from_key(private_key)

