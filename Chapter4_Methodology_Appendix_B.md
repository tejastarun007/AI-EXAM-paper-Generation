# CHAPTER 4: METHODOLOGY

---

## 4.4 Data Collection

The system relies on structured, manually curated question banks as its primary data source. Data collection for this project involved two parallel tracks: (1) gathering domain-specific examination questions from faculty subject matter experts, and (2) sourcing syllabus context documents for use by the AI generation fallback.

### 4.4.1 Question Bank Collection

Questions were collected directly from faculty members of the Department of Computer Science and Engineering, R. L. Jalappa Institute of Technology, for the following four subjects:

| Subject | Code | Semester | Questions Collected |
|---|---|---|---|
| Blockchain Technology | BCS613A | 6th Sem | 50 |
| Python Programming | BPLC205B | 2nd Sem | 60 |
| Analysis and Design of Algorithms | BCS401 | 4th Sem | 50 |
| Multimedia Communication | — | — | 24 |
| Artificial Intelligence | — | — | 16 |

Each question was tagged with the following metadata at the point of collection:

- **`text`** — The full question statement as it would appear on the exam paper.
- **`bloom_level`** — Bloom's Taxonomy level (1–6), assigned by the faculty member during review.
- **`marks`** — Marks weightage (typically 5, 7, or 8 for CIE-I pattern).
- **`topic`** — The specific syllabus topic the question belongs to.
- **`subject`** — Parent subject name.
- **`co`** — Course Outcome mapping (CO1, CO2, or CO3).

All collected questions were serialised into individual JSON bank files (`blockchain_bank.json`, `python_bank.json`, `ada_bank.json`, `bank.json`) stored in the backend directory. Each bank file is a flat JSON array of question objects.

### 4.4.2 Syllabus Context Collection (RAG Fallback)

In addition to the question banks, the system supports an optional Retrieval-Augmented Generation (RAG) pipeline powered by a ChromaDB vector store. In this path, textbook and syllabus documents can be uploaded and embedded using the `nomic-embed-text` model via Ollama. These embeddings are indexed into a ChromaDB collection named `textbooks` and queried at generation time to provide contextual grounding to the LLM.

For the Multimedia Communication subject, a set of 13 curated context passages was hardcoded directly in `question_engine.py` as `MULTIMEDIA_CONTEXT`. This was done to prevent the LLM from drifting toward generic AI or Knowledge Representation topics when no textbook documents were uploaded. These passages cover JPEG/MPEG compression standards, GIF/TIFF formats, run-length and Huffman coding, DPCM, Sub-band ADPCM, LPC speech coding, H.261 video coding, network QoS parameters, iTV architectures, and multipoint conferencing topologies.

---

## 4.5 Data Pre-processing

Once collected, the raw question data and supporting documents underwent several pre-processing steps before being consumed by the generation engine.

### 4.5.1 Question Bank Normalisation

Each raw question entry was validated and normalised into a consistent schema. The system uses the following Pydantic model (`schemas.py`) to enforce data integrity at runtime:

```python
class Question(BaseModel):
    id:               str   # UUID
    text:             str   # Full question text
    bloom_level:      int   # 1–6 (Bloom's Taxonomy)
    marks:            int   # 1–20
    topic_tag:        str
    source_chunk_ids: List[str]   # ChromaDB chunk IDs or CO tag
    answer_guide:     str         # Model answer / marking guide
```

Questions without an `id` field were assigned one at retrieval time using the question text as a surrogate key. The `bloom_level` and `marks` fields in the stored bank are treated as defaults; at retrieval time they are overridden to match the marks pattern demanded by the exam template (`[8, 5, 8, 5, 7, 5, 7, 5]` marks across 8 sub-questions per set). This ensures the paper always sums to 25 marks per CIE-I format.

### 4.5.2 Deduplication

To prevent the same question from appearing multiple times within a single paper, a string similarity check using Python's `difflib.SequenceMatcher` is applied at selection time. Any candidate question whose similarity ratio to a previously selected question exceeds **0.85** is rejected. This threshold was chosen to catch lexically near-identical questions while allowing legitimately distinct questions that share common keywords to coexist.

For cross-paper deduplication, a per-subject history file (e.g., `blockchain.json`, `python_programming.json`) records the IDs of all questions used in previously generated papers. When a new paper is requested, these IDs are excluded from the candidate pool. When the available pool shrinks below 16 questions (the minimum needed for two complete sets of 8), the history is automatically reset and the full bank is made available again.

### 4.5.3 LLM-based Bloom's Level Verification

For questions produced by the full LLM generation fallback (Strategy 3), a separate judge LLM pass is performed using the `qwen2.5:0.5b` model to classify the generated question's Bloom's level. The judged level must be within ±1 of the requested level; otherwise the question is rejected and generation is retried (up to 3 attempts). This step is skipped for questions served directly from the bank (Strategy 1) and for LLM rewrites of bank questions (Strategy 2), since the original faculty-assigned level is preserved.

### 4.5.4 PDF Construction and Encryption

After question selection, the paper is assembled into a structured PDF using the ReportLab library. The layout follows the official RLJIT CIE-I format: USN box, institution header with embedded QR watermark, metadata table (semester, section, duration, max marks), question table with Bloom's level and CO/PO mappings, CO descriptions footer, and signature block.

Each generated PDF is then encrypted using **AES-256-GCM** before storage. The process is:

