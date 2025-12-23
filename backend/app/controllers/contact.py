from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.utils.email import send_contact_email

router = APIRouter(prefix="/contact", tags=["contact"])

class ContactForm(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Email address")
    subject: str = Field(..., min_length=3, max_length=200, description="Subject")
    message: str = Field(..., min_length=10, max_length=5000, description="Message content")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number (optional)")

class ContactResponse(BaseModel):
    success: bool
    message: str

@router.post("/", response_model=ContactResponse)
async def submit_contact_form(contact_data: ContactForm):
    """
    Submit a contact form. 
    This endpoint receives the form data and can be integrated with n8n or email service
    to send emails to contact@synvoy.com
    """
    try:
        # For now, we'll just validate and return success
        # In production, this would:
        # 1. Send email via SMTP/SendGrid/etc to contact@synvoy.com
        # 2. Or trigger an n8n workflow to send the email
        # 3. Or store in database for processing
        
        # Validate the data (Pydantic already does this, but we can add custom validation)
        if not contact_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty"
            )
        
        if not contact_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Send email to contact@synvoy.com
        email_sent = send_contact_email(
            name=contact_data.name,
            email=contact_data.email,
            subject=contact_data.subject,
            message=contact_data.message,
            phone=contact_data.phone
        )
        
        if not email_sent:
            # Log the error but still return success to user
            # In production, you might want to store failed submissions in database
            print(f"Warning: Failed to send contact email from {contact_data.email}")
            # You can choose to raise an error or just log it
            # For now, we'll return success but log the issue
        
        return ContactResponse(
            success=True,
            message="Thank you for contacting us! We'll get back to you soon."
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit contact form: {str(e)}"
        )

