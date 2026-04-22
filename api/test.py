#!/usr/bin/env python3
"""测试端点 - Minimal FastAPI"""
from fastapi import FastAPI, Response
import json

app = FastAPI()

@app.get("/api/test")
async def test():
    return {"status": "ok", "message": "Python API is working!"}

@app.get("/health")
async def health():
    return {"status": "ok"}