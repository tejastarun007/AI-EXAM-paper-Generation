import os, asyncio, logging
from pycardano import (
    BlockFrostChainContext, Network, PaymentSigningKey,
    PaymentVerificationKey, Address, TransactionBuilder,
    AuxiliaryData, AlonzoMetadata, Metadata, TransactionOutput, Value
)
from audit import get_latest_entry_hash, log_event

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AnchorWorker")

NETWORK = Network.TESTNET
# Use anchor wallet if specified, else fallback to hod.skey (treasury)
SKEY_PATH = os.environ.get('ANCHOR_SKEY_PATH', 'wallets/funded.skey')
BLOCKFROST_PROJECT_ID = os.environ.get('BLOCKFROST_PROJECT_ID')

async def anchor_loop(interval_seconds: int = 3600):
    logger.info(f"Starting blockchain anchor worker. Interval: {interval_seconds}s")
    
    # Wait for blockfrost key
    if not BLOCKFROST_PROJECT_ID:
        logger.warning("No BLOCKFROST_PROJECT_ID. Anchor worker disabled.")
        return

    try:
        # Resolve path robustly for local vs docker execution
        skey_path = SKEY_PATH
        if not os.path.exists(skey_path) and os.path.exists(os.path.join('..', skey_path)):
            skey_path = os.path.join('..', skey_path)
            
        skey = PaymentSigningKey.load(skey_path)
        vkey = PaymentVerificationKey.from_signing_key(skey)
        addr = Address(vkey.hash(), network=NETWORK)
    except Exception as e:
        logger.error(f"Failed to load treasury wallet from {SKEY_PATH}. Anchor worker disabled. ({e})")
        return

    ctx = BlockFrostChainContext(project_id=BLOCKFROST_PROJECT_ID, network=NETWORK)

    while True:
        try:
            await asyncio.sleep(interval_seconds)
            
            entry_hash = await get_latest_entry_hash()
            logger.info(f"Anchoring hash to Cardano: {entry_hash}")
            
            # The metadata key 674 is a standard for general messages or app metadata on Cardano.
            # We enforce immutability by embedding the rolling hash root into the transaction.
            metadata = Metadata({
                674: {"app": "ExamSys Hybrid Anchor", "root_hash": entry_hash}
            })
            auxiliary_data = AuxiliaryData(AlonzoMetadata(metadata=metadata))
            
            builder = TransactionBuilder(ctx)
            builder.add_input_address(addr)
            # Send ADA back to ourselves just to pay the fee and attach metadata
            builder.add_output(TransactionOutput(addr, Value(1_000_000)))
            builder.auxiliary_data = auxiliary_data
            
            signed_tx = builder.build_and_sign([skey], change_address=addr)
            ctx.submit_tx(signed_tx)
            
            tx_id = str(signed_tx.id)
            logger.info(f"Anchor TX ID: {tx_id}")
            
            # Record it in our own audit log to complete the chain
            await log_event('blockchain_anchor', {
                'tx_id': tx_id,
                'anchored_hash': entry_hash
            })
        except Exception as e:
            logger.error(f"Error during blockchain anchoring: {e}")

