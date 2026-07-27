import time, os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import asyncpg
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from key_store import retrieve_key_encrypted, decrypt_master_key
from pdf_builder import decrypt_pdf
from blockchain_enforcer import enforce_unlock, verify_utxo_spent
from audit import log_event

router = APIRouter(prefix='/paper')
bearer = HTTPBearer()

def verify_jwt(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        return jwt.decode(creds.credentials, os.environ['JWT_SECRET'], algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, 'Session expired')
    except jwt.InvalidTokenError:
        raise HTTPException(401, 'Invalid token')

@router.get('/{paper_id}/download')
async def download_paper(paper_id: str, claims=Depends(verify_jwt)):
    if claims.get('paper_id') != paper_id:
        raise HTTPException(403, 'Token/paper mismatch')

    t_start = time.perf_counter()

    # ── STEP 1: Submit Unlock transaction to Cardano (best-effort) ────
    tx_id = 'blockchain_skipped'
    try:
        tx_id = await enforce_unlock(paper_id)
    except ValueError as e:
        await log_event('replay_attempt', {
            'paper_id': paper_id, 'error': str(e),
            'jti': claims.get('jti')
        })
        # Log but continue — don't block download for replay errors
    except Exception as e:
        await log_event('blockchain_error', {
            'paper_id': paper_id, 'error': str(e)
        })
        # Blockchain unavailable — proceed with download anyway

    # ── STEP 2: Retrieve and decrypt the master-encrypted AES key ─────
    encrypted_key_hex = await retrieve_key_encrypted(paper_id)
    key_hex = decrypt_master_key(encrypted_key_hex)

    # ── STEP 3: Decrypt PDF ───────────────────────────────────────────
    blob_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted_vault', f"{paper_id}.aesgcm")
    if not os.path.exists(blob_path):
        raise HTTPException(404, 'Encrypted paper not found on disk.')
        
    with open(blob_path, 'rb') as f:
        blob = f.read()
    pdf_bytes = decrypt_pdf(blob, key_hex, paper_id)

    total_ms = round((time.perf_counter() - t_start) * 1000)
    await log_event('pdf_downloaded', {
        'paper_id': paper_id,
        'tx_id':    tx_id,
        'pipeline_ms': total_ms,
        'jti': claims.get('jti'),
    })

    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename=exam_{paper_id}.pdf',
            'X-Blockchain-Tx': tx_id,
            'X-Pipeline-Ms': str(total_ms),
        }
    )

@router.get('/{paper_id}/status')
async def paper_status(paper_id: str):
    '''Returns current UI state based on slot and demo override.'''
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    row  = await conn.fetchrow(
        '''SELECT exam_datetime, demo_unlock_override
           FROM paper_keys WHERE paper_id=$1''', paper_id
    )
    await conn.close()
    
    if not row:
        raise HTTPException(404, 'Paper not found')

    unlocked = bool(row.get('demo_unlock_override'))
    
    return {
        'paper_id':    paper_id,
        'ui_state':    'WINDOW_OPEN' if unlocked else 'LOCKED',
        'current_slot': 0,
        'unlock_slot': 0,
        'demo_mode':   bool(row.get('demo_unlock_override')),
    }

@router.get('/{paper_id}/emergency-download')
async def emergency_download(paper_id: str):
    '''Emergency backdoor for presentation demo, bypasses JWT and blockchain lock.'''
    try:
        # Retrieve and decrypt the master-encrypted AES key
        encrypted_key_hex = await retrieve_key_encrypted(paper_id)
        key_hex = decrypt_master_key(encrypted_key_hex)

        # Decrypt PDF
        blob_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted_vault', f"{paper_id}.aesgcm")
        if not os.path.exists(blob_path):
            raise HTTPException(404, 'Encrypted paper not found on disk.')
            
        with open(blob_path, 'rb') as f:
            blob = f.read()
        pdf_bytes = decrypt_pdf(blob, key_hex, paper_id)

        await log_event('glass_break_deploy', {
            'paper_id': paper_id,
            'action': 'EMERGENCY_DECRYPTION_BYPASS'
        })

        return Response(
            content=pdf_bytes,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=EMERGENCY_EXTRACT_{paper_id}.pdf',
            }
        )
    except Exception as e:
        raise HTTPException(500, f'Emergency extraction failed: {e}')

@router.get('/{paper_id}/metadata')
async def paper_metadata(paper_id: str, claims=Depends(verify_jwt)):
    '''Returns real paper metadata for the Vault UI — commitment hash, file size, and recent audit events.'''
    import asyncpg, hashlib, time
    from audit import get_latest_entry_hash

    # 1. Commitment hash from paper_keys table
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    row = await conn.fetchrow(
        'SELECT commitment, created_at FROM paper_keys WHERE paper_id=$1', paper_id
    )

    # 2. Last 5 audit events for this paper
    events = await conn.fetch(
        '''SELECT event_type, payload, ts, entry_hash
           FROM audit_log
           WHERE payload::text LIKE $1
           ORDER BY id DESC LIMIT 5''',
        f'%{paper_id}%'
    )
    await conn.close()

    if not row:
        raise HTTPException(404, 'Paper not found')

    # 3. Real file size from disk
    blob_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted_vault', f'{paper_id}.aesgcm')
    file_size_bytes = os.path.getsize(blob_path) if os.path.exists(blob_path) else 0
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

    # 4. Latest audit chain hash
    latest_hash = await get_latest_entry_hash()

    return {
        'paper_id': paper_id,
        'commitment': row['commitment'],
        'latest_chain_hash': latest_hash,
        'file_size_mb': file_size_mb,
        'file_size_bytes': file_size_bytes,
        'created_at': str(row['created_at']) if row['created_at'] else None,
        'audit_events': [
            {
                'event_type': e['event_type'],
                'ts': e['ts'],
                'hash_short': e['entry_hash'][:16] + '...' + e['entry_hash'][-4:],
            }
            for e in events
        ],
    }
