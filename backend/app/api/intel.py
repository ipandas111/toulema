"""
Intel engine endpoints
GET  /api/intel/{job_id}/status  — polling: pending / running / done
POST /api/intel/{job_id}/refresh — manually re-trigger search
GET  /api/intel/{job_id}/sources — list scored sources
"""
from fastapi import APIRouter

router = APIRouter()

# TODO: implement endpoints
