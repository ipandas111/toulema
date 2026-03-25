#!/usr/bin/env python3
"""
检索 API
向量检索 + 关键词过滤 + SerpAPI 兜底
"""

import os
import json
import httpx
from fastapi import FastAPI, Response
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

# Supabase 配置
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# MiniMax API
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY") or os.getenv("MINIMAX_TEXT_KEY")
MINIMAX_BASE_URL = "https://api.minimax.chat/v1"

# SerpAPI（兜底搜索）
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")

# 相似度阈值
SIMILARITY_THRESHOLD = 0.7

# 向量维度
EMBEDDING_DIM = 1024


def get_embedding(text: str, api_key: str) -> list[float]:
    """获取文本 embedding"""
    if not api_key:
        return [0.0] * EMBEDDING_DIM

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "embo01",
        "texts": [text[:4000]]
    }

    try:
        resp = httpx.post(
            f"{MINIMAX_BASE_URL}/embeddings",
            headers=headers,
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()
        embedding = result.get("data", [{}])[0].get("embedding", [])
        if len(embedding) == EMBEDDING_DIM:
            return embedding
        return [0.0] * EMBEDDING_DIM
    except Exception as e:
        print(f"Embedding error: {e}")
        return [0.0] * EMBEDDING_DIM


def vector_search(
    query_embedding: list[float],
    company: str = None,
    top_k: int = 20
) -> list[dict]:
    """向量检索"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase not configured")
        return []

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # 构建查询
        query = supabase.rpc(
            "search_experiences",
            {
                "query_embedding": query_embedding,
                "top_k": top_k,
                "company_filter": company if company else None
            }
        ).execute()

        results = []
        for row in query.data or []:
            results.append({
                "id": row["id"],
                "source": row["source"],
                "company": row["company"],
                "position": row["position"],
                "content": row["cleaned_content"][:500] if row.get("cleaned_content") else "",
                "quality_score": row.get("quality_score", 0.5),
                "similarity": row.get("similarity", 0.0),
                "source_url": f"https://www.nowcoder.com/discuss/{row['id']}" if row.get("source") == "niuke" else ""
            })

        return results

    except Exception as e:
        print(f"Vector search error: {e}")
        return []


def serpapi_search(query: str, num_results: int = 5) -> list[dict]:
    """SerpAPI 实时搜索（兜底）"""
    if not SERPAPI_KEY:
        print("SERPAPI_KEY not configured, using fallback")
        return serpapi_fallback(query, num_results)

    try:
        params = {
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": num_results,
            "engine": "google"
        }
        resp = httpx.get("https://serpapi.com/search", params=params, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        results = []
        for item in result.get("organic_results", [])[:num_results]:
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", ""),
                "source": "web"
            })
        return results

    except Exception as e:
        print(f"SerpAPI error: {e}")
        return serpapi_fallback(query, num_results)


def serpapi_fallback(query: str, num_results: int = 5) -> list[dict]:
    """SerpAPI 不可用时的兜底（直接用 DuckDuckGo）"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        params = {
            "q": query,
            "kl": "cn-zh"  # 中文结果
        }
        resp = httpx.get(
            "https://duckduckgo.com/html/",
            params=params,
            headers=headers,
            timeout=30
        )

        results = []
        # 简单解析 HTML（实际生产应该用 BeautifulSoup）
        import re
        titles = re.findall(r'<a class="result__a" href="([^"]+)">([^<]+)</a>', resp.text)
        snippets = re.findall(r'<a class="result__snippet"[^>]*>([^<]+)</a>', resp.text)

        for i, (url, title) in enumerate(titles[:num_results]):
            snippet = snippets[i] if i < len(snippets) else ""
            results.append({
                "title": title,
                "snippet": snippet,
                "url": url,
                "source": "duckduckgo"
            })

        return results

    except Exception as e:
        print(f"Fallback search error: {e}")
        return []


class SearchRequest(BaseModel):
    query: str
    intent: str = "experience"
    company: str = None
    position: str = None
    use_serpapi: bool = False


@app.api_route("/api/search", methods=["GET", "POST"])
async def search(request):
    """检索接口"""
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        query = query_params.get("q", [""])[0]
        intent = query_params.get("intent", ["experience"])[0]
        company = query_params.get("company", [None])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            query = data.get("query", "")
            intent = data.get("intent", "experience")
            company = data.get("company", "")
            position = data.get("position", "")
        except:
            query = ""
            intent = "experience"
            company = None
            position = None

    if not query:
        return Response(
            content=json.dumps({"error": "Empty query"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 构建搜索关键词
    search_query = query
    if company:
        search_query = f"{company} {position or ''} {query}".strip()

    # 1. 获取 embedding
    embedding = get_embedding(search_query, MINIMAX_API_KEY)

    # 2. 向量检索 top20
    vector_results = vector_search(embedding, company, top_k=20)

    # 3. 计算是否需要 SerpAPI 兜底
    avg_similarity = sum(r.get("similarity", 0) for r in vector_results) / max(len(vector_results), 1)
    needs_fallback = avg_similarity < SIMILARITY_THRESHOLD or len(vector_results) < 3

    # 4. 如果需要兜底，触发 SerpAPI
    serp_results = []
    if needs_fallback or intent == "jd_analysis":
        serp_results = serpapi_search(search_query, num_results=5)

    # 5. 构建响应
    response = {
        "query": query,
        "intent": intent,
        "vector_results": vector_results,
        "serp_results": serp_results if serp_results else None,
        "used_fallback": len(serp_results) > 0,
        "avg_similarity": round(avg_similarity, 3),
        "needs_fallback": needs_fallback,
        "total_results": len(vector_results)
    }

    return Response(
        content=json.dumps(response, ensure_ascii=False),
        media_type="application/json"
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "search"}
