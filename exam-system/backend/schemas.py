from pydantic import BaseModel, Field
from enum import IntEnum
from typing import List

class BloomLevel(IntEnum):
    REMEMBER    = 1
    UNDERSTAND  = 2
    APPLY       = 3
    ANALYSE     = 4
    EVALUATE    = 5
    CREATE      = 6

class Question(BaseModel):
    id:              str   = Field(..., description='UUID for this question')
    text:            str   = Field(..., description='Full question text')
    bloom_level:     int   = Field(..., ge=1, le=6)
    marks:           int   = Field(..., ge=1, le=20)
    topic_tag:       str
    source_chunk_ids: List[str]  # links back to ChromaDB chunk IDs
    answer_guide:    str   = Field(..., description='Model answer for marking')

class PaperSpec(BaseModel):
    subject:         str
    total_marks:     int = 100
    l1_pct: int = 10   # % of marks at Bloom L1-L2
    l2_pct: int = 30   # % of marks at Bloom L3
    l3_pct: int = 60   # % of marks at Bloom L4-L6

class ExamPaper(BaseModel):
    paper_id:    str
    subject:     str
    exam_date:   str
    questions:   List[Question]
    generated_at: str
