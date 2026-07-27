import asyncio, os, json, asyncpg
from pycardano import (
    BlockFrostChainContext, Network, PaymentSigningKey,
    PaymentVerificationKey, Address, TransactionBuilder,
    TransactionOutput, Value, AuxiliaryData, Metadata,
)

DATABASE_URL = os.environ['DATABASE_URL']
NETWORK      = Network.TESTNET
ANCHOR_LABEL = 674  # CIP-0020 message label

async def get_latest_hash() -> tuple[str, int]:
    conn = await asyncpg.connect(DATABASE_URL)
    row  = await conn.fetchrow(
        'SELECT entry_hash, id FROM audit_log ORDER BY id DESC LIMIT 1'
    )
    await conn.close()
    return row['entry_hash'], row['id']

async def anchor():
    tail_hash, tail_id = await get_latest_hash()
    print(f'Anchoring audit log tail: entry #{tail_id} hash={tail_hash[:16]}...')

    ctx     = BlockFrostChainContext(
        project_id=os.environ['BLOCKFROST_PROJECT_ID'], network=NETWORK
    )
    skey    = PaymentSigningKey.load(os.environ['HOD_SKEY_PATH'])
    vkey    = PaymentVerificationKey.from_signing_key(skey)
    address = Address(vkey.hash(), network=NETWORK)

    metadata = AuxiliaryData(Metadata({
        ANCHOR_LABEL: {
            'msg':       'exam-audit-anchor',
            'tail_id':   tail_id,
            'tail_hash': tail_hash,
        }
    }))

    builder = TransactionBuilder(ctx)
    builder.add_input_address(address)
    builder.auxiliary_data = metadata
    # Self-transfer: just need a valid output to attach metadata
    builder.add_output(TransactionOutput(address, Value(1_500_000)))

    signed = builder.build_and_sign([skey], change_address=address)
    ctx.submit_tx(signed)
    tx_id = str(signed.id)
    print(f'Anchored! Cardano TX: {tx_id}')
    print(f'View: https://preprod.cardanoscan.io/transaction/{tx_id}')

    # Store anchor in DB for reference
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS audit_anchors (
            id          SERIAL PRIMARY KEY,
            tail_id     BIGINT NOT NULL,
            tail_hash   TEXT   NOT NULL,
            cardano_tx  TEXT   NOT NULL,
            anchored_at TIMESTAMPTZ DEFAULT NOW()
        )'''
    )
    await conn.execute(
        'INSERT INTO audit_anchors (tail_id, tail_hash, cardano_tx) VALUES ($1,$2,$3)',
        tail_id, tail_hash, tx_id
    )
    await conn.close()

if __name__ == "__main__":
    asyncio.run(anchor())
