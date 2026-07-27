import asyncio, asyncpg, os

async def check():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    row = await conn.fetchrow("SELECT payload FROM audit_log WHERE event_type='blockchain_error' ORDER BY ts DESC LIMIT 1")
    if row:
        print("LATEST BLOCKCHAIN ERROR:", row['payload'])
    else:
        print("No blockchain_error found.")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(check())
