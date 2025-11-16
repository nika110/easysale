from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./app.db"
    INITIAL_USER_BALANCE_USD: float = 10000.0
    
    BLOCKCHAIN_RPC_URL: str = ""
    PROPERTY_FACTORY_ADDRESS: str = ""
    OWNER_PRIVATE_KEY: str = ""
    CHAIN_ID: str = "1337"
    
    class Config:
        env_file = ".env"

settings = Settings()