from fastapi import FastAPI
from app.documents import router as documents_router


app = FastAPI(
    title="Document AI",
    description="AI-powered document exploration and search platform",
    version="0.1.0"
)


app.include_router(documents_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Document AI API is running"
    }