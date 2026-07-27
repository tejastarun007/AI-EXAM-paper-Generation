# SECURE EXAM SYSTEM — COMPLETE DEMO PREPARATION GUIDE

---

## 1. PROJECT ARCHITECTURE OVERVIEW

Three-layer architecture:

1. Frontend → React + Vite + TailwindCSS dashboard
2. Backend → FastAPI with 6 routers, audit chain, encryption, blockchain
3. Blockchain → Cardano smart contract (Aiken/Plutus) + periodic anchoring

Flow:

```
Frontend (React/Vite)
    ↓ API calls
Backend (FastAPI)
    ├── Store keys → PostgreSQL
    ├── Audit chain → PostgreSQL (hash-chained)
    ├── Encrypt PDF → AES-256-GCM Vault (disk)
    ├── Anchor hash → Cardano Blockchain (via Blockfrost)
    ├── Question bank → JSON Bank Files
    └── AI fallback → Ollama LLM + ChromaDB
```

---

## 2. COMPLETE FILE MAP

### Backend Files (backend/)

| File                    | Purpose                                    | Key Logic                                           |
|-------------------------|--------------------------------------------|-----------------------------------------------------|
| main.py                 | FastAPI app entry point                    | Registers all routers, starts anchor_loop task      |
| question_engine.py      | 3-strategy question generation             | Bank → Rewrite → Full LLM fallback                 |
| question_bank.py        | JSON bank retrieval                        | Loads from bank.json, filters by topic              |
| pdf_builder.py          | PDF generation + encryption                | ReportLab tables, QR watermark, AES-256-GCM         |
| blockchain_enforcer.py  | Cardano unlock transactions                | PyCardano, dual-signature spend                     |
| audit.py                | Hash-chained audit log                     | SHA-256 chained entries in PostgreSQL               |
| key_store.py            | Encryption key vault                       | Fernet master-key wrapping                          |
| anchor_worker.py        | Periodic blockchain anchoring              | Writes audit hash to Cardano metadata               |
| schemas.py              | Pydantic data models                       | Question, PaperSpec, ExamPaper                      |
| subject_config.py       | Subject metadata                           | Codes, professors, CO descriptions                  |
| break_glass.py          | Emergency override tokens                  | HMAC-SHA256 sealed envelope                         |

### Router Files (backend/routers/)

| File         | API Prefix   | Purpose                                      |
|--------------|--------------|----------------------------------------------|
| generate.py  | /generate    | Exam generation endpoint, SET A + SET B      |
| paper.py     | /paper       | Download, status, metadata, emergency        |
| auth.py      | /auth        | Dual TOTP authentication (HOD + Lecturer)    |
| verify.py    | /verify      | Hash verification endpoint                   |
| admin.py     | /admin       | Break-glass emergency unlock                 |
| metrics.py   | /metrics     | Stats, audit logs, sessions, lockdown        |

### Frontend Files (frontend/src/)

| File                | Purpose                              |
|---------------------|--------------------------------------|
| App.tsx             | Main app, routing, top nav           |
| components/Login.tsx          | Login screen                         |
| components/Dashboard.tsx      | Stats cards, charts                  |
| components/Generator.tsx      | Subject picker, paper generation UI  |
| components/Vault.tsx          | TOTP auth + paper download flow      |
| components/AuditTrail.tsx     | Hash-chain log viewer                |
| components/SessionControl.tsx | Active session management            |
| components/Sidebar.tsx        | Left nav sidebar                     |
| components/GlassBreak.tsx     | Emergency unlock UI                  |
| components/LiveLogs.tsx       | Real-time log stream                 |

### Smart Contract & Scripts

| File                              | Purpose                                      |
|-----------------------------------|----------------------------------------------|
| contracts/exam_lock.ak            | Aiken smart contract — time-lock + dual-sig  |
| scripts/generate_ai_paper.py      | Standalone AI paper generation script        |

---

## 3. PAPER GENERATION LOGIC (Most Important for Demo)

### Flow: What happens when you click "Generate" in the UI

File: backend/routers/generate.py

