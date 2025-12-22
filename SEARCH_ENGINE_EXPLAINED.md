# Search Engine Architecture - Detailed Explanation

## Overview

The search engine uses **Hybrid Search** combining:
1. **Keyword Search** (Traditional IR - Inverted Index)
2. **Semantic Search** (Modern ML - Vector Embeddings)

---

## 1. Keyword Search (BM25 Algorithm)

### How It Works

**Step 1: Tokenization**
```
Query: "web development"
Tokens: ["web", "development"]
```

**Step 2: Inverted Index Lookup**
```
Inverted Index:
  "web" → [IT3080:3, IT4409:2, CS386:1]  (doc_id:frequency)
  "development" → [IT3080:5, CSC12003:1, IT4409:3]
```

**Step 3: BM25 Scoring**

Formula:
```
BM25(D, Q) = Σ IDF(qi) × [f(qi, D) × (k1 + 1)] / [f(qi, D) + k1 × (1 - b + b × |D| / avgdl)]

where:
- IDF(qi) = log[(N - n(qi) + 0.5) / (n(qi) + 0.5)] (term importance)
- f(qi, D) = frequency of term qi in document D
- |D| = length of document D
- avgdl = average document length
- k1 = 1.2 (term frequency saturation parameter)
- b = 0.75 (length normalization parameter)
```

**Example Calculation:**

```python
Query: "web development"
Document: IT3080 - Web Programming

# Term "web"
IDF(web) = log[(100 - 15 + 0.5) / (15 + 0.5)] = log(5.5) = 1.70
f(web, IT3080) = 3  # appears 3 times
|IT3080| = 500 words
avgdl = 400 words

BM25(web) = 1.70 × [(3 × 2.2) / (3 + 1.2 × (1 - 0.75 + 0.75 × 500/400))]
          = 1.70 × [6.6 / (3 + 1.2 × 1.1875)]
          = 1.70 × [6.6 / 4.425]
          = 1.70 × 1.49
          = 2.53

# Term "development"
IDF(development) = log[(100 - 20 + 0.5) / (20 + 0.5)] = log(3.9) = 1.36
f(development, IT3080) = 5

BM25(development) = 1.36 × [(5 × 2.2) / (5 + 1.2 × 1.1875)]
                  = 1.36 × [11 / 6.425]
                  = 1.36 × 1.71
                  = 2.33

# Total BM25 Score
BM25(IT3080, "web development") = 2.53 + 2.33 = 4.86

# Normalized to 0-1 range
keyword_score = 4.86 / max_score = 4.86 / 10 = 0.486
```

**Meilisearch Ranking Rules:**
```
1. Exactness: Exact matches rank higher
2. Words: Number of matched query terms
3. Proximity: Distance between query terms
4. Attribute: Matches in earlier attributes (title > summary > content)
5. Typo: Fewer typos is better
6. Sort: Custom sorting
```

---

## 2. Semantic Search (Vector Embeddings)

### How It Works

**Step 1: Query Embedding**
```python
Query: "web development"
↓
SentenceTransformer.encode("web development")
↓
query_vector = [0.21, -0.43, 0.85, ..., 0.12]  # 384 dimensions
```

**Step 2: Cosine Similarity Calculation**

Formula:
```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)

where:
- A · B = dot product = Σ(Ai × Bi)
- ||A|| = magnitude of A = √(Σ Ai²)
- ||B|| = magnitude of B = √(Σ Bi²)
```

**Example Calculation:**

