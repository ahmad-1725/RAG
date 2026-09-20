from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def embed_text(text: str):
    """
    Convert text into a numerical embedding vector.
    """

    return model.encode(
        text,
        normalize_embeddings=True
    ).tolist()


def embed_chunks(chunks):
    """
    Generate embeddings for all document chunks.
    """

    texts = [chunk["content"] for chunk in chunks]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True
    )

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding.tolist()

    return chunks