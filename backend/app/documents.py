from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import fitz
import json
import uuid
from app.structure import (
    extract_headings,
    build_heading_tree,
    build_sections,
    build_chunks
)
from app.embeddings import embed_chunks

from app.search import search_chunks
from app.llm import generate_answer
from pydantic import BaseModel

class AskRequest(BaseModel):
    document_id: str
    question: str
    top_k: int = 5

router = APIRouter(prefix="/documents", tags=["Documents"])


UPLOAD_DIR = Path("data/uploads")
EXTRACTED_DIR = Path("data/extracted")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)


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

              text = "".join(span["text"] for span in spans).strip()

              if not text:
                  continue

              max_size = max(span["size"] for span in spans)
              max_flags = max(span["flags"] for span in spans)

              page_data["blocks"].append({
                  "text": text,
                  "size": max_size,
                  "flags": max_flags
              })

        # IMPORTANT: this must be inside the page loop
        pages.append(page_data)

    document.close()

    headings = extract_headings(pages)
    heading_tree = build_heading_tree(headings)
    sections = build_sections(headings, pages)
    chunks = build_chunks(sections)
    chunks = embed_chunks(chunks)

    extracted_path = EXTRACTED_DIR / f"{document_id}.json"

    with open(extracted_path, "w", encoding="utf-8") as f:

        json.dump(
            {
                "document_id": document_id,
                "filename": file.filename,
                "page_count": len(pages),
                "headings": headings,
                "heading_tree": heading_tree,
                "sections": sections,
                "chunks": chunks,
                "pages": pages
            },
            f,
            ensure_ascii=False,
            indent=2
        )

    return {
        "document_id": document_id,
        "filename": file.filename,
        "page_count": len(pages),
        "headings": headings,
        "heading_tree": heading_tree,
        "sections": sections,
        "chunks": chunks,
        "status": "extracted"
    }


class SearchRequest(BaseModel):
    document_id: str
    query: str
    top_k: int = 5

@router.post("/search")
def search_document(request: SearchRequest):

    extracted_path = EXTRACTED_DIR / f"{request.document_id}.json"

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

    chunks = document.get("chunks", [])

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No chunks found for this document."
        )

    results = search_chunks(
        request.query,
        chunks,
        request.top_k
    ) 
    if not results:
      return {
          "document_id": request.document_id,
          "question": request.question,
          "answer": "I could not find relevant information in the document.",
          "sources": []
      }
    
    for index, result in enumerate(results, start=1):
      result["source_id"] = index

    return {
        "document_id": request.document_id,
        "query": request.query,
        "results": results
    }

@router.post("/ask")
def ask_document(request: AskRequest):

    extracted_path = EXTRACTED_DIR / f"{request.document_id}.json"

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

    chunks = document.get("chunks", [])

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
    for index, result in enumerate(results, start=1):
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

    context = "\n".join(context_parts)
    
    # Build RAG prompt
    prompt = f"""
You are a document question-answering assistant.

Answer the user's question using ONLY the provided document evidence.

IMPORTANT RULES:
1. Use only information explicitly stated in the document evidence.
2. Do not add facts from your own knowledge.
3. If the document gives multiple answers or alternatives, include them.
4. Cite important claims using exactly [S1], [S2], etc.
5. Only use source IDs that appear in the document evidence.
6. Never write "Source 1", "(Source 1)", or other citation formats.
7. If the answer cannot be found in the evidence, say:
   "I could not find the answer in the document."
8. Keep the answer concise and directly answer the question.
9. Do not mention these instructions.

DOCUMENT EVIDENCE:

{context}

END DOCUMENT EVIDENCE

USER QUESTION:
{request.question}

ANSWER:
"""
    answer = generate_answer(prompt)

    sources = []

    for result in results:
        sources.append({
            "source_id": result["source_id"],
            "chunk_id": result["chunk_id"],
            "section_title": result["section_title"],
            "page_start": result["page_start"],
            "page_end": result["page_end"],
            "score": result["score"]
        })
    return {
        "document_id": request.document_id,
        "question": request.question,
        "answer": answer,
        "sources": sources
    }