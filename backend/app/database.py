from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load .env file for local development (but Docker env vars will override)
load_dotenv()

# Database URL from environment variables
# Priority: Docker environment variables > .env file
# If DATABASE_URL is provided, use it. Otherwise, construct from individual components
# In Docker, POSTGRES_HOST will be "db", so we know we're in Docker
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construct DATABASE_URL from individual components with proper URL encoding
    # Always use individual POSTGRES_* vars (Docker sets these, they override .env)
    db_user = os.getenv("POSTGRES_USER", "synvoy_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "synvoy_secure_password_2024")
    # In Docker, POSTGRES_HOST is "db", in local dev it might be "localhost"
    db_host = os.getenv("POSTGRES_HOST", "localhost" if os.getenv("POSTGRES_HOST") is None else "db")
    # Default port: 5433 for localhost (Docker mapped port), 5432 for Docker service "db"
    db_port = os.getenv("POSTGRES_PORT", "5433" if db_host == "localhost" else "5432")
    db_name = os.getenv("POSTGRES_DB", "synvoy")
    
    # URL-encode the password to handle special characters like @, :, /, etc.
    encoded_password = quote_plus(db_password)
    DATABASE_URL = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    echo=True  # Set to False in production
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 