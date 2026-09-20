from sentence_transformers import CrossEncoder


MODEL_NAME = "BAAI/bge-reranker-base"

model = CrossEncoder(MODEL_NAME)


def rerank_chunks(query, chunks, top_k=5):
    if not chunks:
        return []

    pairs = [
        [query, chunk["content"]]
        for chunk in chunks
    ]

    scores = model.predict(pairs)

    results = []

    for chunk, score in zip(chunks, scores):
        result = chunk.copy()
        result["rerank_score"] = float(score)

        results.append(result)

    results.sort(
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    return results[:top_k]