1. A 256-bit AES key is generated randomly per paper.
2. A 12-byte random nonce is generated.
3. The PDF bytes are encrypted with the key and nonce; the paper ID is used as Additional Authenticated Data (AAD) to bind the ciphertext to the specific paper.
4. The encrypted blob (`nonce || ciphertext`) is written to the `data/encrypted_vault/` directory as `<paper_id>.aesgcm`.
5. The AES key is itself encrypted using a Fernet master key (set via the `MASTER_KEY` environment variable) before being stored in the PostgreSQL `paper_keys` table.
6. A SHA-256 commitment hash of the encrypted blob is computed and stored alongside the key record, enabling tamper detection.

---

# APPENDIX B: DATASETS

## B.1 Question Bank Summary

The following table summarises the datasets used as input to the question generation engine.

| Bank File | Subject | Topics | Questions |
|---|---|---|---|
| `blockchain_bank.json` | Blockchain Technology | Blockchain Fundamentals, Consensus Mechanisms, Smart Contracts, Ethereum, Bitcoin Architecture, Cryptographic Primitives | 50 |
| `python_bank.json` | Python Programming | Python Basics, Operators & Expressions, Control Structures, Functions, Data Structures, OOP & Advanced, Problem Solving, Debugging, Computer Architecture, Introduction to Computers | 60 |
| `ada_bank.json` | Analysis and Design of Algorithms | Algorithm Analysis, Brute Force & Divide and Conquer, Transform & Conquer, Dynamic Programming & Greedy, NP Problems & Backtracking | 50 |
| `bank.json` (Multimedia) | Multimedia Communication | Multimedia Systems | 24 |
| `ai_bank.json` | Artificial Intelligence | Introduction to AI, Knowledge Representation and Reasoning | 16 |

**Total questions across all banks: 200**

## B.2 Question Bank Schema

Each record in all bank files conforms to the following JSON schema:

```json
{
  "id":          "<string — unique question identifier>",
  "text":        "<string — full question text>",
  "bloom_level": "<integer 1–6 — Bloom's Taxonomy level>",
  "marks":       "<integer — default marks weightage>",
  "topic":       "<string — syllabus topic>",
  "subject":     "<string — parent subject name>",
  "co":          "<string — course outcome tag, e.g. CO1>"
}
```

## B.3 Sample Records

### B.3.1 Blockchain Bank

```json
{
  "text": "Define Blockchain. Explain the different types of blockchain with neat diagrams.",
  "bloom_level": 1,
  "marks": 10,
  "topic": "Blockchain Fundamentals",
  "subject": "Blockchain Technology",
  "co": "CO1"
}
```

```json
{
  "text": "Explain the following: a) CAP Theorem  b) Zero-knowledge proof",
  "bloom_level": 2,
  "marks": 10,
  "topic": "Blockchain Fundamentals",
  "subject": "Blockchain Technology",
  "co": "CO1"
}
```

### B.3.2 Python Programming Bank

```json
{
  "text": "What is a function? Explain with an example how functions are defined and called in Python.",
  "bloom_level": 2,
  "marks": 8,
  "topic": "Functions",
  "subject": "Python Programming",
  "co": "CO1"
}
```

### B.3.3 ADA Bank

```json
{
  "text": "Explain the concept of asymptotic notation. Define Big-O, Omega, and Theta with examples.",
  "bloom_level": 2,
  "marks": 10,
  "topic": "Algorithm Analysis",
  "subject": "Analysis and Design of Algorithms",
  "co": "CO1"
}
```

### B.3.4 Multimedia Communication Bank

```json
{
  "text": "With a neat block diagram Explain the JPEG encoder and decoder.",
  "bloom_level": 3,
  "marks": 10,
  "topic": "Multimedia Systems",
  "subject": "Multimedia Communication",
  "co": "CO1"
}
```

## B.4 Audit Log Schema

In addition to question data, the system maintains a tamper-evident audit log in PostgreSQL. The schema is as follows:

```sql
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    event_type  TEXT             NOT NULL,
    payload     JSONB            NOT NULL,
    ts          DOUBLE PRECISION NOT NULL,
    entry_hash  TEXT             NOT NULL,   -- SHA-256 of this entry
    prev_hash   TEXT             NOT NULL    -- SHA-256 of previous entry
);
```

Each row's `entry_hash` is computed as the SHA-256 of a JSON object containing `prev_hash`, `event_type`, `payload`, and `ts`, forming a hash chain. The chain can be verified end-to-end via the `/verify/chain` endpoint. Periodic anchor transactions submit the latest chain hash to the Cardano blockchain (Preprod testnet) via the Blockfrost API, providing an immutable external timestamp.

Logged event types include: `exam_generated`, `question_from_bank`, `question_generated`, `pdf_downloaded`, `hod_authenticated`, `session_created`, `session_expired`, `auth_failure`, `account_locked`, `blockchain_unlock`, `blockchain_error`, and `replay_attempt`.

## B.5 Encrypted Vault Storage

Generated exam PDFs are not stored in plaintext. After generation, each paper is encrypted and stored as:

```
backend/data/encrypted_vault/<paper_id>.aesgcm
```

The file format is: `[12-byte nonce] || [AES-256-GCM ciphertext]`

The corresponding AES key is stored in the `paper_keys` database table in Fernet-encrypted form. The SHA-256 commitment of the encrypted blob is also stored, allowing integrity verification before decryption.
