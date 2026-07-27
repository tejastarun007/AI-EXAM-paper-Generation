import os, asyncpg
from cryptography.fernet import Fernet

DATABASE_URL = os.environ['DATABASE_URL']
# MASTER_KEY is a Fernet key (32 url-safe base64 bytes).
_fernet = Fernet(os.environ['MASTER_KEY'].encode())

SCHEMA = '''
CREATE TABLE IF NOT EXISTS paper_keys (
    paper_id         TEXT PRIMARY KEY,
    encrypted_key    BYTEA       NOT NULL,   -- Fernet(key_hex)
    exam_datetime    TEXT        NOT NULL,
    commitment       TEXT        NOT NULL,
    utxo_tx_hash     TEXT,                   -- set after lock tx confirmed
    utxo_tx_index    INT,
    released         BOOLEAN     DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    demo_unlock_override BOOLEAN DEFAULT FALSE
);
'''

async def store_key(
    paper_id: str,
    key_hex: str,
    exam_datetime: str,
    commitment: str,
) -> None:
    '''Encrypts key_hex with the master key before writing to DB.'''
    encrypted = _fernet.encrypt(key_hex.encode())   # returns bytes
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute(SCHEMA)
    await conn.execute(
        '''INSERT INTO paper_keys
           (paper_id, encrypted_key, exam_datetime, commitment)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (paper_id) 
           DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key,
                         exam_datetime = EXCLUDED.exam_datetime,
                         commitment = EXCLUDED.commitment,
                         released = FALSE''',
        paper_id, encrypted, exam_datetime, commitment
    )
    await conn.close()

async def set_utxo(paper_id: str, tx_hash: str, tx_index: int) -> None:
    '''Called after the lock transaction is confirmed on-chain.'''
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute(
        'UPDATE paper_keys SET utxo_tx_hash=$1, utxo_tx_index=$2 WHERE paper_id=$3',
        tx_hash, tx_index, paper_id
    )
    await conn.close()

async def retrieve_key_encrypted(paper_id: str) -> bytes:
    '''Returns the Fernet-encrypted bytes — do not use directly.'''
    conn = await asyncpg.connect(DATABASE_URL)
    row  = await conn.fetchrow(
        'SELECT encrypted_key FROM paper_keys WHERE paper_id=$1', paper_id
    )
    await conn.close()
    if not row:
        raise ValueError(f'No key found for paper {paper_id}')
    return bytes(row['encrypted_key'])

def decrypt_master_key(encrypted_key_bytes: bytes) -> str:
    '''Decrypts in-memory using the master key. Returns key_hex string.'''
    return _fernet.decrypt(encrypted_key_bytes).decode()

async def get_commitment(paper_id: str) -> str:
    conn = await asyncpg.connect(DATABASE_URL)
    row  = await conn.fetchrow(
        'SELECT commitment FROM paper_keys WHERE paper_id=$1', paper_id
    )
    await conn.close()
    return row['commitment']
