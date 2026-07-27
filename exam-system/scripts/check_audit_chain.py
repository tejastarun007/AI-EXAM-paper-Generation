import asyncio, os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from audit import verify_chain

async def main():
    result = await verify_chain()
    if result['valid']:
        print(f'Chain VALID — {result["entries"]} entries, no tampering detected.')
    else:
        print(f'CHAIN BROKEN at entry ID {result["first_broken_id"]}!')
        print('A row was deleted or modified. Initiate incident response.')
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
