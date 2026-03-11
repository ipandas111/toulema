import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str
    search_type: str = "general"
    max_results: int = 8


# Tavily search
def search_with_tavily(query: str, search_type: str = "general", max_results: int = 10) -> List[Dict]:
    try:
        from tavily import TavilyClient
        api_key = os.environ.get("TAVILY_API_KEY", "")
        if not api_key:
            return [{
                "platform": "ai_summary",
                "platformIcon": "⚠️",
                "title": "服务未配置",
                "content": "请在环境变量中配置 TAVILY_API_KEY",
                "url": "",
                "likes": 0,
                "comments": 0,
                "is_ai_summary": True
            }]

        client = TavilyClient(api_key=api_key)

        # Build query based on type
        type_suffixes = {
            "experience": "面经 面试经验 知乎 牛客",
            "jd": "JD 职位描述 招聘要求",
            "growth": "发展路径 晋升 薪资涨幅 成长",
            "company": "公司评价 口碑 工作体验 知乎"
        }
        suffix = type_suffixes.get(search_type, "")
        enhanced_query = f"{query} {suffix}" if suffix else query

        results = client.search(
            query=enhanced_query,
            max_results=max_results,
            include_answer=True,
            include_raw_content=False,
            include_images=False
        )

        formatted = []

        # AI Summary
        if results.get("answer"):
            formatted.append({
                "platform": "ai_summary",
                "platformIcon": "🤖",
                "title": "AI 智能摘要",
                "content": results["answer"],
                "url": "",
                "likes": 0,
                "comments": 0,
                "is_ai_summary": True
            })

        # Results
        for item in results.get("results", []):
            url = item.get("url", "")
            platform = "web"
            icon = "🌐"

            url_lower = url.lower()
            if "xiaohongshu.com" in url_lower:
                platform, icon = "xiaohongshu", "📕"
            elif "zhihu.com" in url_lower:
                platform, icon = "zhihu", "🟦"
            elif "nowcoder.com" in url_lower or "niuke" in url_lower:
                platform, icon = "niuke", "🐂"
            elif "liepin.com" in url_lower:
                platform, icon = "liepin", "💼"
            elif "zhipin.com" in url_lower or "boss" in url_lower:
                platform, icon = "boss", "👔"

            content = item.get("content", "")
            if len(content) > 200:
                content = content[:200] + "..."

            formatted.append({
                "platform": platform,
                "platformIcon": icon,
                "title": item.get("title", ""),
                "content": content,
                "url": url,
                "likes": 0,
                "comments": 0
            })

        return formatted

    except Exception as e:
        print(f"Search error: {e}")
        return [{
            "platform": "ai_summary",
            "platformIcon": "⚠️",
            "title": "搜索出错",
            "content": str(e),
            "url": "",
            "likes": 0,
            "comments": 0,
            "is_ai_summary": True
        }]


@app.post("/api/search")
async def search(request: SearchRequest):
    results = search_with_tavily(
        query=request.query,
        search_type=request.search_type,
        max_results=request.max_results
    )
    return {"results": results, "query": request.query, "search_type": request.search_type}


@app.get("/api/search")
async def search_get(q: str = "", search_type: str = "general", max_results: int = 8):
    if not q:
        return {"results": [], "query": "", "search_type": search_type}
    results = search_with_tavily(
        query=q,
        search_type=search_type,
        max_results=max_results
    )
    return {"results": results, "query": q, "search_type": search_type}


@app.get("/health")
def health():
    return {"status": "ok"}
