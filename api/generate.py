#!/usr/bin/env python3
"""
生成 API
Claude Sonnet 4.6 生成结构化建议
"""

import os
import json
import httpx
from fastapi import FastAPI, Response, Request
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

# Claude API
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# SerpAPI
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")


SYSTEM_PROMPT = """你是一个专业的求职顾问，擅长基于真实面经为用户提供有价值的建议。

【核心原则】
1. 只基于提供的面经内容回答，不要编造
2. 每个建议必须标注来源（公司、平台）
3. 如果信息不足，明确说明"暂无相关信息"
4. 回答要结构化，使用 markdown 格式

【回答格式】
```
## 📋 面经总结
（基于 X 条真实面经）

### 一、面试流程
（描述典型的面试轮次）

### 二、常见面试题
（列出高频技术问题）

### 三、准备建议
（针对该岗位的备考策略）

### 四、公司/岗位评价
（来自在职员工/面试者的真实反馈）

---
来源：[公司] - [平台]，共 X 条面经
```
"""


def call_claude(
    query: str,
    context: dict,
    intent: str
) -> dict:
    """调用 Claude 生成回答"""
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    # 构建上下文
    context_text = ""
    sources = []

    # 添加向量检索结果
    vector_results = context.get("vector_results", [])
    if vector_results:
        context_text += "【面经资料】\n"
        for i, r in enumerate(vector_results[:5], 1):
            content = r.get("content", "")[:300]
            context_text += f"{i}. [{r.get('company', '某公司')}]({r.get('source', 'unknown')}): {content}...\n\n"
            sources.append({
                "company": r.get("company", ""),
                "source": r.get("source", ""),
                "url": r.get("source_url", "")
            })

    # 添加 SerpAPI 结果
    serp_results = context.get("serp_results", [])
    if serp_results:
        context_text += "\n【网络参考资料】\n"
        for i, r in enumerate(serp_results[:3], 1):
            context_text += f"{i}. {r.get('title', '')}: {r.get('snippet', '')[:200]}...\n"
            sources.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "source": "web"
            })

    if not context_text:
        context_text = "暂无相关面经资料，建议通过其他渠道了解。"

    # 构建 prompt
    user_prompt = f"""基于以下资料，回答用户的问题。

用户问题：{query}

{context_text}

请按要求格式回答。"""

    # 意图特定的补充要求
    intent_requirements = {
        "experience": "重点描述面试流程和常见面试题",
        "jd_analysis": "分析该职位的优劣势，给出投递建议",
        "company_review": "重点描述公司文化、待遇、员工评价",
        "chat": "友好地打招呼，说明你可以提供什么帮助",
        "other": "根据问题给出合理的求职建议"
    }

    user_prompt += f"\n\n【回答重点】{intent_requirements.get(intent, '')}"

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 2000,
        "temperature": 0.3,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": user_prompt}
        ]
    }

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=60
        )
        resp.raise_for_status()
        result = resp.json()

        return {
            "text": result.get("content", [{}])[0].get("text", ""),
            "sources": sources,
            "usage": result.get("usage", {})
        }

    except Exception as e:
        return {"error": str(e)}


class GenerateRequest(BaseModel):
    query: str
    intent: str = "experience"
    company: str = None
    position: str = None
    vector_results: list = []
    serp_results: list = []


