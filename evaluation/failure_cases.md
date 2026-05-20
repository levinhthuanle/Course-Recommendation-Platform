# Failure Cases And Mitigations

## Noisy OCR

- Problem: OCR introduces garbled tokens and incorrect line breaks.
- Impact: BM25 matches degrade; dense embeddings become noisy; incorrect answers.
- Mitigation: OCR confidence thresholds, normalization, and re-OCR fallback.

## Inconsistent Syllabus Hierarchy

- Problem: Different departments format sections inconsistently.
- Impact: Chunking loses logical boundaries, harming retrieval context.
- Mitigation: Section-aware chunking with heuristics and layout cues.

## Malformed PDFs

- Problem: Scanned or protected PDFs fail to parse cleanly.
- Impact: Missing content leads to incomplete retrieval and false negatives.
- Mitigation: File validation, OCR fallback, and ingestion error reporting.

## Ranking Instability

- Problem: Small query variations reorder results significantly.
- Impact: Users perceive unreliability; evaluation becomes inconsistent.
- Mitigation: Hybrid fusion tuning and query rewriting for stable intent.

## Ambiguous Queries

- Problem: Short queries like "capstone" or "lab" lack context.
- Impact: Dense retrieval returns broad matches; hallucinations increase.
- Mitigation: Ask clarifying questions or enrich queries from session context.

## Incomplete Retrieval

- Problem: Relevant sections are split across chunks or missed.
- Impact: Answers omit critical requirements or policies.
- Mitigation: Overlap-aware chunking and top-k expansion checks.

## Hallucinated Responses

- Problem: LLM fills gaps when evidence is weak or missing.
- Impact: Incorrect guidance presented as fact.
- Mitigation: Strict grounding rules and refusal when evidence is absent.
