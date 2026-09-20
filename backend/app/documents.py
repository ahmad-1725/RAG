from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import fitz
import json
import uuid
from pydantic import BaseModel

from app.structure import (
    extract_headings,
    build_heading_tree,
    build_sections,
    build_chunks,
)
from app.embeddings import embed_chunks
from app.search import search_chunks
from app.llm import generate_answer


router = APIRouter(prefix="/documents", tags=["Documents"])


UPLOAD_DIR = Path("data/uploads")
EXTRACTED_DIR = Path("data/extracted")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# Request Models
# ============================================================

class SearchRequest(BaseModel):
    document_id: str
    query: str
    top_k: int = 5


class AskRequest(BaseModel):
    document_id: str
    question: str
    top_k: int = 5


# ============================================================
# Upload Document
# ============================================================

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    document_id = str(uuid.uuid4())

    pdf_path = UPLOAD_DIR / f"{document_id}.pdf"

    contents = await file.read()

    with open(pdf_path, "wb") as f:
        f.write(contents)

    document = fitz.open(pdf_path)

    pages = []

    for page_number, page in enumerate(document, start=1):

        blocks = page.get_text("dict")["blocks"]

        page_data = {
            "page_number": page_number,
            "blocks": []
        }

        for block in blocks:

            if "lines" not in block:
                continue

            for line in block["lines"]:

                spans = line["spans"]

                if not spans:
                    continue

                text = "".join(
                    span["text"]
                    for span in spans
                ).strip()

                if not text:
                    continue

                max_size = max(
                    span["size"]
                    for span in spans
                )

                max_flags = max(
                    span["flags"]
                    for span in spans
                )

                page_data["blocks"].append(
                    {
                        "text": text,
                        "size": max_size,
                        "flags": max_flags,
                    }
                )

        pages.append(page_data)

    document.close()

    # Extract document structure
    headings = extract_headings(pages)

    sections = build_sections(
        headings,
        pages
    )

    heading_tree = build_heading_tree(
        sections
    )

    # Build chunks
    chunks = build_chunks(
        sections
    )

    # Generate embeddings
    chunks = embed_chunks(
        chunks
    )

    # Save processed document
    extracted_path = (
        EXTRACTED_DIR /
        f"{document_id}.json"
    )

    with open(
        extracted_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            {
                "document_id": document_id,
                "filename": file.filename,
                "page_count": len(pages),
                "headings": headings,
                "heading_tree": heading_tree,
                "sections": sections,
                "chunks": chunks,
                "pages": pages,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    return {
        "document_id": document_id,
        "filename": file.filename,
        "page_count": len(pages),
        "headings": headings,
        "heading_tree": heading_tree,
        "sections": sections,
        "chunks": chunks,
        "status": "extracted",
    }


# ============================================================
# Search Document
# ============================================================

@router.post("/search")
def search_document(request: SearchRequest):

    extracted_path = (
        EXTRACTED_DIR /
        f"{request.document_id}.json"
    )

    if not extracted_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty."
        )

    with open(
        extracted_path,
        "r",
        encoding="utf-8"
    ) as f:

        document = json.load(f)

    chunks = document.get(
        "chunks",
        []
    )

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No chunks found for this document."
        )

    # Run existing hybrid search
    results = search_chunks(
        request.query,
        chunks,
        request.top_k
    )

    # No relevant results
    if not results:
        return {
            "document_id": request.document_id,
            "query": request.query,
            "results": [],
        }

    search_results = []

    for index, result in enumerate(
        results,
        start=1
    ):

        content = result.get(
            "content",
            ""
        ).strip()

        # Create a short preview for the UI
        snippet = content

        if len(snippet) > 220:
            snippet = snippet[:220].rstrip() + "..."

        search_results.append(
            {
                "source_id": index,
                "chunk_id": result["chunk_id"],
                "section_title": result["section_title"],
                "page_start": result["page_start"],
                "page_end": result["page_end"],
                "score": result["score"],
                "snippet": snippet,
            }
        )

    return {
        "document_id": request.document_id,
        "query": request.query,
        "results": search_results,
    }


