import hashlib
import hmac
import re
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# argon2-cffi defaults to Argon2id with RFC 9106 low-memory parameters
_hasher = PasswordHasher()

# Hash of a random password, used to spend the same time when the email is unknown
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))

PASSWORD_RULES: list[tuple[str, re.Pattern[str] | None]] = [
    ("more than 8 characters", None),
    ("one uppercase letter", re.compile(r"[A-Z]")),
    ("one lowercase letter", re.compile(r"[a-z]")),
    ("one special character", re.compile(r"[^A-Za-z0-9]")),
]


def password_problems(password: str) -> list[str]:
    """Returns the rules the password breaks; empty when it is acceptable."""
    problems = []
    for label, pattern in PASSWORD_RULES:
        ok = len(password) > 8 if pattern is None else bool(pattern.search(password))
        if not ok:
            problems.append(label)
    return problems


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def new_token() -> str:
    """256-bit URL-safe random token for sessions, CSRF and password resets."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_match(token: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_token(token), expected_hash)
