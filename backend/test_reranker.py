import json

from app.reranker import rerank_chunks


DOCUMENT_ID = "2bc50abc-17ee-4fcd-b642-52b2d9516139"


with open(
    f"data/extracted/{DOCUMENT_ID}.json",
    "r",
    encoding="utf-8"
) as f:
    document = json.load(f)


chunks = document["chunks"]


query = "What language is used for Android development?"


results = rerank_chunks(
    query,
    chunks,
    top_k=5
)


for result in results:
    print("=" * 60)
    print("SOURCE:", result["source_id"])
    print("CHUNK:", result["chunk_id"])
    print("SECTION:", result["section_title"])
    print("RERANK SCORE:", result["rerank_score"])
    print("CONTENT:")
    print(result["content"])