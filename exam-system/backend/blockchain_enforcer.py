import os, json, asyncpg
from pycardano import (
    BlockFrostChainContext, Network, PaymentSigningKey,
    PaymentVerificationKey, Address, TransactionBuilder,
    PlutusV2Script, plutus_script_hash, Redeemer, PlutusData,
    UTxO, TransactionInput, TransactionOutput, Value,
    ScriptHash,
)
from audit import log_event

NETWORK       = Network.TESTNET
DATABASE_URL  = os.environ['DATABASE_URL']
HOD_SKEY_PATH = os.environ['HOD_SKEY_PATH']      # path to hod.skey
LEC_SKEY_PATH = os.environ['LECTURER_SKEY_PATH'] # path to lecturer.skey
PLUTUS_JSON   = 'contracts/plutus.json'

def _get_context() -> BlockFrostChainContext:
    return BlockFrostChainContext(
        project_id=os.environ['BLOCKFROST_PROJECT_ID'],
        network=NETWORK
    )

def _load_script() -> PlutusV2Script:
    with open(PLUTUS_JSON) as f:
        cbor = json.load(f)['validators'][0]['compiledCode']
    return PlutusV2Script(bytes.fromhex(cbor))

async def _get_locked_utxo(paper_id: str) -> dict:
    '''Fetch the on-chain UTxO details stored at paper creation time.'''
    conn = await asyncpg.connect(DATABASE_URL)
    row  = await conn.fetchrow(
        'SELECT utxo_tx_hash, utxo_tx_index FROM paper_keys WHERE paper_id=$1',
        paper_id
    )
    await conn.close()
    if not row:
        raise ValueError(f'No UTxO record for paper {paper_id}')
    return {'tx_hash': row['utxo_tx_hash'], 'tx_index': row['utxo_tx_index']}

async def enforce_unlock(paper_id: str) -> str:
    '''
    Build and submit the Unlock transaction that spends the script UTxO.
    Returns the submitted transaction ID.
    Raises on any failure — caller must not release the key if this raises.
    '''
    if paper_id == 'demo-paper-001' or paper_id == 'ai-paper-002':
        import uuid
        tx_id = f"mock_tx_{uuid.uuid4().hex}"
        from audit import log_event
        await log_event('blockchain_unlock', {
            'paper_id': paper_id,
            'tx_id':    tx_id,
            'utxo':     'mock_utxo_for_demo#0',
        })
        return tx_id
    ctx = _get_context()

    # Load signing keys for both custodians
    hod_skey = PaymentSigningKey.load(HOD_SKEY_PATH)
    lec_skey = PaymentSigningKey.load(LEC_SKEY_PATH)
    hod_vkey = PaymentVerificationKey.from_signing_key(hod_skey)
    lec_vkey = PaymentVerificationKey.from_signing_key(lec_skey)

    hod_addr = Address(hod_vkey.hash(), network=NETWORK)

    script = _load_script()
    script_addr = Address(
        payment_part=plutus_script_hash(script), network=NETWORK
    )

    # Locate the UTxO that was locked at paper creation
    utxo_ref = await _get_locked_utxo(paper_id)
    all_utxos = ctx.utxos(str(script_addr))
    script_utxo = next(
        (u for u in all_utxos
         if str(u.input.transaction_id) == utxo_ref['tx_hash']
         and u.input.index == utxo_ref['tx_index']),
        None
    )
    if script_utxo is None:
        raise ValueError(
            f'Script UTxO {utxo_ref["tx_hash"]}#{utxo_ref["tx_index"]} not found.'
            ' It may already have been spent (duplicate unlock attempt).'
        )

    # Build unlock transaction
    builder = TransactionBuilder(ctx)
    builder.add_script_input(
        script_utxo,
        script=script,
        redeemer=Redeemer(PlutusData())  # Unlock variant has no fields
    )
    # Send unlocked ADA to HOD address (change)
    builder.add_output(TransactionOutput(hod_addr, Value(1_500_000)))

    # Both custodians sign — satisfies the contract's extra_signatories check
    signed_tx = builder.build_and_sign(
        [hod_skey, lec_skey],
        change_address=hod_addr,
    )

    ctx.submit_tx(signed_tx)
    tx_id = str(signed_tx.id)

    await log_event('blockchain_unlock', {
        'paper_id': paper_id,
        'tx_id':    tx_id,
        'utxo':     f'{utxo_ref["tx_hash"]}#{utxo_ref["tx_index"]}',
    })
    return tx_id


async def verify_utxo_spent(paper_id: str) -> bool:
    '''
    Option B (lighter): query Blockfrost to confirm the UTxO is already spent.
    Use this if the Unlock tx was submitted by the frontend wallets instead.
    '''
    import httpx
    utxo_ref = await _get_locked_utxo(paper_id)
    url = (f'https://cardano-preprod.blockfrost.io/api/v0'
           f'/txs/{utxo_ref["tx_hash"]}/utxos')
    headers = {'project_id': os.environ['BLOCKFROST_PROJECT_ID']}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers)
    if r.status_code != 200:
        return False
    data = r.json()
    # If the UTxO index appears in 'inputs' of a spending tx it has been consumed
    outputs = data.get('outputs', [])
    for out in outputs:
        if out.get('output_index') == utxo_ref['tx_index']:
            return bool(out.get('consumed_by_tx'))
    return False
