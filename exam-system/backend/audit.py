import hashlib, json, time, os
import asyncpg

DATABASE_URL = os.environ['DATABASE_URL']

SCHEMA = '''
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    event_type  TEXT        NOT NULL,
    payload     JSONB       NOT NULL,
    ts          DOUBLE PRECISION NOT NULL,
    entry_hash  TEXT        NOT NULL,
    prev_hash   TEXT        NOT NULL
);

-- Index to speed up chain-walk and daily anchor queries
CREATE INDEX IF NOT EXISTS audit_log_id_desc ON audit_log (id DESC);
'''

GENESIS_HASH = '0' * 64

def _compute_hash(prev_hash: str, event_type: str,
                   payload_json: str, ts: float) -> str:
    data = json.dumps({
        'prev':    prev_hash,
        'event':   event_type,
        'payload': payload_json,
        'ts':      ts,
    }, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()

async def _ensure_schema(conn):
    await conn.execute(SCHEMA)

async def log_event(event_type: str, payload: dict):
    '''
    Atomically appends a new chained entry to the audit log.

    Uses SELECT ... FOR UPDATE to serialise concurrent writers.
    Safe with any number of uvicorn/gunicorn workers.
    '''
    ts           = time.time()
    payload_json = json.dumps(payload, sort_keys=True)

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        async with conn.transaction():
            # Prevent deadlocks among concurrent workers by forcing serialization 
            # via a transaction-level advisory lock BEFORE touching any tables
            await conn.execute('SELECT pg_advisory_xact_lock(123456789)')
            
            await _ensure_schema(conn)

            # Lock the latest row so no concurrent writer can interleave
            row = await conn.fetchrow(
                '''SELECT entry_hash FROM audit_log
                   ORDER BY id DESC LIMIT 1
                   FOR UPDATE'''
            )
            prev_hash  = row['entry_hash'] if row else GENESIS_HASH
            entry_hash = _compute_hash(
                prev_hash, event_type, payload_json, ts
            )

            await conn.execute(
                '''INSERT INTO audit_log
                   (event_type, payload, ts, entry_hash, prev_hash)
                   VALUES ($1, $2::jsonb, $3, $4, $5)''',
                event_type, payload_json, ts,
                entry_hash, prev_hash
            )
    finally:
        await conn.close()


async def verify_chain() -> dict:
    '''
    Walk the entire audit log and confirm every hash link is intact.
    Returns {valid: bool, entries: int, first_broken_id: int | None}.
    '''
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch(
        'SELECT id, event_type, payload, ts, entry_hash, prev_hash \
         FROM audit_log ORDER BY id ASC'
    )
    await conn.close()

    prev = GENESIS_HASH
    for row in rows:
        expected = _compute_hash(
            row['prev_hash'],
            row['event_type'],
            row['payload'],
            row['ts'],
        )
        if row['entry_hash'] != expected or row['prev_hash'] != prev:
            return {
                'valid': False,
                'entries': len(rows),
                'first_broken_id': row['id'],
            }
        prev = row['entry_hash']

    return {'valid': True, 'entries': len(rows), 'first_broken_id': None}

async def get_latest_entry_hash() -> str:
    '''
    Fetch the most recent entry_hash from the audit log, to be anchored
    to the blockchain.
    '''
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        row = await conn.fetchrow(
            '''SELECT entry_hash FROM audit_log
               ORDER BY id DESC LIMIT 1'''
        )
        return row['entry_hash'] if row else GENESIS_HASH
    finally:
        await conn.close()
