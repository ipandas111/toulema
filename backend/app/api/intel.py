"""
Intel engine endpoints
GET  /api/intel/{job_id}/status  — polling: pending / running / done
POST /api/intel/{job_id}/refresh — manually re-trigger search
GET  /api/intel/{job_id}/sources — list scored sources
POST /api/search — 搜索接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.search import get_search_service

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    search_type: str = "experience"  # experience, jd, growth, company
    max_results: int = 10


class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    query: str
    search_type: str


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """搜索接口 - 调用 Tavily"""
    try:
        service = get_search_service()
        results = service.search(
            query=request.query,
            search_type=request.search_type,
            max_results=request.max_results
        )
        return SearchResponse(
            results=results,
            query=request.query,
            search_type=request.search_type
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# 现有的占位符路由
@router.get("/status")
async def get_status():
    return {"status": "ok"}
