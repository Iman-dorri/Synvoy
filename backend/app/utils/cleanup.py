"""
Background task to clean up unverified user accounts after 2 hours
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.verification_token import VerificationToken
from datetime import datetime, timedelta, timezone

def cleanup_unverified_accounts():
    """Delete unverified user accounts that are older than 2 hours."""
    db: Session = SessionLocal()
    try:
        # Calculate cutoff time (2 hours ago)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=2)
        
        # Find unverified users created more than 2 hours ago
        unverified_users = db.query(User).filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        deleted_count = 0
        for user in unverified_users:
            # Delete associated verification tokens first (cascade should handle this, but explicit is better)
            db.query(VerificationToken).filter(
                VerificationToken.user_id == user.id
            ).delete()
            
            # Delete the user
            db.delete(user)
            deleted_count += 1
            print(f"Deleted unverified account: {user.email} (created at {user.created_at})")
        
        if deleted_count > 0:
            db.commit()
            print(f"Cleanup completed: Deleted {deleted_count} unverified account(s)")
        else:
            db.commit()
            print("Cleanup completed: No unverified accounts to delete")
            
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

