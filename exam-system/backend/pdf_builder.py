# pyright: reportMissingImports=false
import hmac, hashlib, os, json
from datetime import datetime
from reportlab.lib.pagesizes import A4 # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph as RLPara, Spacer, Image, PageBreak # type: ignore
from reportlab.lib.styles import getSampleStyleSheet # type: ignore
from cryptography.hazmat.primitives.ciphers.aead import AESGCM # type: ignore
from io import BytesIO
from schemas import ExamPaper # type: ignore
import qrcode # type: ignore

def _build_qr_watermark(paper_id: str, ts: str) -> bytes:
    '''Creates a small QR code encoding a verifiable HMAC token.'''
    secret  = os.environ['WATERMARK_SECRET']
    payload = f'{paper_id}:{ts}'
    token   = hmac.new(secret.encode(), payload.encode(),
                        hashlib.sha256).hexdigest()[:16] # type: ignore
    qr_data = f'EXAM:{paper_id}:{token}'

    img = qrcode.make(qr_data, box_size=2, border=1)
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

from reportlab.platypus import SimpleDocTemplate, Paragraph as RLPara, Spacer, Image, Table, TableStyle, PageBreak # type: ignore
from reportlab.lib import colors # type: ignore


def _build_single_set(story, paper, exam_datetime, subject_config, set_label, page_num, total_pages):
    """Build one page (one SET variation) of the question paper into the story list."""
    styles = getSampleStyleSheet()

    from reportlab.lib.styles import ParagraphStyle # type: ignore
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT # type: ignore

    # Add styles only once — guard with try/except
    style_defs = {
        'CenterTitle':   dict(alignment=TA_CENTER, fontSize=12, fontName='Helvetica-Bold'),
        'CenterHeading': dict(alignment=TA_CENTER, fontSize=10, fontName='Helvetica-Bold'),
        'CenterSub':     dict(alignment=TA_CENTER, fontSize=9,  fontName='Helvetica'),
        'LeftBold':      dict(alignment=TA_LEFT,   fontSize=10, fontName='Helvetica-Bold'),
        'LeftNormal':    dict(alignment=TA_LEFT,   fontSize=10, fontName='Helvetica'),
        'RightBold':     dict(alignment=TA_RIGHT,  fontSize=10, fontName='Helvetica-Bold'),
        'Justify':       dict(alignment=TA_JUSTIFY, leading=14, fontSize=10),
        'CenterItalic':  dict(alignment=TA_CENTER, fontSize=9,  fontName='Helvetica-Oblique'),
        'Signatures':    dict(alignment=TA_CENTER, fontSize=10, fontName='Helvetica-Bold'),
    }
    for name, kw in style_defs.items():
        try:
            styles.add(ParagraphStyle(name=name, parent=styles['Normal'], **kw))
        except KeyError:
            pass  # already added from a previous call

    # Extract config
    subject_code = subject_config.get('code', 'N/A')
    professor    = subject_config.get('professor', '')
    department   = subject_config.get('department', 'COMPUTER SCIENCE & ENGINEERING')
    semester     = subject_config.get('semester', '6th Sem')
    section      = subject_config.get('section', 'B & C Sec')
    duration     = subject_config.get('duration', '90 MINS')
    max_marks    = subject_config.get('max_marks', '25')
    time_str     = subject_config.get('time', '9:30-11:00 AM')
    co_descs     = subject_config.get('co_descriptions', [])

    # 1. USN and Subject Code
    usn_data = [['USN', '1', 'R', 'L', '', '', '', '', '', '', '', '', 'Subject Code', subject_code]]
    usn_table = Table(usn_data, colWidths=[30]+[15]*10+[15]+[80, 60])
    usn_table.setStyle(TableStyle([
        ('BOX', (1,0), (10,0), 1, colors.black),
        ('INNERGRID', (1,0), (10,0), 1, colors.black),
        ('BOX', (13,0), (13,0), 1, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,0), 'LEFT'),
        ('ALIGN', (12,0), (12,0), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
    ]))
    story.append(usn_table)
    story.append(Spacer(1, 10))

    # 2. Institution Details with QR and SET label
    qr_bytes = _build_qr_watermark(paper.paper_id, exam_datetime)
    qr_img = Image(BytesIO(qr_bytes), width=60, height=60)

    inst_text = f"""<para align=center>
    Sri Devaraj Urs Educational Trust (R.)<br/>
    <b>R. L. JALAPPA INSTITUTE OF TECHNOLOGY</b><br/>
    <font size=8>(Approved by AICTE, New Delhi, Affiliated to VTU, Belagavi &amp; Accredited by NACC - "A" Grade)</font><br/>
    <b>Kodigehalli, Doddaballapur- 561 203</b><br/>
    <b>DEPARTMENT OF {department}</b><br/>
    <b>Continuous Internal Evaluation – I</b><br/>
    <b><font size=11>{set_label}</font></b>
    </para>"""

    inst_data = [[qr_img, RLPara(inst_text, styles['CenterSub']), '']]
    inst_table = Table(inst_data, colWidths=[80, 363, 80])
    inst_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1, colors.black),
    ]))
    story.append(inst_table)

    # 3. Metadata Table — date blank, professor hardcoded
    meta_data = [
        ['Date', '___________', RLPara('', styles['LeftNormal']), 'Max Marks', max_marks],
        ['Semester', semester, RLPara(f'Faculty Name: {professor}', styles['LeftNormal']), 'Duration', duration],
        ['Section', section, '', 'Time', time_str]
    ]
    meta_table = Table(meta_data, colWidths=[65, 80, 238, 65, 75])
    meta_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.black),
        ('SPAN', (2,1), (2,2)),  # Span faculty over the empty cell
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
    ]))
    story.append(meta_table)

    # 4. Legend Note
    note_text = "<b><i>Note: Answer any ONE full question from each PART</i></b><br/><font size=7>RBT – Bloom's Taxonomy Levels (1- Remembering, 2- Understanding, 3 – Applying, 4 – Analyzing, 5 – Evaluating, 6 - Creating)<br/>CO – Course Outcomes PO – Program Outcomes</font>"
    note_data = [[RLPara(note_text, styles['CenterSub'])]]
    note_table = Table(note_data, colWidths=[523])
    note_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(note_table)

    story.append(Spacer(1, 4))

    # 5. Questions Table — 25-mark CIE pattern
    # Expected 8 questions with CO assignments:
    # Q1(a,b) → CO1, Q2(a,b) → CO2, Q3(a,b) → CO3, Q4(a,b) → CO3
    qs = paper.questions  # list of Question objects

    # CO mapping per question pair
    co_map = ['CO1', 'CO1', 'CO2', 'CO2', 'CO3', 'CO3', 'CO3', 'CO3']
    # PO mapping
    po_map = ['PO1\nPO2', 'PO1\nPO2', 'PO1\nPO2', 'PO1\nPO2',
              'PO1\nPO3', 'PO1\nPO3', 'PO1\nPO3', 'PO1\nPO3']

    def _span_row(text):
        return [RLPara(f"<b>{text}</b>", styles['CenterHeading']), '', '', '', '', '']

    # Build rows explicitly
    q_data = [['Q.\nNo', 'Questions', 'Marks', 'RB\nT', 'CO', 'PO']]

    # Row 1: PART A
    q_data.append(_span_row('PART A'))

    # Q1 a) — idx 0
    q_data.append(['1', RLPara(f"a)  {qs[0].text}" if len(qs) > 0 else '', styles['Justify']),
                    str(qs[0].marks) if len(qs) > 0 else '', f'L{qs[0].bloom_level}' if len(qs) > 0 else '',
                    co_map[0], po_map[0]])
    # Q1 b) — idx 1
    q_data.append(['', RLPara(f"b)  {qs[1].text}" if len(qs) > 1 else '', styles['Justify']),
                    str(qs[1].marks) if len(qs) > 1 else '', f'L{qs[1].bloom_level}' if len(qs) > 1 else '',
                    co_map[1], po_map[1]])

    # OR
    q_data.append(_span_row('OR'))

    # Q2 a) — idx 2
    q_data.append(['2', RLPara(f"a)  {qs[2].text}" if len(qs) > 2 else '', styles['Justify']),
                    str(qs[2].marks) if len(qs) > 2 else '', f'L{qs[2].bloom_level}' if len(qs) > 2 else '',
                    co_map[2], po_map[2]])
    # Q2 b) — idx 3
    q_data.append(['', RLPara(f"b)  {qs[3].text}" if len(qs) > 3 else '', styles['Justify']),
                    str(qs[3].marks) if len(qs) > 3 else '', f'L{qs[3].bloom_level}' if len(qs) > 3 else '',
                    co_map[3], po_map[3]])

    # PART B
    q_data.append(_span_row('PART B'))

    # Q3 a) — idx 4
    q_data.append(['3', RLPara(f"a)  {qs[4].text}" if len(qs) > 4 else '', styles['Justify']),
                    str(qs[4].marks) if len(qs) > 4 else '', f'L{qs[4].bloom_level}' if len(qs) > 4 else '',
                    co_map[4], po_map[4]])
    # Q3 b) — idx 5
    q_data.append(['', RLPara(f"b)  {qs[5].text}" if len(qs) > 5 else '', styles['Justify']),
                    str(qs[5].marks) if len(qs) > 5 else '', f'L{qs[5].bloom_level}' if len(qs) > 5 else '',
                    co_map[5], po_map[5]])

    # OR
    q_data.append(_span_row('OR'))

    # Q4 a) — idx 6
    q_data.append(['4', RLPara(f"a)  {qs[6].text}" if len(qs) > 6 else '', styles['Justify']),
                    str(qs[6].marks) if len(qs) > 6 else '', f'L{qs[6].bloom_level}' if len(qs) > 6 else '',
                    co_map[6], po_map[6]])
    # Q4 b) — idx 7
    q_data.append(['', RLPara(f"b)  {qs[7].text}" if len(qs) > 7 else '', styles['Justify']),
                    str(qs[7].marks) if len(qs) > 7 else '', f'L{qs[7].bloom_level}' if len(qs) > 7 else '',
                    co_map[7], po_map[7]])

    q_table = Table(q_data, colWidths=[35, 333, 35, 30, 30, 60])

    q_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('ALIGN', (2,1), (-1,-1), 'CENTER'),
        ('ALIGN', (0,1), (0,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        # Span PART A, OR, PART B, OR rows across all columns
        ('SPAN', (0,1), (5,1)),   # PART A
        ('SPAN', (0,4), (5,4)),   # OR
        ('SPAN', (0,7), (5,7)),   # PART B
        ('SPAN', (0,10), (5,10)), # OR
        # Span Q.No vertically for Q1 (rows 2-3), Q2 (5-6), Q3 (8-9), Q4 (11-12)
        ('SPAN', (0,2), (0,3)),   # Q1
        ('SPAN', (0,5), (0,6)),   # Q2
        ('SPAN', (0,8), (0,9)),   # Q3
        ('SPAN', (0,11), (0,12)), # Q4
    ]))
    story.append(q_table)

    # 6. Footer — CO descriptions from config
    story.append(Spacer(1, 4))
    for co_desc in co_descs:
        story.append(RLPara(f"<b>{co_desc}</b>", styles['LeftNormal']))
    story.append(Spacer(1, 12))

    sig_data = [
        ['Prepared By', 
         RLPara('<font size=8>Verified by Department IQAC Co-ordinator<br/><b>IQAC Coordinator</b><br/>Department of Computer Science & Engineering<br/>R L Jalappa Institute of Technology<br/>Doddaballapur-561 203.</font>', styles['CenterSub']), 
         RLPara('<font size=8><b>Approved by HoD</b><br/><b>Head of Department</b><br/>Computer Science and Engineering<br/>R.L. Jalappa Institute of Technology<br/>Doddaballapur, Bengaluru (R)-561 203.</font>', styles['CenterSub'])]
    ]
    sig_table = Table(sig_data, colWidths=[174, 174, 175])
    sig_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,0), 1, colors.black),
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 4))
    story.append(RLPara(f"<font size=8>Page {page_num} of {total_pages}</font>", styles['CenterSub']))


