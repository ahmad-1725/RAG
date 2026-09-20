import json

from app.search import search_chunks


with open(
    "data/extracted/2bc50abc-17ee-4fcd-b642-52b2d9516139.json",
    "r",
    encoding="utf-8"
) as f:

    document = json.load(f)


chunks = document["chunks"]


query = "Why are mobile applications developed?"

results = search_chunks(
    query,
    chunks,
    top_k=5
)


for result in results:

    print("\n-------------------------")

    print(
        f"Score: {result['score']:.4f}"
    )

    print(
        f"Section: {result['section_title']}"
    )

    print(
        f"Pages: {result['page_start']}-{result['page_end']}"
    )

    print(
        f"Content:\n{result['content']}"
    )