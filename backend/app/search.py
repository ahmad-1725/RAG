import re
import numpy as np
from rank_bm25 import BM25Okapi

from app.embeddings import embed_text


# --------------------------------------------------
# Semantic similarity
# --------------------------------------------------

def cosine_similarity(vector_a, vector_b):
    a = np.array(vector_a)
    b = np.array(vector_b)

    return np.dot(a, b) / (
        np.linalg.norm(a) * np.linalg.norm(b)
    )


# --------------------------------------------------
# BM25
# --------------------------------------------------

def bm25_tokenize(text):
    return re.findall(
        r"\b[a-zA-Z0-9]+\b",
        text.lower()
    )


def build_bm25_index(chunks):
    tokenized_chunks = [
        bm25_tokenize(chunk["content"])
        for chunk in chunks
    ]

    return BM25Okapi(tokenized_chunks)


def bm25_search(query, chunks, bm25):
    query_tokens = bm25_tokenize(query)

    scores = bm25.get_scores(query_tokens)

    results = []

    for chunk, score in zip(chunks, scores):
        results.append({
            "chunk_id": chunk["chunk_id"],
            "score": float(score)
        })

    return results


# --------------------------------------------------
# Score normalization
# --------------------------------------------------

def min_max_normalize(scores):
    if not scores:
        return []

    min_score = min(scores)
    max_score = max(scores)

    if max_score == min_score:
        return [0.0 for _ in scores]

    return [
        (score - min_score) / (max_score - min_score)
        for score in scores
    ]


# --------------------------------------------------
# Keyword matching
# --------------------------------------------------

def tokenize(text):
    return set(
        re.findall(
            r"\b[a-zA-Z0-9]+\b",
            text.lower()
        )
    )


def keyword_score(query, text):
    query_words = tokenize(query)
    text_words = tokenize(text)

    if not query_words:
        return 0.0

    matched_words = query_words.intersection(text_words)

    return len(matched_words) / len(query_words)


# --------------------------------------------------
# Source filtering
# --------------------------------------------------

def filter_sources(
    results,
    top_k=5,
    relative_threshold=0.90,
    minimum_score=0.45
):
    """
    Keep only results that are sufficiently relevant.

    A result must:
    1. Reach the minimum relevance score.
    2. Be reasonably close to the strongest result.
    """

    if not results:
        return []

    best_score = results[0]["score"]

    relative_cutoff = best_score * relative_threshold

    filtered_results = [
        result
        for result in results
        if (
            result["score"] >= minimum_score
            and result["score"] >= relative_cutoff
        )
    ]

    return filtered_results[:top_k]

# --------------------------------------------------
# Main search
# --------------------------------------------------

def search_chunks(query, chunks, top_k=5):

    if not chunks:
        return []

    # --------------------------------------------------
    # 1. Semantic search
    # --------------------------------------------------

    query_embedding = embed_text(query)

    semantic_scores = []

    for chunk in chunks:

        score = cosine_similarity(
            query_embedding,
            chunk["embedding"]
        )

        semantic_scores.append(
            float(score)
        )

    # --------------------------------------------------
    # 2. BM25 search
    # --------------------------------------------------

    bm25 = build_bm25_index(chunks)

    bm25_results = bm25_search(
        query,
        chunks,
        bm25
    )

    bm25_scores = [
        result["score"]
        for result in bm25_results
    ]

    # --------------------------------------------------
    # 3. Keyword matching
    # --------------------------------------------------

    keyword_scores = []

    for chunk in chunks:

        score = keyword_score(
            query,
            chunk["content"]
        )

        keyword_scores.append(
            float(score)
        )

    # --------------------------------------------------
    # 4. Normalize scores
    # --------------------------------------------------

    normalized_semantic = min_max_normalize(
        semantic_scores
    )

    normalized_bm25 = min_max_normalize(
        bm25_scores
    )

    normalized_keyword = min_max_normalize(
        keyword_scores
    )

    # --------------------------------------------------
    # 5. Hybrid score
    # --------------------------------------------------

    results = []

    for index, chunk in enumerate(chunks):

        hybrid_score = (
            0.7 * normalized_semantic[index]
            + 0.2 * normalized_bm25[index]
            + 0.1 * normalized_keyword[index]
        )

        results.append({
            "chunk_id": chunk["chunk_id"],
            "section_title": chunk["section_title"],
            "page_start": chunk["page_start"],
            "page_end": chunk["page_end"],
            "content": chunk["content"],
            "semantic_score": semantic_scores[index],
            "bm25_score": bm25_scores[index],
            "keyword_score": keyword_scores[index],
            "score": float(hybrid_score)
        })

    # --------------------------------------------------
    # 6. Rank by relevance
    # --------------------------------------------------

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    # --------------------------------------------------
    # 7. Filter weak sources
    # --------------------------------------------------

    results = filter_sources(
        results,
        top_k=top_k,
        relative_threshold=0.90
    )

    # --------------------------------------------------
    # 8. Assign source IDs
    # --------------------------------------------------

    for index, result in enumerate(
        results,
        start=1
    ):
        result["source_id"] = index

    return results