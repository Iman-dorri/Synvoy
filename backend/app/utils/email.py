"""
Email utility for sending emails via Microsoft Graph API using MSAL
"""
import os
import requests
from msal import ConfidentialClientApplication
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from multiple possible locations
# Try root .env first (for local development), then backend/.env
base_path = Path(__file__).parent.parent.parent.parent  # Go up to project root
env_paths = [
    base_path / ".env",  # root .env (preferred for local dev)
    Path(__file__).parent.parent.parent / ".env",  # backend/.env
    Path.cwd() / ".env",  # current directory
]

loaded = False
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        loaded = True
        print(f"Loaded .env from: {env_path}")
        break

if not loaded:
    # Fallback to default load_dotenv behavior
    load_dotenv()
    print("Using default load_dotenv() - checking current directory")

# Microsoft Graph API configuration
# Load from environment (works in both local and Docker)
TENANT_ID = os.getenv("MSAL_TENANT_ID", "")
CLIENT_ID = os.getenv("MSAL_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("MSAL_CLIENT_SECRET", "")
# SENDER_USER: The actual mailbox used for authentication (iman.dorri@synvoy.com)
SENDER_USER = os.getenv("MSAL_SENDER_USER", "iman.dorri@synvoy.com")
# FROM_ALIAS: The alias email that appears as "From" (contact@synvoy.com)
FROM_ALIAS = os.getenv("MSAL_FROM_ALIAS", "contact@synvoy.com")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "contact@synvoy.com")

# Debug: Print loaded values (without secrets)
if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
    print(f"DEBUG: MSAL Config Status:")
    print(f"  TENANT_ID: {'SET' if TENANT_ID else 'NOT SET'} ({TENANT_ID[:10]}...)" if TENANT_ID else "  TENANT_ID: NOT SET")
    print(f"  CLIENT_ID: {'SET' if CLIENT_ID else 'NOT SET'} ({CLIENT_ID[:10]}...)" if CLIENT_ID else "  CLIENT_ID: NOT SET")
    print(f"  CLIENT_SECRET: {'SET' if CLIENT_SECRET else 'NOT SET'}")
    print(f"  SENDER_USER: {'SET' if SENDER_USER else 'NOT SET'} ({SENDER_USER})" if SENDER_USER else "  SENDER_USER: NOT SET")
    print(f"  FROM_ALIAS: {'SET' if FROM_ALIAS else 'NOT SET'} ({FROM_ALIAS})" if FROM_ALIAS else "  FROM_ALIAS: NOT SET")
    print(f"  CONTACT_EMAIL: {CONTACT_EMAIL}")

# Microsoft Graph API endpoints
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
# For client credentials flow, use /.default suffix
SCOPES = ["https://graph.microsoft.com/.default"]

def get_access_token() -> Optional[str]:
    """
    Get access token using MSAL for Microsoft Graph API
    
    Returns:
        Access token string or None if authentication fails
    """
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        print("Error: MSAL configuration missing. Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, and MSAL_CLIENT_SECRET")
        return None
    
    try:
        # Create MSAL app instance
        app = ConfidentialClientApplication(
            client_id=CLIENT_ID,
            client_credential=CLIENT_SECRET,
            authority=AUTHORITY
        )
        
        # Acquire token for client credentials flow
        result = app.acquire_token_for_client(scopes=SCOPES)
        
        if "access_token" in result:
            return result["access_token"]
        else:
            error = result.get("error_description", result.get("error", "Unknown error"))
            print(f"Failed to acquire token: {error}")
            return None
            
    except Exception as e:
        print(f"Error acquiring access token: {e}")
        return None

def send_contact_email(
    name: str,
    email: str,
    subject: str,
    message: str,
    phone: Optional[str] = None
) -> bool:
    """
    Send contact form email to contact@synvoy.com using Microsoft Graph API
    
    Args:
        name: Sender's name
        email: Sender's email
        subject: Email subject
        message: Email message
        phone: Optional phone number
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Check if MSAL is configured
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SENDER_USER]):
        print("Warning: MSAL not configured. Email not sent.")
        print("Please set MSAL_TENANT_ID, MSAL_CLIENT_ID, MSAL_CLIENT_SECRET, and MSAL_SENDER_USER in .env file")
        return False
    
    try:
        # Get access token
        access_token = get_access_token()
        if not access_token:
            print("Failed to get access token")
            return False
        
        # Create email body
        body_text = f"""New Contact Form Submission

Name: {name}
Email: {email}
"""
        if phone:
            body_text += f"Phone: {phone}\n"
        
        body_text += f"""
Subject: {subject}

Message:
{message}

---
This email was sent from the Synvoy contact form.
Reply directly to this email to respond to {name} ({email}).
"""
        
        body_html = f"""<html>
<body>
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> {name}</p>
<p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
"""
        if phone:
            body_html += f"<p><strong>Phone:</strong> {phone}</p>"
        
        body_html += f"""
<p><strong>Subject:</strong> {subject}</p>
<hr>
<p><strong>Message:</strong></p>
<p>{message.replace(chr(10), '<br>')}</p>
<hr>
<p><em>This email was sent from the Synvoy contact form.<br>
Reply directly to this email to respond to {name} ({email}).</em></p>
</body>
</html>"""
        
        # Prepare email message for Microsoft Graph API
        # Use SENDER_USER for the API endpoint (actual mailbox)
        # Use FROM_ALIAS in the "from" field (alias email)
        email_message = {
            "message": {
                "subject": f"Contact Form: {subject}",
                "body": {
                    "contentType": "HTML",
                    "content": body_html
                },
                "from": {
                    "emailAddress": {
                        "address": FROM_ALIAS,
                        "name": "Synvoy Contact Form"
                    }
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": CONTACT_EMAIL
                        }
                    }
                ],
                "replyTo": [
                    {
                        "emailAddress": {
                            "address": email,
                            "name": name
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }
        
        # Send email via Microsoft Graph API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Use SENDER_USER (actual mailbox) for the API endpoint
        url = f"{GRAPH_API_ENDPOINT}/users/{SENDER_USER}/sendMail"
        
        response = requests.post(url, json=email_message, headers=headers)
        
        if response.status_code == 202:
            print(f"Contact email sent successfully to {CONTACT_EMAIL}")
            return True
        else:
            print(f"Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
    except requests.exceptions.RequestException as e:
        print(f"Request error sending email: {e}")
        return False
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