```python
# Query vector (simplified to 3D for illustration)
query = [0.21, -0.43, 0.85]

# Document vectors
IT3080 = [0.23, -0.45, 0.87]  # Web Programming
CSC12003 = [-0.12, 0.67, -0.34]  # Database Systems

# Cosine similarity with IT3080
dot_product = (0.21 × 0.23) + (-0.43 × -0.45) + (0.85 × 0.87)
            = 0.0483 + 0.1935 + 0.7395
            = 0.9813

magnitude_query = √(0.21² + (-0.43)² + 0.85²)
                = √(0.0441 + 0.1849 + 0.7225)
                = √0.9515
                = 0.9755

magnitude_IT3080 = √(0.23² + (-0.45)² + 0.87²)
                 = √(0.0529 + 0.2025 + 0.7569)
                 = √1.0123
                 = 1.0061

cosine_similarity = 0.9813 / (0.9755 × 1.0061)
                  = 0.9813 / 0.9815
                  = 0.9998 ≈ 1.0  ✓ Very similar!

# Cosine similarity with CSC12003
dot_product = (0.21 × -0.12) + (-0.43 × 0.67) + (0.85 × -0.34)
            = -0.0252 + -0.2881 + -0.289
            = -0.6023

magnitude_CSC12003 = √((-0.12)² + 0.67² + (-0.34)²)
                   = √(0.0144 + 0.4489 + 0.1156)
                   = √0.5789
                   = 0.7609

cosine_similarity = -0.6023 / (0.9755 × 0.7609)
                  = -0.6023 / 0.7422
                  = -0.8115  ✗ Not similar (negative!)

# Normalized to 0-1 range
semantic_score(IT3080) = (0.9998 + 1) / 2 = 0.9999
semantic_score(CSC12003) = (-0.8115 + 1) / 2 = 0.0943
```

**Vector Index (HNSW Algorithm):**

Meilisearch uses **Hierarchical Navigable Small World (HNSW)** for fast approximate nearest neighbor search:

```
Layer 2: [IT3080] ← Sparse, long-range connections
         ↓
Layer 1: [IT3080, IT4409, CS386] ← Medium density
         ↓
Layer 0: [IT3080, IT4409, CS386, CSC12003, ...] ← All vectors

Search: Start from top layer, navigate down to find nearest neighbors
Time complexity: O(log N) instead of O(N) for brute force
```

---

## 3. Hybrid Fusion

### Weighted Average Combination

**Formula:**
```
final_score = (keyword_score × (1 - semantic_ratio)) + (semantic_score × semantic_ratio)
```

**Example with semantic_ratio = 0.5:**

```python
# Document IT3080
keyword_score = 0.486
semantic_score = 0.999

final_score = (0.486 × (1 - 0.5)) + (0.999 × 0.5)
            = (0.486 × 0.5) + (0.999 × 0.5)
            = 0.243 + 0.4995
            = 0.7425

# Document IT4409
keyword_score = 0.392
semantic_score = 0.887

final_score = (0.392 × 0.5) + (0.887 × 0.5)
            = 0.196 + 0.4435
            = 0.6395

# Document CSC12003
keyword_score = 0.156
semantic_score = 0.094

final_score = (0.156 × 0.5) + (0.094 × 0.5)
            = 0.078 + 0.047
            = 0.125

# Ranking: IT3080 (0.7425) > IT4409 (0.6395) > CSC12003 (0.125)
```

**Different semantic_ratio Values:**

| semantic_ratio | Keyword Weight | Semantic Weight | Best For |
|----------------|----------------|-----------------|----------|
| 0.0 | 100% | 0% | Exact codes ("IT3080") |
| 0.2 | 80% | 20% | Mostly keyword |
| 0.5 | 50% | 50% | Balanced (default) |
| 0.8 | 20% | 80% | Conceptual queries |
| 1.0 | 0% | 100% | Pure semantic |

---

## 4. Complete Search Flow

### Timeline with Example Query: "web development"

```
t=0ms: User enters "web development", semantic_ratio=0.5
       ↓
t=1ms: Frontend sends GET /api/v1/search?q=web%20development&semantic_ratio=0.5
       ↓
t=2ms: Backend receives request
       ↓
t=5ms: Generate query embedding
       "web development" → [0.21, -0.43, 0.85, ..., 0.12] (384D)
       ↓
t=10ms: Send to Meilisearch with hybrid params
        {
          "q": "web development",
          "hybrid": {
            "semanticRatio": 0.5,
            "embedder": "default"
          },
          "vector": [0.21, -0.43, ...]
        }
        ↓
t=15ms: Meilisearch processes (parallel):
        
        [Keyword Search Thread]          [Semantic Search Thread]
        - Tokenize query                 - Load query vector
        - Lookup inverted index          - Search HNSW index
        - BM25 scoring                   - Cosine similarity
        - Results:                       - Results:
          IT3080: 0.486                    IT3080: 0.999
          IT4409: 0.392                    IT4409: 0.887
          CS386: 0.315                     CS386: 0.654
          
        ↓
t=25ms: Fusion step
        IT3080: (0.486 × 0.5) + (0.999 × 0.5) = 0.7425
        IT4409: (0.392 × 0.5) + (0.887 × 0.5) = 0.6395
        CS386: (0.315 × 0.5) + (0.654 × 0.5) = 0.4845
        ↓
t=30ms: Sort by final_score, apply limit=20
        ↓
t=35ms: Return JSON response
        {
          "hits": [
            {"id": "...", "course_code": "IT3080", "score": 0.7425},
            {"id": "...", "course_code": "IT4409", "score": 0.6395},
            ...
          ],
          "processing_time_ms": 35
        }
        ↓
t=40ms: Frontend renders results
        ↓
t=45ms: User sees results (total: 45ms)
```