```
User clicks Generate → POST /generate/exam?subject=Blockchain

Step 1:  Load question bank (blockchain_bank.json)              [Line 138]
Step 2:  Load history of previously used question IDs            [Line 141]
Step 3:  Filter out used questions                               [Line 144]
Step 4:  If < 16 remain, reset history (auto-refresh pool)       [Line 147-150]
Step 5:  Shuffle available pool                                  [Line 153]
Step 6:  Pick 8 questions for SET A (pop from pool)              [Line 165]
Step 7:  Pick 8 questions for SET B (from remaining pool)        [Line 168]
Step 8:  Save used IDs to history file                           [Line 171-172]
Step 9:  Build PDF with 2 pages (SET A + SET B)                  [Line 191]
Step 10: AES-256-GCM encrypt the PDF                            [Line 194]
Step 11: Store AES key in PostgreSQL (Fernet-wrapped)            [Line 198]
Step 12: Save encrypted blob to disk (.aesgcm file)              [Line 200-203]
Step 13: Log event to hash-chained audit trail                   [Line 206-213]
```

### Marks Pattern (25-mark CIE format)

```
Each SET has 8 questions with marks: [8, 5, 8, 5, 7, 5, 7, 5]

PART A: Q1(a=8 marks, b=5 marks) OR Q2(a=8 marks, b=5 marks)
        → Student picks ONE pair = 13 marks

PART B: Q3(a=7 marks, b=5 marks) OR Q4(a=7 marks, b=5 marks)
        → Student picks ONE pair = 12 marks

Total per student = 13 + 12 = 25 marks
```

### The 3-Strategy Question Engine

File: backend/question_engine.py

Strategy 1 — Bank Direct (Lines 172-205):
  - Returns question from JSON bank as-is
  - Speed: ~1ms (zero GPU)
  - When: Default — always tried first
  - Logic: retrieve_from_bank() fetches by topic, checks for duplicates

Strategy 2 — Bank Rewrite (Lines 207-237):
  - LLM rephrases a bank question with different wording
  - Speed: ~5-10s
  - When: Bank question exists but needs variation
  - Uses REWRITE_PROMPT (Lines 40-47) — tiny prompt, same concept/Bloom level

Strategy 3 — Full LLM Generation (Lines 239-293):
  - Generates question from scratch using RAG context from ChromaDB
  - Speed: ~15-30s
  - When: Fallback when bank is empty or all candidates rejected
  - Uses GEN_PROMPT + JUDGE_PROMPT for Bloom's level verification
  - If judged Bloom level differs by >1 from requested → rejected and retried

IMPORTANT NOTE: The /generate/exam endpoint (routers/generate.py) uses
Strategy 1 only for sub-second generation. The question_engine.py with all
3 strategies is the AI-powered alternative used by scripts/generate_ai_paper.py.

### Cross-Generation Dedup Logic

File: backend/routers/generate.py (Lines 28-59)

- History stored in: data/generation_history/{subject}.json
- _load_history() reads previously used question IDs
- _save_history() appends new used IDs after generation
- When available questions < 16 → _reset_history() deletes the file
- This ensures consecutive exams never share questions until pool exhausts

---

## 4. ENCRYPTION PIPELINE

### Step A — Encrypt (at generation time)

File: backend/pdf_builder.py (Lines 285-293)

```python
def encrypt_pdf(pdf_bytes, paper_id):
    key = AESGCM.generate_key(bit_length=256)    # Random 256-bit key
    nonce = os.urandom(12)                         # Random 12-byte nonce
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, pdf_bytes, paper_id.encode())  # paper_id as AAD
    blob = nonce + ct                              # Prepend nonce to ciphertext
    return blob, key.hex()
```

Why AES-256-GCM? → Provides authenticated encryption. If anyone tampers with
even 1 bit of the ciphertext, decryption fails entirely. AES-CBC does not
detect tampering.

### Step B — Key Storage

File: backend/key_store.py (Lines 22-43)

```
key_hex → Fernet(MASTER_KEY).encrypt(key_hex) → stored in PostgreSQL paper_keys table
```

The AES key is never stored in plaintext. It's wrapped with a Fernet master key
stored in environment variables. Double encryption layer.

### Step C — Decrypt (at download time)

File: backend/routers/paper.py (Lines 25-77)

