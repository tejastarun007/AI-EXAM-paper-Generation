import os
from fastapi import APIRouter, HTTPException, Depends, Request
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from audit import log_event
from break_glass import verify_token
from key_store import retrieve_key_encrypted, decrypt_master_key

router = APIRouter(prefix='/admin')

ADMIN_IPS_ENV = os.environ.get('ADMIN_IPS', '127.0.0.1')

def require_admin_ip(request: Request):
    allowed_ips = [ip.strip() for ip in ADMIN_IPS_ENV.split(',')]
    if request.client.host not in allowed_ips:
        raise HTTPException(403, 'Forbidden')

@router.post('/break-glass')
async def break_glass_unlock(
    paper_id: str, exam_datetime: str, token: str,
    reason: str, request: Request,
    _=Depends(require_admin_ip)
):
    if not verify_token(paper_id, exam_datetime, token):
        await log_event('break_glass_rejected', {
            'paper_id': paper_id, 'ip': request.client.host
        })
        raise HTTPException(401, 'Invalid break-glass token')

    encrypted_key_hex = await retrieve_key_encrypted(paper_id)
    key_hex = decrypt_master_key(encrypted_key_hex)
    await log_event('break_glass_used', {
        'paper_id': paper_id,
        'ip':       request.client.host,
        'reason':   reason,
        'actor':    'admin',
    })
    return {'key_hex': key_hex}
