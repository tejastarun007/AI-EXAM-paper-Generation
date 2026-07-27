import hashlib, os
from fastapi import APIRouter
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from key_store import retrieve_key_encrypted, decrypt_master_key

router = APIRouter()

@router.get('/verify/{paper_id}')
async def verify_paper(paper_id: str):
    '''Verifiable proof: recomputed hash must match on-chain commitment.'''
    encrypted_key_hex = await retrieve_key_encrypted(paper_id)
    key_hex = decrypt_master_key(encrypted_key_hex)

    import asyncpg
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    row  = await conn.fetchrow(
        'SELECT exam_datetime, commitment FROM paper_keys WHERE paper_id=$1',
        paper_id
    )
    await conn.close()

    if not row:
        return {"error": "Paper not found."}

    recomputed = hashlib.sha256(
        f'{key_hex}:{paper_id}:{row["exam_datetime"]}'.encode()
    ).hexdigest()

    return {
        'paper_id':        paper_id,
        'on_chain_hash':   row['commitment'],
        'recomputed_hash': recomputed,
        'verified':        recomputed == row['commitment'],
    }