```
1. JWT verified (checks paper_id matches token)
2. enforce_unlock() submits Cardano tx (best-effort)
3. retrieve_key_encrypted() gets Fernet blob from DB
4. decrypt_master_key() unwraps with MASTER_KEY → gets key_hex
5. Read encrypted .aesgcm file from disk
6. decrypt_pdf(blob, key_hex, paper_id) → original PDF bytes
7. Return PDF as download response
```

---

## 5. BLOCKCHAIN INTEGRATION

### Smart Contract (Aiken Language)

File: contracts/exam_lock.ak

```
ExamDatum = {
    commitment:     SHA-256(key + paper_id + exam_datetime)
    unlock_slot:    earliest Cardano slot to allow unlock
    hod_pkh:        HOD's public key hash
    lecturer_pkh:   Lecturer's public key hash
    paper_id:       unique paper identifier
}

ExamRedeemer:
    Unlock → requires ALL THREE conditions:
        1. Current slot >= unlock_slot  (time-lock has passed)
        2. HOD has signed the transaction
        3. Lecturer has signed the transaction

    BreakGlass → always returns False on-chain
        (Emergency handled off-chain via break_glass.py)
```

### Blockchain Anchoring (Tamper Evidence)

File: backend/anchor_worker.py

- Runs as a FastAPI background task (started in main.py lifespan)
- Every ANCHOR_INTERVAL_SECONDS (default 3600 = 1 hour):
    1. Gets latest entry_hash from audit_log table
    2. Embeds it in Cardano transaction metadata (key 674)
    3. Submits transaction to Cardano Preprod Testnet via Blockfrost
    4. Records the anchor in audit_log itself

- WHY: Even if someone has database access and modifies audit entries,
  the blockchain anchor provides an independent checkpoint. Any mismatch
  between the database chain and the on-chain hash proves tampering.

### Blockchain Enforcer (Unlock Transactions)

File: backend/blockchain_enforcer.py

- For demo papers (demo-paper-001, ai-paper-002) → returns mock tx ID (Line 46-55)
- For real papers:
    1. Loads HOD + Lecturer signing keys (Lines 59-62)
    2. Loads Plutus script from contracts/plutus.json (Line 66)
    3. Finds the locked UTxO on-chain (Lines 72-84)
    4. Builds unlock transaction with dual signatures (Lines 87-100)
    5. Submits to Cardano and logs the tx ID (Lines 102-110)

---

## 6. AUDIT CHAIN LOGIC

File: backend/audit.py

### How it works:

```
Each audit entry contains:
    - event_type  (e.g., "exam_generated", "auth_failure")
    - payload     (JSON with details)
    - ts          (Unix timestamp)
    - entry_hash  = SHA256(prev_hash + event_type + payload + ts)
    - prev_hash   (hash of the previous entry)

Genesis (first entry): prev_hash = "0000...0000" (64 zeros)

Chain example:
    Entry 1: prev=0000...0000, hash=abc123...
    Entry 2: prev=abc123...,   hash=def456...
    Entry 3: prev=def456...,   hash=ghi789...
```

### Tamper Detection:

If Entry 2's payload is modified → its hash changes → Entry 3's prev_hash
no longer matches → verify_chain() detects the break.

### Concurrency Safety:

Uses pg_advisory_xact_lock(123456789) (Line 50) to serialize concurrent
writers. This prevents race conditions with multiple uvicorn workers.

### Key Functions:

- log_event(event_type, payload) → atomically appends chained entry
- verify_chain() → walks all entries, verifies every hash link
- get_latest_entry_hash() → returns tip hash for blockchain anchoring

---

## 7. AUTHENTICATION FLOW

File: backend/routers/auth.py

### Dual TOTP Authentication:

```
Step 1: HOD opens app → enters TOTP code from authenticator app
        → POST /auth/totp-verify {role: "hod", totp_code: "123456"}
        → Server creates pending_session with 90-second expiry
        → Response: {status: "waiting_for_lecturer", window_secs: 90}

Step 2: Lecturer enters TOTP code within 90 seconds
        → POST /auth/totp-verify {role: "lecturer", totp_code: "654321"}
        → Server checks pending session exists and not expired
        → If valid: issues JWT with 15-minute expiry
        → Response: {token: "eyJ...", status: "authenticated"}

Step 3: Frontend uses JWT to call GET /paper/{paper_id}/download
        → Server verifies JWT → decrypts paper → returns PDF
```

