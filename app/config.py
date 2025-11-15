"""
Configuration settings for the real estate tokenization backend.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    INITIAL_USER_BALANCE_USD: float = 10000.0
    
    # Blockchain settings (optional)
    BLOCKCHAIN_RPC_URL: str = ""
    PROPERTY_FACTORY_ADDRESS: str = ""
    OWNER_PRIVATE_KEY: str = ""
    CHAIN_ID: str = "1337"
    
    class Config:
        env_file = ".env"


settings = Settings()

