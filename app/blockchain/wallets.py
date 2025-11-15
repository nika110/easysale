"""
Blockchain wallet generation and management utilities.
"""
import os
from eth_account import Account


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

