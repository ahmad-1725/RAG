from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def build_embedding_text(chunk):
    return (
        f"Section: {chunk['section_title']}\n\n"
        f"{chunk['content']}"
    )


def embed_text(text: str):
    return model.encode(
        text,
        normalize_embeddings=True
    ).tolist()


def embed_chunks(chunks):
    texts = [
        build_embedding_text(chunk)
        for chunk in chunks
    ]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True
    )

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding.tolist()

    return chunks