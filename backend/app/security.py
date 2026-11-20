"""Password hashing and JWT helpers (no external hashing library needed)."""
import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path

import jwt  # PyJWT

BACKEND_DIR = Path(__file__).resolve().parent.parent
ALGORITHM = "HS256"
TOKEN_HOURS = 8
ITERATIONS = 310_000


def _load_secret() -> str:
    """JWT signing key: RESQFLOW_SECRET_KEY if set, otherwise a random key generated once
    and kept in backend/.jwt_secret so that logins survive a server restart."""
    env = os.getenv("RESQFLOW_SECRET_KEY")
    if env:
        return env
    f = BACKEND_DIR / ".jwt_secret"
    if f.exists():
        return f.read_text().strip()
    key = secrets.token_urlsafe(48)
    f.write_text(key)
    try:
        f.chmod(0o600)
    except OSError:
        pass
    return key


SECRET_KEY = _load_secret()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt, digest = stored.split("$")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(candidate.hex(), digest)
    except (ValueError, TypeError):
        return False


def create_token(user_id: str) -> tuple[str, int]:
    """Returns (jwt, expiry in epoch milliseconds)."""
    exp = int(time.time()) + TOKEN_HOURS * 3600
    token = jwt.encode({"sub": user_id, "exp": exp, "iat": int(time.time())}, SECRET_KEY, algorithm=ALGORITHM)
    return token, exp * 1000


def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError (incl. ExpiredSignatureError) when invalid."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
