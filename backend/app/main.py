from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import jobs, intel, chat

app = FastAPI(
    title="JobTrack AI API",
    description="校招通后端 API — 投递追踪 × AI 情报引擎",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(intel.router, prefix="/api/intel", tags=["intel"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


# Vercel serverless handler
from fastapi import FastAPI
from fastapi.responses import JSONResponse

handler = app  # For Vercel