---

## 5. Performance Characteristics

### Keyword Search (BM25)
- **Time Complexity**: O(log N) for inverted index lookup
- **Space Complexity**: O(N × M) where N=docs, M=unique terms
- **Speed**: ~5-10ms for 100-1000 documents
- **Precision**: High for exact matches
- **Recall**: Low for synonyms/related terms

### Semantic Search (Vector)
- **Time Complexity**: O(log N) with HNSW approximation
- **Space Complexity**: O(N × D) where N=docs, D=384 dimensions
- **Speed**: ~10-20ms for 100-1000 documents
- **Precision**: Lower for exact matches
- **Recall**: High for conceptually related content

### Hybrid Search
- **Time Complexity**: O(log N) (parallel execution)
- **Space Complexity**: O(N × (M + D))
- **Speed**: ~15-30ms (dominated by slower component)
- **Precision**: Balanced
- **Recall**: Best of both worlds

---

## 6. Real-World Examples

### Example 1: Exact Code Search

**Query**: "IT3080"
**semantic_ratio**: 0.2 (80% keyword)

```
Keyword scores:
  IT3080: 1.0 (exact match)
  IT4080: 0.1 (typo)
  
Semantic scores:
  IT3080: 0.3 (code doesn't have semantic meaning)
  IT4080: 0.28
  
Final scores:
  IT3080: (1.0 × 0.8) + (0.3 × 0.2) = 0.86
  IT4080: (0.1 × 0.8) + (0.28 × 0.2) = 0.136
  
Result: IT3080 ranked #1 ✓
```

### Example 2: Conceptual Search

**Query**: "learn to build websites"
**semantic_ratio**: 0.8 (80% semantic)

```
Keyword scores:
  IT3080 (Web Programming): 0.4 ("websites" not in title)
  IT4409 (Web Backend): 0.3
  CS386 (Web Systems): 0.35
  
Semantic scores:
  IT3080: 0.95 (strong semantic match)
  IT4409: 0.88
  CS386: 0.82
  
Final scores:
  IT3080: (0.4 × 0.2) + (0.95 × 0.8) = 0.84
  IT4409: (0.3 × 0.2) + (0.88 × 0.8) = 0.764
  CS386: (0.35 × 0.2) + (0.82 × 0.8) = 0.726
  
Result: IT3080 ranked #1 ✓ (even without exact keyword match!)
```

### Example 3: Balanced Search

**Query**: "database management"
**semantic_ratio**: 0.5 (balanced)

```
Keyword scores:
  CSC12003 (Database Management Systems): 0.9
  CSC12002 (Advanced Database): 0.7
  CSC15002 (Database Security): 0.65
  
Semantic scores:
  CSC12003: 0.92
  CSC12002: 0.88
  CSC15002: 0.75
  
Final scores:
  CSC12003: (0.9 × 0.5) + (0.92 × 0.5) = 0.91
  CSC12002: (0.7 × 0.5) + (0.88 × 0.5) = 0.79
  CSC15002: (0.65 × 0.5) + (0.75 × 0.5) = 0.70
  
Result: CSC12003 ranked #1 ✓ (both methods agree)
```

---

## Summary

**Hybrid Search combines:**
1. **Keyword Search** (BM25) - Fast, precise, exact matching
2. **Semantic Search** (Vectors) - Intelligent, contextual understanding
3. **Fusion Algorithm** - Weighted combination based on use case

**Key Innovation:**
- User controls the balance via `semantic_ratio` slider
- System adapts to different query types
- Best of both traditional IR and modern ML approaches