### Security Features:

- Lockout: 5 failed attempts → 30-minute lockout (Lines 36-48)
- TOTP window: valid_window=1 means ±30 seconds tolerance (Line 62)
- JWT expiry: 15 minutes (JWT_EXPIRY = 900 seconds, Line 13)
- TOTP secrets: from env vars HOD_TOTP_SECRET, LECTURER_TOTP_SECRET

---

## 8. PDF FORMAT DETAILS

File: backend/pdf_builder.py

### PDF Layout Structure (matching RLJIT college format):

```
┌─────────────────────────────────────────────────────┐
│ USN: 1 R L _ _ _ _ _ _ _ _    Subject Code: BCS613A│  Lines 65-78
├─────────────────────────────────────────────────────┤
│ [QR]  Sri Devaraj Urs Educational Trust (R.)        │
│       R. L. JALAPPA INSTITUTE OF TECHNOLOGY         │  Lines 85-102
│       Department of COMPUTER SCIENCE & ENGINEERING  │
│       Continuous Internal Evaluation – I    SET A   │
├─────────────────────────────────────────────────────┤
│ Date: ___  Max Marks: 25  Duration: 90 MINS         │  Lines 105-118
│ Semester: 6th Sem  Faculty: Dr. P Vijayakarthik     │
├─────────────────────────────────────────────────────┤
│ Note: Answer any ONE full question from each PART   │  Lines 120-131
├──────┬────────────────────┬──────┬────┬────┬────────┤
│ Q.No │ Questions          │Marks │RBT │ CO │ PO     │  Lines 134-222
├──────┼────────────────────┼──────┼────┼────┼────────┤
│      │     PART A         │      │    │    │        │
│  1   │ a) Question 1a     │  8   │ L2 │CO1 │PO1 PO2│
│      │ b) Question 1b     │  5   │ L2 │CO1 │PO1 PO2│
│      │       OR           │      │    │    │        │
│  2   │ a) Question 2a     │  8   │ L3 │CO2 │PO1 PO2│
│      │ b) Question 2b     │  5   │ L3 │CO2 │PO1 PO2│
│      │     PART B         │      │    │    │        │
│  3   │ a) Question 3a     │  7   │ L4 │CO3 │PO1 PO3│
│      │ b) Question 3b     │  5   │ L4 │CO3 │PO1 PO3│
│      │       OR           │      │    │    │        │
│  4   │ a) Question 4a     │  7   │ L4 │CO3 │PO1 PO3│
│      │ b) Question 4b     │  5   │ L4 │CO3 │PO1 PO3│
├──────┴────────────────────┴──────┴────┴────┴────────┤
│ CO1: Understand fundamentals of blockchain...       │  Lines 224-228
│ CO2: Explain cryptographic primitives...            │
│ CO3: Analyze Ethereum, smart contracts...           │
├─────────────┬─────────────────┬─────────────────────┤
│ Prepared By │ IQAC Coordinator│ Approved by HoD     │  Lines 230-246
└─────────────┴─────────────────┴─────────────────────┘
```

### QR Code Watermark (Lines 12-23):

Encodes: "EXAM:{paper_id}:{hmac_token}"
HMAC = first 16 chars of HMAC-SHA256(WATERMARK_SECRET, "{paper_id}:{timestamp}")
Purpose: Verify paper authenticity by scanning QR code

---

## 9. COMMON GUIDE QUESTIONS & EXACT CHANGES

### Q: "Move the sidebar icons to the top navigation"
Files to change:
  1. frontend/src/components/Sidebar.tsx — remove icon buttons
  2. frontend/src/App.tsx (Lines 55-63) — add icon buttons to header div

### Q: "Move the top navigation tabs to the sidebar"
Files to change:
  1. frontend/src/App.tsx (Lines 35-53) — remove the nav map() block
  2. frontend/src/components/Sidebar.tsx — add the nav items vertically

### Q: "Change the Lock/Bell/User icons position"
File: frontend/src/App.tsx (Lines 55-63)
The icons are Lock, Bell, User imported from lucide-react (Line 11).
Move the <div className="flex items-center space-x-3"> block.