@app.api_route("/api/generate", methods=["GET", "POST"])
async def generate(request: Request):
    """生成接口"""
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        query = query_params.get("q", [""])[0]
        intent = query_params.get("intent", ["experience"])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            query = data.get("query", "")
            intent = data.get("intent", "experience")
            vector_results = data.get("vector_results", [])
            serp_results = data.get("serp_results", [])
            company = data.get("company", "")
            position = data.get("position", "")
        except:
            query = ""
            intent = "experience"
            vector_results = []
            serp_results = []
            company = None
            position = None

    if not query:
        return Response(
            content=json.dumps({"error": "Empty query"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 构建上下文
    context = {
        "vector_results": vector_results,
        "serp_results": serp_results or []
    }

    # 调用 Claude
    result = call_claude(query, context, intent)

    if "error" in result:
        return Response(
            content=json.dumps({"error": result["error"]}, ensure_ascii=False),
            media_type="application/json"
        )

    # 构建响应
    response = {
        "query": query,
        "intent": intent,
        "intent_label": {"experience": "面经", "jd_analysis": "JD分析", "company_review": "公司评价", "chat": "闲聊", "other": "其他"}.get(intent, "其他"),
        "answer": result["text"],
        "sources": result.get("sources", []),
        "usage": result.get("usage", {})
    }

    return Response(
        content=json.dumps(response, ensure_ascii=False),
        media_type="application/json"
    )


@app.api_route("/api/chat", methods=["GET", "POST"])
async def chat(request: Request):
    """
    统一的对话接口
    整合 classify -> search -> generate 全流程
    """
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        query = query_params.get("q", [""])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            query = data.get("query", "")
        except:
            query = ""

    if not query:
        return Response(
            content=json.dumps({"error": "Empty query"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 1. 意图分类（调用 classify 服务）
    classify_result = await classify_intent(query)
    intent = classify_result.get("intent", "other")
    company = classify_result.get("company", "")
    position = classify_result.get("position", "")

    # 闲聊直接返回
    if classify_result.get("skip_rag"):
        return Response(
            content=json.dumps({
                "query": query,
                "intent": intent,
                "answer": "你好！我是求职助手，可以帮你查找面经、分析JD、了解公司评价。有什么求职问题可以问我！",
                "sources": []
            }, ensure_ascii=False),
            media_type="application/json"
        )

    # 2. 检索（调用 search 服务）
    search_result = await search_knowledge(query, intent, company, position)
    vector_results = search_result.get("vector_results", [])
    serp_results = search_result.get("serp_results", [])

    # 3. 生成（调用 Claude）
    generate_result = await generate_answer(
        query, intent, company, position,
        vector_results, serp_results or []
    )

    return Response(
        content=json.dumps(generate_result, ensure_ascii=False),
        media_type="application/json"
    )


async def classify_intent(query: str) -> dict:
    """意图分类 + 提取公司名/岗位名"""
    import re
    query_lower = query.lower()

    chat_keywords = ["你好", "在吗", "hi", "hello", "谢谢"]
    if any(kw in query_lower for kw in chat_keywords):
        return {"intent": "chat", "skip_rag": True, "company": "", "position": ""}

    experience_keywords = ["面经", "面试", "面试题", "一面", "二面", "三面"]
    if any(kw in query_lower for kw in experience_keywords):
        intent = "experience"
    elif any(kw in query_lower for kw in ["jd", "职位描述", "值得投"]):
        intent = "jd_analysis"
    elif any(kw in query_lower for kw in ["公司怎么样", "加班", "待遇"]):
        intent = "company_review"
    else:
        intent = "experience"

    # 提取公司名
    company = ""
    company_patterns = [
        (r"字节跳动|ByteDance|字节", "字节跳动"), (r"腾讯|Tencent", "腾讯"),
        (r"阿里巴巴|Alibaba|阿里", "阿里巴巴"), (r"美团|Meituan", "美团"),
        (r"京东|JD", "京东"), (r"百度|Baidu", "百度"),
        (r"华为|Huawei", "华为"), (r"小米|Xiaomi", "小米"),
        (r"拼多多|PDD|pdd", "拼多多"), (r"快手|Kuaishou", "快手"),
    ]
    for pattern, name in company_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            company = name
            break

    # 提取岗位名
    position = ""
    pos_patterns = [
        (r"前端|frontend|FE", "前端"), (r"后端|backend|BE|server", "后端"),
        (r"算法|ML|AI|机器学习", "算法"), (r"数据|data|analyst", "数据"),
        (r"测试|QA|test", "测试"), (r"产品|PM|product", "产品"),
    ]
    for pattern, name in pos_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            position = name
            break

    return {"intent": intent, "skip_rag": False, "company": company, "position": position}


async def search_knowledge(query: str, intent: str, company: str, position: str) -> dict:
    """检索知识库 — 向量搜索 + SerpAPI 兜底"""
    MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
    SUPABASE_URL_ENV = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    SUPABASE_KEY_ENV = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    vector_results = []
    serp_results = []

    # 1. 获取 query embedding
    if MINIMAX_API_KEY:
        try:
            search_query = f"{company} {position} {query}".strip() if company else query
            emb_resp = httpx.post(
                "https://api.minimax.chat/v1/embeddings",
                headers={"Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json"},
                json={"model": "embo-01", "texts": [search_query[:4000]], "type": "query"},
                timeout=30
            )
            emb_resp.raise_for_status()
            query_embedding = emb_resp.json().get("vectors", [[]])[0]
        except Exception as e:
            print(f"Embedding error: {e}")
            query_embedding = None
    else:
        query_embedding = None

    # 2. 向量检索
    if query_embedding and SUPABASE_URL_ENV and SUPABASE_KEY_ENV:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL_ENV, SUPABASE_KEY_ENV)
            result = supabase.rpc("search_experiences", {
                "query_embedding": query_embedding,
                "top_k": 20,
                "company_filter": company if company else None
            }).execute()

            for row in result.data or []:
                vector_results.append({
                    "id": row.get("id", ""),
                    "source": row.get("source", ""),
                    "company": row.get("company", ""),
                    "position": row.get("position", ""),
                    "content": (row.get("cleaned_content") or "")[:500],
                    "quality_score": row.get("quality_score", 0.5),
                    "similarity": row.get("similarity", 0.0),
                    "source_url": ""
                })
        except Exception as e:
            print(f"Vector search error: {e}")

    # 3. 如果向量结果不足，用 SerpAPI 兜底
    avg_sim = sum(r.get("similarity", 0) for r in vector_results) / max(len(vector_results), 1)
    if avg_sim < 0.7 or len(vector_results) < 3:
        serpapi_key = os.getenv("SERPAPI_API_KEY")
        if serpapi_key:
            try:
                serp_resp = httpx.get(
                    "https://serpapi.com/search",
                    params={"q": f"{company or ''} {query}", "api_key": serpapi_key, "num": 5},
                    timeout=30
                )
                for item in serp_resp.json().get("organic_results", [])[:5]:
                    serp_results.append({
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", ""),
                        "url": item.get("link", ""),
                        "source": "web"
                    })
            except Exception as e:
                print(f"SerpAPI error: {e}")

    return {"vector_results": vector_results[:5], "serp_results": serp_results, "query": query}


async def generate_answer(
    query: str, intent: str, company: str, position: str,
    vector_results: list, serp_results: list
) -> dict:
    """生成回答（内部调用）"""
    context = {
        "vector_results": vector_results,
        "serp_results": serp_results
    }

    result = call_claude(query, context, intent)

    if "error" in result:
        return {"error": result["error"]}

    return {
        "query": query,
        "intent": intent,
        "intent_label": {"experience": "面经", "jd_analysis": "JD分析", "company_review": "公司评价", "chat": "闲聊", "other": "其他"}.get(intent, "其他"),
        "company": company,
        "position": position,
        "answer": result["text"],
        "sources": result.get("sources", [])
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "generate"}
