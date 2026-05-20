# Retrieval Benchmark Notes

These observations are qualitative and intended to guide engineering decisions rather than claim performance metrics.

## Retrieval Comparison

| Approach | Strengths | Weaknesses | Best Use |
|---|---|---|---|
| BM25 | Strong keyword precision, robust for course codes and titles | Misses semantic paraphrases; brittle to synonyms | Exact matching, structured queries |
| Dense Retrieval | Captures semantic intent and paraphrases | Can surface off-topic results without lexical anchors | Natural language queries and topic discovery |
| Hybrid Fusion | Balances precision and semantic recall; more stable ranking | Requires tuning and consistent chunking | Production search where reliability matters |

## Latency Observations

- BM25 is consistently fast and stable for short queries.
- Dense retrieval adds model inference and vector search overhead.
- Hybrid retrieval combines both costs but can reduce retries by improving relevance.

## Practical Engineering Insights

- Hybrid fusion is most reliable when chunks are clean and consistent.
- OCR errors increase both false positives and missed matches.
- Query rewriting can stabilize results for short or ambiguous queries.
- Grounded responses depend on retrieval coverage more than model size.