### Q: "How does the PDF match your college format?"
File: backend/pdf_builder.py
  - Lines 65-78: USN table with subject code boxes
  - Lines 85-102: Institution header with QR code
  - Lines 105-118: Metadata table (date, semester, marks, duration)
  - Lines 134-222: Question table with PART A/B, OR rows, CO/PO columns
  - Lines 230-246: Signature block (Prepared By, IQAC, HoD)

### Q: "How to add a new subject?"
Steps:
  1. Open backend/subject_config.py — add entry to SUBJECTS dict
  2. Create new JSON bank file (e.g., backend/newsubject_bank.json)
  3. Frontend auto-detects via GET /generate/subjects (routers/generate.py Line 103)

### Q: "How to change the marks pattern?"
File: backend/routers/generate.py (Line 162)
  Change: marks_pattern = [8, 5, 8, 5, 7, 5, 7, 5]
  Also update: backend/pdf_builder.py (Lines 134-222) if question count changes

### Q: "How to change the number of questions per paper?"
Files:
  1. backend/routers/generate.py Lines 165-168 — change the number 8
  2. backend/pdf_builder.py Lines 148-222 — add/remove question rows and spans

### Q: "What if the question bank runs out?"
File: backend/routers/generate.py (Lines 147-150)
  When available < 16 → _reset_history() deletes the history file
  → All questions become available again automatically

### Q: "Why Cardano and not Ethereum?"
Reasons:
  - Lower transaction fees (~0.17 ADA vs variable ETH gas)
  - Aiken language is purpose-built and more auditable
  - eUTxO model provides deterministic execution (no failed txs)
  - File: contracts/exam_lock.ak

### Q: "Why AES-256-GCM instead of AES-CBC?"
File: backend/pdf_builder.py (Lines 285-293)
  GCM = authenticated encryption. Tampering with even 1 bit → decryption fails.
  CBC has no built-in integrity check — attacker can modify ciphertext silently.

### Q: "Why hash chaining instead of just normal logging?"
File: backend/audit.py
  Normal logs can be silently edited by a DB admin.
  Hash chaining: modifying ANY entry breaks the chain.
  verify_chain() (Lines 76-104) instantly detects tampering.

### Q: "What is the QR code on the paper?"
File: backend/pdf_builder.py (Lines 12-23)
  Encodes: EXAM:{paper_id}:{hmac_token}
  HMAC uses WATERMARK_SECRET — verifies paper is authentic and unmodified.

### Q: "How does dual authentication work?"
File: backend/routers/auth.py
  HOD authenticates first (TOTP) → 90-second window opens
  → Lecturer must authenticate within 90s → JWT issued
  → Neither person can unlock the paper alone

### Q: "Change the TOTP window from 90 seconds to 120 seconds"
File: backend/routers/auth.py (Line 14)
  Change: WINDOW_SECS = 90  →  WINDOW_SECS = 120

### Q: "Change the JWT expiry time"
File: backend/routers/auth.py (Line 13)
  Change: JWT_EXPIRY = 900  →  desired value in seconds

### Q: "What is the break-glass mechanism?"
Files: backend/break_glass.py + backend/routers/admin.py
  An HMAC token is generated at paper creation → sealed in physical envelope.
  In emergency (server down, blockchain unavailable):
  Admin provides token + reason → bypasses all locks → returns decryption key.
  Restricted to specific IPs (ADMIN_IPS env var).

### Q: "How does Bloom's Taxonomy classification work?"
File: backend/question_engine.py (Lines 87-92)
  Uses a separate LLM call (JUDGE_MODEL) that outputs {"bloom_level": 1-6}.
  If judged level differs by >1 from requested → question is rejected.
  Bloom levels: 1=Remember, 2=Understand, 3=Apply, 4=Analyse, 5=Evaluate, 6=Create

### Q: "Where do the dashboard stats come from?"
File: backend/routers/metrics.py (Lines 10-34)
  - Active sessions: COUNT(DISTINCT username) from auth_success in last 24h
  - Encrypted papers: COUNT(*) from paper_keys table
  - Security alerts: count of auth_failure, replay_attempt events

