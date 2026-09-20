# RAG Document Assistant

A full-stack **AI-powered document intelligence and question-answering application** that allows users to upload PDF documents, explore their structure, search document content, and ask questions using Retrieval-Augmented Generation (RAG).

The project combines document structure extraction, semantic search, hybrid retrieval, vector embeddings, and a local LLM to provide context-aware answers with document sources.

## Features

* 📄 Upload and process PDF documents
* 📝 Extract document text and structure
* 🗂️ Automatically detect headings and sections
* 📑 Generate an interactive table of contents
* 🔎 Search document content using hybrid retrieval
* 🧠 Generate vector embeddings for document chunks
* 🤖 Ask questions about uploaded documents
* 📚 Display sources used to generate answers
* 📍 Navigate directly to relevant document sections
* 💬 Local LLM-powered question answering
* 🎨 Responsive React frontend
* ⚡ FastAPI backend with automatic reload during development

## Architecture

```text
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │                     │
                    │ Upload / Search /   │
                    │ Explore / Q&A       │
                    └──────────┬──────────┘
                               │
                               │ HTTP / REST
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Backend  │
                    │                     │
                    │ PDF Processing      │
                    │ Structure Extraction│
                    │ Chunking            │
                    │ Embeddings          │
                    │ Retrieval           │
                    │ RAG Pipeline        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌──────────────────┐   ┌──────────────────┐
          │ PostgreSQL +     │   │ Local LLM        │
          │ pgvector         │   │ Qwen             │
          │                  │   │                  │
          │ Documents        │   │ Answer Generation│
          │ Sections         │   │                  │
          │ Chunks           │   └──────────────────┘
          │ Embeddings       │
          └──────────────────┘
```

## RAG Pipeline

When a user asks a question about a document, the system follows this general pipeline:

```text
User Question
      │
      ▼
Query Embedding
      │
      ▼
Document Retrieval
      │
      ├── Semantic Search
      ├── Keyword Search
      └── BM25 Search
      │
      ▼
Relevant Document Chunks
      │
      ▼
Context Construction
      │
      ▼
Local LLM
      │
      ▼
Generated Answer
      │
      ▼
Sources / Document References
```

## Project Structure

```text
RAG/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── documents.py
│   │   ├── structure.py
│   │   ├── embeddings.py
│   │   ├── search.py
│   │   └── llm.py
│   │
│   ├── data/
│   │   ├── uploads/
│   │   └── extracted/
│   │
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── DocumentViewer.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

## Tech Stack

### Frontend

* React
* React Router
* Axios
* Vite
* JavaScript

### Backend

* Python
* FastAPI
* Uvicorn
* PyMuPDF
* Sentence Transformers
* NumPy
* Rank-BM25

### AI / RAG

* Retrieval-Augmented Generation (RAG)
* `all-MiniLM-L6-v2` for embeddings
* Qwen3 1.7B
* Ollama
* Semantic search
* BM25 keyword retrieval
* Hybrid retrieval

### Database

* PostgreSQL
* pgvector

> PostgreSQL + pgvector is used for persistent document data and vector storage.

## Prerequisites

Make sure the following are installed:

* Python 3.11+
* Node.js
* npm
* Git
* PostgreSQL
* pgvector
* Ollama

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd RAG
```

### 2. Set up the backend

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment if you do not already have one:

```powershell
python -m venv venv
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the Python dependencies:

```powershell
pip install -r requirements.txt
```

### 3. Set up PostgreSQL

Create a PostgreSQL database for the application.

For example:

```sql
CREATE DATABASE rag_document_assistant;
```

Connect to the database and enable pgvector:

```sql
CREATE EXTENSION vector;
```

The database will be used to store:

* Documents
* Sections
* Chunks
* Vector embeddings
* Document metadata

### 4. Set up Ollama

Install Ollama and make sure the local Ollama server is running.

Pull the required model:

```powershell
ollama pull qwen3:1.7b
```

Verify that the model is available:

```powershell
ollama list
```

## Running the Application

The backend and frontend should be run in **separate terminals**.

### Backend

From the project root:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI's interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite will display the frontend URL in the terminal.

Typically:

```text
http://localhost:5173
```

## Development Workflow

A typical development setup requires two running processes.

### Terminal 1 — Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Once both processes are running, open the frontend URL provided by Vite.

## Document Processing

When a PDF is uploaded, the backend processes it through several stages:

```text
PDF Upload
    │
    ▼
Text Extraction
    │
    ▼
Heading Detection
    │
    ▼
Section Construction
    │
    ▼
Document Chunking
    │
    ▼
Vector Embeddings
    │
    ▼
PostgreSQL + pgvector
```
```
Question
   │
   ▼
Retrieve Relevant Chunks
   │
   ▼
Build Context
   │
   ▼
Qwen3
   │
   ▼
Answer
   │
   ▼
Display Answer + Sources
```

The goal is to keep generated answers grounded in the uploaded document rather than relying solely on the model's general knowledge.


## Notes

This project is primarily intended for local development.

The backend must be running before using frontend features that communicate with the API.

The LLM runs locally through Ollama, so an external LLM API is not required for the current setup.

---
