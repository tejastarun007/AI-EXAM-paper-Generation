import os, pyotp, jwt, time, uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from audit import log_event

router  = APIRouter(prefix='/auth')
bearer  = HTTPBearer()
JWT_SECRET    = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY    = 900   # 15 minutes
WINDOW_SECS   = 90
MAX_FAILURES  = 5
LOCKOUT_SECS  = 1800  # 30 minutes

# In-memory stores (use Redis in production)
pending_sessions: dict = {}   # paper_id -> {hod_ts, hod_user, expires}
failure_counts:  dict = {}
lockouts:        dict = {}

class TOTPRequest(BaseModel):
    paper_id: str
    role:     str   # 'hod' or 'lecturer'
    totp_code: str
    username: str

# Retrieve lazily or at runtime
def get_totp_secrets():
    return {
        'hod':      os.environ['HOD_TOTP_SECRET'],
        'lecturer': os.environ['LECTURER_TOTP_SECRET'],
    }

def is_locked_out(username: str) -> bool:
    if username in lockouts:
        if time.time() < lockouts[username]:
            return True
        del lockouts[username]
        failure_counts.pop(username, None)
    return False

def record_failure(username: str):
    failure_counts[username] = failure_counts.get(username, 0) + 1
    if failure_counts[username] >= MAX_FAILURES:
        lockouts[username] = time.time() + LOCKOUT_SECS
        import asyncio
        asyncio.create_task(log_event('account_locked', {'username': username}))

@router.post('/totp-verify')
async def totp_verify(req: TOTPRequest):
    if is_locked_out(req.username):
        raise HTTPException(429, 'Account locked. Try again in 30 minutes.')

    secrets = get_totp_secrets()
    secret = secrets.get(req.role)
    if not secret:
        raise HTTPException(400, 'Invalid role')

    totp = pyotp.TOTP(secret)
    if not totp.verify(req.totp_code, valid_window=1):
        record_failure(req.username)
        await log_event('auth_failure', {'username': req.username, 'role': req.role, 'paper_id': req.paper_id})
        raise HTTPException(401, 'Invalid TOTP code')

    failure_counts.pop(req.username, None)   # reset on success
    now = time.time()

    if req.role == 'hod':
        # First auth: create pending session
        pending_sessions[req.paper_id] = {
            'hod_ts': now, 'hod_user': req.username,
            'expires': now + WINDOW_SECS
        }
        await log_event('hod_authenticated', {'paper_id': req.paper_id})
        return {'status': 'waiting_for_lecturer', 'window_secs': WINDOW_SECS}

    elif req.role == 'lecturer':
        session = pending_sessions.get(req.paper_id)
        if not session:
            raise HTTPException(400, 'HOD must authenticate first')
        if now > session['expires']:
            del pending_sessions[req.paper_id]
            await log_event('session_expired', {'paper_id': req.paper_id})
            raise HTTPException(408, 'Window expired. Both users must re-authenticate.')

        # Both authenticated within window — issue session JWT
        del pending_sessions[req.paper_id]
        payload = {
            'paper_id': req.paper_id, 'role': 'dual_auth',
            'exp': int(now) + JWT_EXPIRY, 'jti': str(uuid.uuid4())
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        await log_event('session_created', {
            'paper_id': req.paper_id, 'hod': session['hod_user'],
            'lecturer': req.username,
            'window_used_secs': round(now - session['hod_ts'], 1)
        })
        return {'token': token, 'status': 'authenticated'}
