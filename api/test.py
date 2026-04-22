#!/usr/bin/env python3
"""测试端点 - Minimal"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/test")
async def test():
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok"}