RAG Document Assistant

A full-stack document question-answering application that allows users to upload and explore documents, navigate extracted sections, and ask questions based on the document's content.

Features

📄 Document processing and text extraction

🗂️ Structured document sections and table of contents

🔎 Navigate directly to document sections

🤖 Ask questions about a document using the AI assistant

📚 View sources used to generate answers

🎨 Responsive React frontend

⚡ FastAPI backend with automatic reload during development

Project Structure
RAG/
├── backend/
│   ├── app/
│   │   └── ...
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md

Tech Stack
Frontend

React

React Router

Axios

Vite

Backend

Python

FastAPI

Uvicorn

Prerequisites

Make sure you have the following installed:

Python 3.x

Node.js

npm

Git

Installation
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd RAG

2. Install Python dependencies

Navigate to the backend:

cd backend


If you already have a virtual environment, activate it:

.\venv\Scripts\Activate.ps1


Install the required Python packages:

pip install -r requirements.txt

3. Install frontend dependencies

Open a new terminal and navigate to the frontend:

cd frontend
npm install

Running the Application

The backend and frontend should be run in separate terminals.

Backend

From the project root:

cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload


The backend will run at:

http://127.0.0.1:8000

Frontend

Open a second terminal:

cd frontend
npm run dev


Vite will display the frontend URL in the terminal. It is typically:

http://localhost:5173

Development Workflow

A typical development setup requires two running processes:

Terminal 1 — Backend

cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload


Terminal 2 — Frontend

cd frontend
npm run dev


Once both are running, open the frontend URL provided by Vite in your browser.

Environment Variables

If the project requires environment variables, create a .env file in the appropriate directory.

For example:

API_KEY=your_api_key_here


Do not commit .env files or API keys to GitHub.

Make sure sensitive files are included in .gitignore.

Git

The repository uses the root directory as the Git repository.

The backend and frontend directories should not contain their own .git directories.

Check the repository status with:

git status


Add changes:

git add .


Commit:

git commit -m "Describe your changes"


Push:

git push

API

The frontend communicates with the FastAPI backend running locally at:

http://127.0.0.1:8000


The document-related API endpoints are used by the frontend for retrieving documents and asking questions.

Notes

This project is intended for local development. Make sure the backend is running before using features that require API access.
