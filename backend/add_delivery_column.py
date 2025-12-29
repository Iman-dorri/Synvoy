"""
Migration script to add is_delivered column to messages table.
Run this script to update your database schema.
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load .env file for local development (but Docker env vars will override)
load_dotenv()

# Database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_user = os.getenv("POSTGRES_USER", "synvoy_user")
    db_password = os.getenv("POSTGRES_PASSWORD", "synvoy_secure_password_2024")
    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = os.getenv("POSTGRES_PORT", "5433")
    db_name = os.getenv("POSTGRES_DB", "synvoy")
    
    encoded_password = quote_plus(db_password)
    DATABASE_URL = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_delivery_column():
    """Add is_delivered column to messages table if it doesn't exist."""
    conn = engine.connect()
    trans = conn.begin()
    try:
        # Add column to messages table if it doesn't exist
        print("Adding 'is_delivered' column to 'messages' table...")
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE NOT NULL"))
        
        # Update existing messages: mark as delivered if they are read (backward compatibility)
        print("Updating existing messages...")
        conn.execute(text("UPDATE messages SET is_delivered = TRUE WHERE is_read = TRUE"))
        
        # Commit the transaction
        trans.commit()
        print("✅ Migration completed successfully!")
        print("   - Added 'is_delivered' column to 'messages' table")
        print("   - Updated existing read messages to be marked as delivered")
        
    except Exception as e:
        trans.rollback()
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    add_delivery_column()