### Q: "How to change the college name in the PDF?"
File: backend/pdf_builder.py (Lines 85-93)
  Edit the inst_text string — change institution name and affiliation details.

### Q: "What if the blockchain is down during exam?"
File: backend/routers/paper.py (Lines 40-46)
  Blockchain call is best-effort. If it fails → error is logged → download
  proceeds anyway. Paper is NEVER blocked by blockchain unavailability.

### Q: "How do you prevent same questions in consecutive exams?"
File: backend/routers/generate.py (Lines 28-59)
  Each generation saves used question IDs to data/generation_history/{subject}.json
  Next generation filters these out. Pool exhaustion triggers auto-reset.

### Q: "Change the dashboard color theme"
Files:
  - frontend/src/App.tsx (Line 28) — main bg: bg-[#0f131d], text: text-[#dfe2f1]
  - frontend/src/index.css — global styles
  - Individual component .tsx files for component-specific colors

### Q: "Add a new page/tab to the dashboard"
Steps:
  1. Create: frontend/src/components/NewPage.tsx
  2. Edit: frontend/src/App.tsx — import, add to nav array (Lines 36-40),
     add render condition (Lines 67-83)
  3. Edit: frontend/src/components/Sidebar.tsx — add sidebar icon/link

---

## 10. DATA FILES

| File                                    | Contents                        |
|-----------------------------------------|---------------------------------|
| backend/blockchain_bank.json            | Blockchain subject questions    |
| backend/python_bank.json                | Python subject questions        |
| backend/ada_bank.json                   | Algorithms subject questions    |
| backend/bank.json                       | Generic/fallback question bank  |
| data/syllabus_ontology.json             | Topic taxonomy                  |
| data/encrypted_vault/*.aesgcm           | Encrypted paper blobs           |
| data/generation_history/*.json          | Used question ID tracking       |

---

## 11. ENVIRONMENT VARIABLES (.env)

| Variable               | Used In                           | Purpose                        |
|------------------------|-----------------------------------|--------------------------------|
| DATABASE_URL           | audit.py, key_store.py            | PostgreSQL connection          |
| JWT_SECRET             | auth.py, paper.py                 | JWT signing key                |
| MASTER_KEY             | key_store.py                      | Fernet key for wrapping AES    |
| WATERMARK_SECRET       | pdf_builder.py                    | QR code HMAC secret            |
| BREAK_GLASS_SECRET     | break_glass.py                    | Emergency token HMAC           |
| HOD_TOTP_SECRET        | auth.py                           | HOD authenticator seed         |
| LECTURER_TOTP_SECRET   | auth.py                           | Lecturer authenticator seed    |
| BLOCKFROST_PROJECT_ID  | blockchain_enforcer.py, anchor    | Cardano API key                |
| HOD_SKEY_PATH          | blockchain_enforcer.py            | HOD signing key file path      |
| LECTURER_SKEY_PATH     | blockchain_enforcer.py            | Lecturer signing key path      |

---

## 12. QUICK REFERENCE: "IF I CHANGE X, WHAT FILES ARE AFFECTED?"

| Change                        | Files Affected                                           |
|-------------------------------|----------------------------------------------------------|
| Add new subject               | subject_config.py + new *_bank.json                      |
| Change marks pattern          | routers/generate.py L162 + pdf_builder.py L134-222       |
| Change PDF layout             | pdf_builder.py                                           |
| Change auth flow              | routers/auth.py + Vault.tsx                              |
| Change encryption algorithm   | pdf_builder.py L285-301 + routers/paper.py               |
| Change blockchain network     | blockchain_enforcer.py + anchor_worker.py + .env         |
| Add new API endpoint          | New file in backend/routers/ + register in main.py       |
| Change UI theme/colors        | App.tsx + index.css + individual component files          |
| Change question count         | routers/generate.py L162-168 + pdf_builder.py L148-222   |
| Move UI elements              | Specific component .tsx file                             |
| Change smart contract logic   | contracts/exam_lock.ak + recompile with aiken build      |
| Change college name           | pdf_builder.py L85-93                                    |
| Change TOTP timeout           | routers/auth.py L14                                      |
| Change JWT expiry             | routers/auth.py L13                                      |
| Add new audit event type      | Call audit.log_event() anywhere + update metrics.py      |
