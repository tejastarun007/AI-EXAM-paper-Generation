"""
subject_config.py — Central configuration for all exam subjects.

Each subject defines its metadata, faculty, bank file, and CO descriptions.
"""

SUBJECTS = {
    "Blockchain": {
        "code": "BCS613A",
        "semester": "6th Sem",
        "section": "B & C Sec",
        "professor": "Dr. P Vijayakarthik",
        "department": "COMPUTER SCIENCE & ENGINEERING",
        "duration": "90 MINS",
        "max_marks": "25",
        "time": "9:30-11:00 AM",
        "bank_file": "blockchain_bank.json",
        "co_descriptions": [
            "CO1: Understand the fundamentals of blockchain, distributed systems, and consensus mechanisms.",
            "CO2: Explain cryptographic primitives, decentralization methods, and Bitcoin architecture.",
            "CO3: Analyze Ethereum, smart contracts, and real-world blockchain applications.",
        ],
    },
    "Python Programming": {
        "code": "BPLC205B",
        "semester": "2nd Sem",
        "section": "B & C Sec",
        "professor": "Mrs. Manjubhargavi D P",
        "department": "COMPUTER SCIENCE & ENGINEERING",
        "duration": "90 MINS",
        "max_marks": "25",
        "time": "9:30-11:00 AM",
        "bank_file": "python_bank.json",
        "co_descriptions": [
            "CO1: Understand Python basics, variables, functions, and debugging concepts.",
            "CO2: Apply control structures and built-in functions to solve programming problems.",
            "CO3: Analyze and evaluate expressions, return values, and operator precedence.",
        ],
    },
    "Analysis and Design of Algorithms": {
        "code": "BCS401",
        "semester": "4th Sem",
        "section": "B & C Sec",
        "professor": "Mrs. Srijyothi P & Dr. Sunil Kumar R M",
        "department": "COMPUTER SCIENCE & ENGINEERING",
        "duration": "90 MINS",
        "max_marks": "25",
        "time": "9:30-11:00 AM",
        "bank_file": "ada_bank.json",
        "co_descriptions": [
            "CO1: Understand algorithm fundamentals, asymptotic analysis, and brute force techniques.",
            "CO2: Apply divide-and-conquer, transform-and-conquer, and space-time tradeoff strategies.",
            "CO3: Analyze dynamic programming, greedy methods, backtracking, and NP problems.",
        ],
    },
}

# Ordered list for the frontend dropdown
SUBJECT_LIST = list(SUBJECTS.keys())
