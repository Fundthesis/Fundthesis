"""
Application configuration and environment settings.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # API Keys
    FINNHUB_KEY: str = os.getenv("FINNHUB_KEY", "")
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        FRONTEND_URL
    ]
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    def __init__(self):
        """Validate required configuration on initialization."""
        self._validate_database_url()
    
    def _validate_database_url(self):
        """Validate that DATABASE_URL is set and properly formatted."""
        if not self.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Please set it in your .env file or environment variables. "
                "Format: postgresql://username:password@hostname:5432/database?schema=public&sslmode=require"
            )
        
        if not self.DATABASE_URL.startswith("postgresql://"):
            raise ValueError(
                f"Invalid DATABASE_URL format. Expected postgresql://, got: {self.DATABASE_URL[:20]}..."
            )


settings = Settings()