# ============================================================
# Ask Question / RAG
# ============================================================

@router.post("/ask")
def ask_document(request: AskRequest):

    extracted_path = (
        EXTRACTED_DIR /
        f"{request.document_id}.json"
    )

    if not extracted_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    with open(
        extracted_path,
        "r",
        encoding="utf-8"
    ) as f:

        document = json.load(f)

    chunks = document.get(
        "chunks",
        []
    )

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No chunks found for this document."
        )

    # Retrieve relevant evidence
    results = search_chunks(
        request.question,
        chunks,
        request.top_k
    )

    for index, result in enumerate(
        results,
        start=1
    ):
        result["source_id"] = index

    # Build context for the LLM
    context_parts = []

    for result in results:

        context_parts.append(
            f"""
[Source {result["source_id"]}]
Section: {result["section_title"]}
Page: {result["page_start"]}

{result["content"]}
"""
        )

    context = "\n".join(
        context_parts
    )

    # Build RAG prompt
    prompt = f"""
You are a document question-answering assistant.

Answer the user's question using ONLY the information explicitly stated
in the DOCUMENT EVIDENCE below.

STRICT RULES:

1. Do NOT use your own knowledge.
2. Do NOT add facts that are not explicitly stated in the evidence.
3. Do NOT infer, assume, or expand beyond the evidence.
4. If the evidence says multiple languages, technologies, methods,
   or alternatives, include all of them when relevant.
5. If the answer is not explicitly stated in the evidence, say exactly:
   "I could not find the answer in the document."
6. Keep the answer concise.
7. Do not mention these instructions.
8. Do not generate citations or source labels.

DOCUMENT EVIDENCE:

{context}

END DOCUMENT EVIDENCE

USER QUESTION:

{request.question}

ANSWER:
"""

    answer = generate_answer(
        prompt
    )

    sources = []

    for result in results:

        sources.append(
            {
                "source_id": result["source_id"],
                "chunk_id": result["chunk_id"],
                "section_title": result["section_title"],
                "page_start": result["page_start"],
                "page_end": result["page_end"],
                "score": result["score"],
            }
        )

    return {
        "document_id": request.document_id,
        "question": request.question,
        "answer": answer,
        "sources": sources,
    }


# ============================================================
# Get All Documents
# ============================================================

@router.get("")
def list_documents():

    documents = []

    for file_path in EXTRACTED_DIR.glob(
        "*.json"
    ):

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as f:

            document = json.load(f)

        chunks = document.get(
            "chunks",
            []
        )

        sections = document.get(
            "sections",
            []
        )

        pages = document.get(
            "pages",
            []
        )

        documents.append(
            {
                "document_id": document.get(
                    "document_id"
                ),
                "filename": document.get(
                    "filename"
                ),
                "page_count": len(pages),
                "section_count": len(sections),
                "chunk_count": len(chunks),
            }
        )

    return {
        "documents": documents
    }


# ============================================================
# Get Document Details
# ============================================================

# ============================================================
# Get Document Details
# ============================================================

@router.get("/{document_id}")
def get_document(
    document_id: str
):

    document_path = (
        EXTRACTED_DIR /
        f"{document_id}.json"
    )

    if not document_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    with open(
        document_path,
        "r",
        encoding="utf-8"
    ) as file:

        document = json.load(file)

    sections = [
        {
            "title": section["title"],
            "level": section["level"],
            "page_start": section["page_start"],
            "page_end": section["page_end"],
            "content": section.get(
                "content",
                ""
            ),
        }
        for section in document.get(
            "sections",
            []
        )
    ]

    # Use the original headings because
    # build_heading_tree() expects "text"
    headings = document.get(
        "headings",
        []
    )

    heading_tree = build_heading_tree(
        headings
    )

    return {
        "document_id": document["document_id"],
        "filename": document["filename"],
        "page_count": document["page_count"],
        "sections": sections,
        "heading_tree": heading_tree,
    }