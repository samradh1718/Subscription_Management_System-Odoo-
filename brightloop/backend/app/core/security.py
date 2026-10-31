from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import secrets

ph = PasswordHasher()

def get_password_hash(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False

def generate_session_token() -> str:
    """Generates a secure random opaque token for server-side sessions."""
    return secrets.token_urlsafe(32)