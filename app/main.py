"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine

from app.db import Base, engine as async_engine
from app.config import settings
from app.routers import users, properties, investments, portfolio, blockchain, dao


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup: Create database tables
    # We need to use a sync engine for create_all
    sync_database_url = settings.DATABASE_URL.replace("+aiosqlite", "")
    sync_engine = create_engine(sync_database_url, echo=False)
    Base.metadata.create_all(bind=sync_engine)
    sync_engine.dispose()
    
    yield
    
    # Shutdown: Clean up resources
    await async_engine.dispose()


# Create FastAPI app
app = FastAPI(
    title="Real Estate Tokenization Backend",
    description="A simple backend for tokenized real estate demo",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware (allow all for demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(properties.router, prefix="/api/properties", tags=["properties"])
app.include_router(investments.router, prefix="/api/investments", tags=["investments"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(blockchain.router, prefix="/api/blockchain", tags=["blockchain"])
app.include_router(dao.router, prefix="/api/dao", tags=["dao"])


@app.get("/")
async def root():
    """
    Root endpoint.
    """
    return {
        "status": "ok",
        "message": "real-estate demo backend"
    }

