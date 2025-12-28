"""
Initialize database tables.
Run this script to create all database tables.
"""
import sys
from app.database import engine, Base
from app.models import User, UserConnection, Message, Trip, TripParticipant, VerificationToken, DeletionCancellationToken

def init_db():
    """Create all database tables."""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_db()



