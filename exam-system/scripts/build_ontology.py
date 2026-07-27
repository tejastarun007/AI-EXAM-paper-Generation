# scripts/build_ontology.py
# Run once to create syllabus_ontology.json

SYLLABUS = [
    {"topic": "OSI Model",       "chapter": 3, "bloom_ceiling": 4, "tags": ["networking", "layers"]},
    {"topic": "TCP/IP Stack",    "chapter": 3, "bloom_ceiling": 4, "tags": ["networking", "protocols"]},
    {"topic": "Subnetting",      "chapter": 4, "bloom_ceiling": 5, "tags": ["networking", "ip"]},
    {"topic": "DNS Resolution",  "chapter": 5, "bloom_ceiling": 4, "tags": ["networking", "dns"]},
    {"topic": "SQL Joins",       "chapter": 7, "bloom_ceiling": 5, "tags": ["databases"]},
    {"topic": "ACID Properties", "chapter": 7, "bloom_ceiling": 4, "tags": ["databases"]},
    {"topic": "Normalisation",   "chapter": 8, "bloom_ceiling": 5, "tags": ["databases"]},
]

import json
with open('data/syllabus_ontology.json', 'w') as f:
    json.dump(SYLLABUS, f, indent=2)
print(f'Written {len(SYLLABUS)} topic entries.')
