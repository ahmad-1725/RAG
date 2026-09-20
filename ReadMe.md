Running the Project Locally
1. Install frontend dependencies
cd frontend
npm install

2. Activate the Python virtual environment

From the project root:

cd backend
.\venv\Scripts\Activate.ps1

3. Run the backend

While the virtual environment is activated:

uvicorn app.main:app --reload


The backend will start on:

http://127.0.0.1:8000

4. Run the frontend

Open a new terminal and from the project root run:

cd frontend
npm run dev


The frontend will be available at the URL shown by Vite, typically:

http://localhost:5173

Quick Start

You need two terminals.

Terminal 1 — Backend:

cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload


Terminal 2 — Frontend:

cd frontend
npm install
npm run dev
