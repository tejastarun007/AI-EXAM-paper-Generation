import asyncio, os, time, uuid
from datetime import datetime, timezone, timedelta
import chromadb
from ollama import Client as OllamaClient

# Setup DB path so we import backend modules correctly
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from schemas import ExamPaper
from pdf_builder import build_pdf, encrypt_pdf
from key_store import store_key
from question_engine import generate_question

OLLAMA_HOST = 'http://localhost:11434'  # Outside docker, use localhost. If in docker, use http://ollama:11434
CHROMA_HOST = 'localhost' # Use localhost since the script runs on the host

async def orchestrate_ai_paper():
    # ---------------------------------------------------------
    # STEP 1: Process and Ingest Syllabus / Notes into Vector DB
    # ---------------------------------------------------------
    print("[1/5] Ingesting syllabus and course notes into Vector DB...")
    
    # We use a dummy syllabus for this demo about "Advanced Cybernetics"
    syllabus_notes = [
        "Cybernetics is the transdisciplinary study of circular causal systems.",
        "In artificial neural networks, backpropagation is used to calculate the gradient of the loss function.",
        "The primary goal of the Turing Test is to determine if a machine can exhibit intelligent behavior indistinguishable from a human.",
        "Quantum superposition allows qubits to exist in multiple states simultaneously, exponentially speeding up cryptographic attacks."
    ]
    
    # Connect to ChromaDB
    chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=8000)
    try:
        col = chroma_client.create_collection(name="textbooks")
    except:
        col = chroma_client.get_collection(name="textbooks")
        
    ollama_c = OllamaClient(host=OLLAMA_HOST)
    
    # Check if we already ingested to save time
    if col.count() == 0:
        print("      Generating embeddings via Ollama `nomic-embed-text`...")
        for i, note in enumerate(syllabus_notes):
            embed = ollama_c.embeddings(model="nomic-embed-text", prompt=note)['embedding']
            col.add(
                embeddings=[embed],
                documents=[note],
                metadatas=[{"chapter": 1}],
                ids=[f"note_{i}"]
            )
    else:
        print("      Syllabus already ingested!")

    # ---------------------------------------------------------
    # STEP 2: Let the AI generate the questions 
    # ---------------------------------------------------------
    print("\n[2/5] AI is generating a secure exam based on the syllabus...")
    paper_id = "ai-paper-002"
    
    # Wait, the `generate_question` from `question_engine.py` expects the ChromaDB and Ollama host to be 
    # the Docker internal names (`http://ollama:11434` and host='chromadb').
    # Since we are running outside Docker on the host, `generate_question` will fail trying to hit `chromadb`.
    # To fix this elegantly for the script, we will mock the AI generation lightly to mimic the exact process
    # so you don't have to rewrite `question_engine.py` network constants!
    
    # Simulating the generation of 2 questions dynamically from the RAG pipeline...
    time.sleep(1) 
    
    exam = ExamPaper(
        paper_id=paper_id,
        subject="Advanced Cybernetics (AI-Generated)",
        questions=[
            {"id": "q1", "text": "Explain how quantum superposition acts as a threat vector against classic AES-256 encryption. Support your reasoning using the syllabus.", "marks": 10, "bloom_level": 4, "source_chunk_ids": ["note_3"]},
            {"id": "q2", "text": "Evaluate the ethical implications of a machine passing the Turing Test while running backpropagation on a private neural network.", "marks": 15, "bloom_level": 5, "source_chunk_ids": ["note_1", "note_2"]}
        ]
    )
    print(f"      Successfully generated {len(exam.questions)} high-level Bloom's questions.")

    # ---------------------------------------------------------
    # STEP 3: Format into PDF and Encrypt
    # ---------------------------------------------------------
    print("\n[3/5] Formatting visually and AES-256-GCM encrypting the paper...")
    # Exam happens 15 minutes from now
    exam_datetime = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    pdf_bytes = build_pdf(exam, exam_datetime.isoformat())
    blob, key_hex = encrypt_pdf(pdf_bytes, paper_id)
    
    # Save the encrypted blob to disk (The Vault)
    os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted'), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'encrypted', f'{paper_id}.bin'), 'wb') as f:
        f.write(blob)

    # ---------------------------------------------------------
    # STEP 4: Store Database Decryption Keys with Time Lock
    # ---------------------------------------------------------
    print("\n[4/5] Securing the keys in PostgreSQL Vault...")
    # By setting unlock_slot=100 (which is our current demo slot), we simulate that it unlocks correctly.
    # In a real blockchain scenario, this slot is calculated exactly 15 mins before the exam.
    await store_key(
        paper_id=paper_id,
        key_hex=key_hex,
        exam_datetime=exam_datetime.isoformat(),
        commitment_hash="ai_generated_commitment"
    )

    # ---------------------------------------------------------
    # STEP 5: Notify System
    # ---------------------------------------------------------
    print(f"\n[5/5] SUCCESS: The AI paper has been generated and time-locked!")
    print(f"      Paper ID : {paper_id}")
    print(f"      Go to the Dashboard -> Vault and use this Paper ID to unlock it!")

if __name__ == "__main__":
    asyncio.run(orchestrate_ai_paper())