def build_pdf(paper: ExamPaper, exam_datetime: str, subject_config: dict | None = None) -> bytes:
    """Build PDF matching RLJIT tabular format — single page, single variation."""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=36, rightMargin=36,
                            topMargin=36, bottomMargin=36)
    story = []
    config = subject_config or {}
    _build_single_set(story, paper, exam_datetime, config, '', 1, 1)
    doc.build(story)
    return buf.getvalue()


def build_pdf_two_sets(paper_a: ExamPaper, paper_b: ExamPaper, exam_datetime: str, subject_config: dict | None = None) -> bytes:
    """Build a single PDF with 2 pages: SET A (page 1) and SET B (page 2)."""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=36, rightMargin=36,
                            topMargin=36, bottomMargin=36)
    story = []
    config = subject_config or {}

    # Page 1: SET A
    _build_single_set(story, paper_a, exam_datetime, config, 'SET A', 1, 2)
    story.append(PageBreak())

    # Page 2: SET B
    _build_single_set(story, paper_b, exam_datetime, config, 'SET B', 2, 2)

    doc.build(story)
    return buf.getvalue()


def encrypt_pdf(pdf_bytes: bytes, paper_id: str) -> tuple[bytes, str]:
    '''AES-256-GCM encrypt. Returns (ciphertext, key_hex).'''
    key  = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, pdf_bytes, paper_id.encode())
    # Store: nonce(12) + ciphertext
    blob = nonce + ct
    return blob, key.hex()

def decrypt_pdf(blob: bytes, key_hex: str, paper_id: str) -> bytes:
    key  = bytes.fromhex(key_hex)
    nonce = blob[:12] # type: ignore
    ct    = blob[12:] # type: ignore
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, paper_id.encode())
