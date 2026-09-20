import json

from app.search import search_chunks
from app.reranker import model


DOCUMENT_ID = "2bc50abc-17ee-4fcd-b642-52b2d9516139"

QUERY = "What language is used for Android development?"


with open(
    f"data/extracted/{DOCUMENT_ID}.json",
    "r",
    encoding="utf-8"
) as f:
    document = json.load(f)


chunks = document["chunks"]


# Get the 5 candidates from hybrid retrieval
candidates = search_chunks(
    QUERY,
    chunks,
    top_k=5
)


pairs = [
    [QUERY, chunk["content"]]
    for chunk in candidates
]


scores = model.predict(pairs)


results = []

for chunk, score in zip(candidates, scores):
    results.append({
        "chunk_id": chunk["chunk_id"],
        "section": chunk["section_title"],
        "hybrid_score": chunk["score"],
        "rerank_score": float(score),
        "content": chunk["content"]
    })


results.sort(
    key=lambda x: x["rerank_score"],
    reverse=True
)


print("\n" + "=" * 70)
print("HYBRID CANDIDATES → RERANKER")
print("=" * 70)

for index, result in enumerate(results, start=1):
    print("\n" + "-" * 70)
    print(f"RANK: {index}")
    print(f"CHUNK: {result['chunk_id']}")
    print(f"SECTION: {result['section']}")
    print(f"HYBRID SCORE: {result['hybrid_score']:.6f}")
    print(f"RERANK SCORE: {result['rerank_score']:.6f}")
    print("CONTENT:")
    print(result["content"])