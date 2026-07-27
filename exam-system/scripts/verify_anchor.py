import asyncio, os, httpx, asyncpg

DATABASE_URL = os.environ['DATABASE_URL']

async def verify(cardano_tx_id: str):
    # 1. Fetch the metadata from Blockfrost
    url = f'https://cardano-preprod.blockfrost.io/api/v0/txs/{cardano_tx_id}/metadata'
    headers = {'project_id': os.environ['BLOCKFROST_PROJECT_ID']}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers)
    meta = r.json()
    anchored = next(
        (m['json_metadata'] for m in meta if m['label'] == '674'), None
    )
    if not anchored: raise ValueError('No anchor metadata found in TX')

    tail_id   = int(anchored['tail_id'])
    on_chain  = anchored['tail_hash']
    print(f'On-chain anchor: entry #{tail_id}, hash={on_chain[:16]}...')

    # 2. Recompute from current DB
    conn = await asyncpg.connect(DATABASE_URL)
    row  = await conn.fetchrow(
        'SELECT entry_hash FROM audit_log WHERE id=$1', tail_id
    )
    await conn.close()
    db_hash = row['entry_hash'] if row else 'MISSING'

    if on_chain == db_hash:
        print('VERIFIED: audit log matches on-chain anchor.')
    else:
        print('TAMPERED: on-chain anchor does not match current DB!')
        print(f'  On-chain: {on_chain}')
        print(f'  Database: {db_hash}')
        exit(1)

if __name__ == "__main__":
    import sys
    asyncio.run(verify(sys.argv[1]))
