import asyncio, os, asyncpg

DATABASE_URL = os.environ['DATABASE_URL']

async def advance(paper_id: str):
    conn = await asyncpg.connect(DATABASE_URL)
    # Set unlock_slot to current slot minus 1 (effectively 'now')
    await conn.execute(
        '''UPDATE paper_keys SET demo_unlock_override = TRUE
           WHERE paper_id = $1''',
        paper_id
    )
    await conn.close()
    print(f'Paper {paper_id} demo-unlocked. UI will show WINDOW_OPEN.')

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        asyncio.run(advance(sys.argv[1]))
    else:
        print("Usage: python simulate_slot_advance.py <paper_id>")
