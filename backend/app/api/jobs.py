"""
Job CRUD endpoints
GET    /api/jobs          — list all jobs
POST   /api/jobs          — create job (triggers intel gathering)
GET    /api/jobs/{id}     — get single job
PUT    /api/jobs/{id}     — update job (status, fields)
DELETE /api/jobs/{id}     — delete job
"""
from fastapi import APIRouter

router = APIRouter()

# TODO: implement endpoints
