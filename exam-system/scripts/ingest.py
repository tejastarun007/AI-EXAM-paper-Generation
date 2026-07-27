import pdfplumber, chromadb, json, hashlib, re
from ollama import Client as OllamaClient
from pathlib import Path

CHUNK_SIZE   = 512   # tokens (approx 4 chars/token => ~2048 chars)
OVERLAP      = 64
CHROMA_HOST  = 'http://localhost:8001'
OLLAMA_HOST  = 'http://localhost:11434'
EMBED_MODEL  = 'nomic-embed-text'

def char_to_token_count(text: str) -> int:
    return max(1, len(text) // 4)

def chunk_text(text: str, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    '''Split text into overlapping token-approximated chunks.'''
    chars_per_chunk = chunk_size * 4
    overlap_chars   = overlap * 4
    chunks = []
    start = 0
    while start < len(text):
        end = start + chars_per_chunk
        chunks.append(text[start:end])
        if end >= len(text): break
        start = end - overlap_chars
    return chunks

def ingest_pdf(pdf_path: Path, collection, doc_type='textbook'):
    ollama = OllamaClient(host=OLLAMA_HOST)
    ids, documents, metadatas, embeddings = [], [], [], []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ''
            text = re.sub(r'\s+', ' ', text).strip()
            if not text: continue

            # Detect chapter from common patterns
            chapter = 0
            m = re.search(r'Chapter\s+(\d+)', text, re.I)
            if m: chapter = int(m.group(1))

            for i, chunk in enumerate(chunk_text(text)):
                chunk_id = hashlib.sha256(
                    f'{pdf_path.name}:{page_num}:{i}'.encode()).hexdigest()[:16]
                embed_resp = ollama.embeddings(model=EMBED_MODEL, prompt=chunk)
                embeddings.append(embed_resp['embedding'])
                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append({
                    'source': pdf_path.name,
                    'doc_type': doc_type,
                    'chapter': chapter,
                    'page': page_num,
                    'chunk_index': i,
                })

    collection.add(ids=ids, documents=documents,
                   metadatas=metadatas, embeddings=embeddings)
    print(f'Ingested {len(ids)} chunks from {pdf_path.name}')

if __name__ == '__main__':
    client = chromadb.HttpClient(host='localhost', port=8001)
    textbook_col  = client.get_or_create_collection('textbooks')
    pastpaper_col = client.get_or_create_collection('past_papers')

    for pdf in Path('data/textbooks').glob('*.pdf'):
        ingest_pdf(pdf, textbook_col, 'textbook')
    for pdf in Path('data/past_papers').glob('*.pdf'):
        ingest_pdf(pdf, pastpaper_col, 'past_paper')

    print('Ingestion complete.')
