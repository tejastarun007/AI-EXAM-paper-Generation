import hmac, hashlib, os, time
from datetime import datetime, timezone

BG_SECRET = os.environ['BREAK_GLASS_SECRET']  # 32-byte hex, separate from watermark secret

def generate_token(paper_id: str, exam_datetime: str) -> str:
    '''Called once at paper creation. Print and seal in envelope.'''
    msg = f'break-glass:{paper_id}:{exam_datetime}'
    token = hmac.new(
        bytes.fromhex(BG_SECRET), msg.encode(), hashlib.sha256
    ).hexdigest()
    return token

def verify_token(paper_id: str, exam_datetime: str, token: str) -> bool:
    expected = generate_token(paper_id, exam_datetime)
    return hmac.compare_digest(expected, token)  # constant-time compare
