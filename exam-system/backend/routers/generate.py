# pyright: reportMissingImports=false
"""
generate.py — Exam generation router.

Generates a single PDF with 2 pages (SET A + SET B), using hardcoded
question banks for sub-second generation. No LLM calls needed.

Cross-generation dedup: tracks which questions were used in previous
papers and excludes them until the pool is exhausted, then resets.
"""

import os, hashlib, uuid, json, random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query  # type: ignore
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from schemas import ExamPaper, Question  # type: ignore
from pdf_builder import build_pdf_two_sets, encrypt_pdf  # type: ignore
from key_store import store_key  # type: ignore
from audit import log_event  # type: ignore
from subject_config import SUBJECTS, SUBJECT_LIST  # type: ignore

router = APIRouter(prefix='/generate')

# ─── History Tracking (Cross-Generation Dedup) ──────────────────────────────

HISTORY_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'generation_history')


def _load_history(subject: str) -> list[str]:
    """Load list of previously used question IDs for a subject."""
    os.makedirs(HISTORY_DIR, exist_ok=True)
    history_file = os.path.join(HISTORY_DIR, f"{subject.replace(' ', '_').lower()}.json")
    if not os.path.exists(history_file):
        return []
    try:
        with open(history_file) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_history(subject: str, used_ids: list[str]):
    """Append used question IDs to the history file for a subject."""
    os.makedirs(HISTORY_DIR, exist_ok=True)
    history_file = os.path.join(HISTORY_DIR, f"{subject.replace(' ', '_').lower()}.json")
    existing = _load_history(subject)
    existing.extend(used_ids)
    with open(history_file, 'w') as f:
        json.dump(existing, f, indent=2)


def _reset_history(subject: str):
    """Reset history when pool is exhausted — allows full reuse."""
    history_file = os.path.join(HISTORY_DIR, f"{subject.replace(' ', '_').lower()}.json")
    if os.path.exists(history_file):
        os.remove(history_file)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _load_bank(bank_file: str) -> list[dict]:
    """Load a question bank JSON file from the backend directory."""
    bank_path = os.path.join(os.path.dirname(__file__), '..', bank_file)
    if not os.path.exists(bank_path):
        raise FileNotFoundError(f"Question bank not found: {bank_file}")
    with open(bank_path) as f:
        return json.load(f)


def _pick_questions(pool: list[dict], n: int, marks_pattern: list[int]) -> list[Question]:
    """
    Sequentially pick `n` unique questions from the pool.
    Each question is assigned marks from the pattern.
    Questions are removed from pool after selection (no repeats).
    """
    if len(pool) < n:
        raise ValueError(f"Not enough questions in pool: need {n}, have {len(pool)}")

    selected = []
    for i in range(n):
        idx = random.randint(0, len(pool) - 1)
        q_data = pool.pop(idx)

        q = Question(
            id=q_data.get('id', str(uuid.uuid4())),
            text=q_data['text'],
            marks=marks_pattern[i],
            bloom_level=q_data.get('bloom_level', 2),
            source_chunk_ids=[q_data.get('co', 'CO1')],
            topic_tag=q_data.get('topic', 'General'),
            answer_guide="Refer to syllabus."
        )
        selected.append(q)

    return selected


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get('/subjects')
async def list_subjects():
    """Return available subjects for the frontend dropdown."""
    return {
        "subjects": [
            {"name": name, "code": cfg["code"]}
            for name, cfg in SUBJECTS.items()
        ]
    }


@router.post('/exam')
async def generate_exam(subject: str = Query(..., description="Subject name to generate exam for")):
    """
    Generate a single PDF with 2 pages (SET A and SET B).

    - Uses hardcoded question banks — sub-second generation.
    - Sequential selection prevents duplicate questions within a paper.
    - Cross-generation history prevents the same questions from appearing
      in consecutive papers. When the pool is exhausted, history resets
      automatically.
    """
    try:
        # Validate subject
        if subject not in SUBJECTS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown subject '{subject}'. Available: {SUBJECT_LIST}"
            )

        config = SUBJECTS[subject]
        paper_id = f"paper-{uuid.uuid4().hex[:8]}"
        exam_datetime = datetime.now(timezone.utc).isoformat()

        # Load the question bank
        bank = _load_bank(config['bank_file'])

        # Load history of previously used questions
        history = set(_load_history(subject))

        # Filter out previously used questions
        available = [q for q in bank if q.get('id', q['text']) not in history]

        # If not enough questions remain, reset history and use full bank
        if len(available) < 16:
            _reset_history(subject)
            available = list(bank)
            print(f"[Generator] History reset for '{subject}' — pool was exhausted. Full bank available again.")

        # Shuffle the available pool
        random.shuffle(available)
        pool = list(available)

        # 25-mark CIE pattern per SET:
        # Q1: a)8 + b)5 = 13 marks (PART A, option 1)  → CO1
        # Q2: a)8 + b)5 = 13 marks (PART A, option 2)  → CO2
        # Q3: a)7 + b)5 = 12 marks (PART B, option 1)  → CO3
        # Q4: a)7 + b)5 = 12 marks (PART B, option 2)  → CO3
        # Student picks Q1 OR Q2 (13) + Q3 OR Q4 (12) = 25 marks
        marks_pattern = [8, 5, 8, 5, 7, 5, 7, 5]

        # Pick 8 questions for SET A (removes from pool)
        questions_a = _pick_questions(pool, 8, marks_pattern)

        # Pick 8 questions for SET B (from remaining pool — guaranteed no overlap)
        questions_b = _pick_questions(pool, 8, marks_pattern)

        # Save used question IDs to history (prevents reuse in next generation)
        used_ids = [q.id for q in questions_a] + [q.id for q in questions_b]
        _save_history(subject, used_ids)

        # Build ExamPaper objects
        paper_a = ExamPaper(
            paper_id=paper_id,
            subject=subject,
            exam_date=exam_datetime,
            questions=questions_a,
            generated_at=datetime.now(timezone.utc).isoformat()
        )
        paper_b = ExamPaper(
            paper_id=paper_id,
            subject=subject,
            exam_date=exam_datetime,
            questions=questions_b,
            generated_at=datetime.now(timezone.utc).isoformat()
        )

        # Build single PDF with 2 pages
        pdf_bytes = build_pdf_two_sets(paper_a, paper_b, exam_datetime, config)

        # Encrypt
        blob, key_hex = encrypt_pdf(pdf_bytes, paper_id)

        # Save
        commitment = hashlib.sha256(blob).hexdigest()
        await store_key(paper_id, key_hex, exam_datetime, commitment)

        vault_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted_vault')
        os.makedirs(vault_dir, exist_ok=True)
        with open(os.path.join(vault_dir, f"{paper_id}.aesgcm"), 'wb') as f:
            f.write(blob)

        # Audit
        await log_event('exam_generated', {
            'paper_id': paper_id,
            'subject': subject,
            'commitment': commitment,
            'questions_set_a': len(questions_a),
            'questions_set_b': len(questions_b),
            'pool_remaining': len(available) - 16,
        })

        return {
            "status": "success",
            "paper_id": paper_id,
            "subject": subject,
            "sets": 2,
            "questions_per_set": 8,
            "pool_remaining": len(available) - 16,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
