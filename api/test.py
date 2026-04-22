#!/usr/bin/env python3
"""测试端点 - Vercel Python"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def test():
    return {"status": "ok", "message": "Python API working!"}

@app.get("/health")
async def health():
    return {"status": "ok"}