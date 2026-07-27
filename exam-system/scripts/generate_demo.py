import asyncio
import os
import sys
from datetime import datetime, timezone

# Add backend to path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
import asyncpg
from key_store import store_key
from audit import _ensure_schema
from pdf_builder import encrypt_pdf

async def init_demo():
    print("Connecting to database...")
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    print("Initializing audit_log schema...")
    await _ensure_schema(conn)
    await conn.close()

    print("Generating encrypted demo paper...")
    print("Downloading sample PDF...")
    import urllib.request
    req = urllib.request.urlopen("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
    plaintext_pdf = req.read()
    
    # Encrypt PDF
    blob, key_hex = encrypt_pdf(plaintext_pdf, "demo-paper-001")
    
    # Save to disk
    os.makedirs("data/encrypted", exist_ok=True)
    with open("data/encrypted/demo-paper-001.bin", "wb") as f:
        f.write(blob)
        
    print("Storing cryptographic keys in database...")
    # Clean up any existing demo paper
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    await conn.execute("DELETE FROM paper_keys WHERE paper_id='demo-paper-001'")
    await conn.close()
    
    # Store key in DB (this inherently creates paper_keys table)
    # Give it unlock slot 100 as expected by frontend Vault.tsx
    await store_key("demo-paper-001", key_hex, datetime.now(timezone.utc).isoformat(), "demo_commitment_hash")
    
    print("✅ Demo paper 'demo-paper-001' generated and locked in database.")

if __name__ == "__main__":
    asyncio.run(init_demo())
