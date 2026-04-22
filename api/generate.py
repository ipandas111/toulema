#!/usr/bin/env python3
"""
生成 API (简化版)
技术路线：实时搜索 (SerpAPI) → AI 生成 (Claude)
"""

import os
import json
import httpx
from fastapi import FastAPI, Response, Request
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")

# Claude
CLAUDE_MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """你是一个专业的求职顾问，擅长基于搜索结果为用户提供结构化的面经分析报告。

【核心原则】
1. 只基于搜索结果回答，不要编造
2. 每个建议必须标注来源
3. 回答要结构化，使用 markdown 格式
4. 如果信息不足，明确说明

【回答格式】
## 📋 [公司] [岗位] 面经分析报告

### 一、面试流程
（描述典型的面试轮次）

### 二、常见面试题
（列出高频技术问题）

### 三、准备建议
（针对该岗位的备考策略）

### 四、公司/岗位评价
（来自在职员工/面试者的真实反馈）

---
来源：网络搜索整理
```
"""


def search_with_serpapi(query: str, company: str = "", position: str = "") -> list[dict]:
    """使用 SerpAPI 进行实时搜索"""
    if not SERPAPI_KEY:
        return []

    try:
        search_query = f"{company} {position} {query}".strip()
        resp = httpx.get(
            "https://serpapi.com/search",
            params={
                "q": search_query,
                "api_key": SERPAPI_KEY,
                "num": 10,
                "engine": "google"
            },
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()

        results = []
        for item in result.get("organic_results", [])[:10]:
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", ""),
                "source": item.get("source", "google")
            })
        return results

    except Exception as e:
        print(f"SerpAPI error: {e}")
        return []


def search_with_duckduckgo(query: str, company: str = "", position: str = "") -> list[dict]:
    """使用 DuckDuckGo 作为 SerpAPI 的替代"""
    try:
        search_query = f"{company} {position} {query}".strip()
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        resp = httpx.get(
            "https://duckduckgo.com/html/",
            params={"q": search_query, "kl": "cn-zh"},
            headers=headers,
            timeout=30
        )

        import re
        # 简单解析 DuckDuckGo HTML 结果
        titles = re.findall(r'<a class="result__a" href="([^"]+)">([^<]+)</a>', resp.text)
        snippets = re.findall(r'<a class="result__snippet"[^>]*>([^<]+)</a>', resp.text)

        results = []
        for i, (url, title) in enumerate(titles[:10]):
            snippet = snippets[i] if i < len(snippets) else ""
            results.append({
                "title": title.strip(),
                "snippet": snippet.strip(),
                "url": url,
                "source": "duckduckgo"
            })
        return results

    except Exception as e:
        print(f"DuckDuckGo error: {e}")
        return []


def call_claude(query: str, search_results: list[dict], intent: str) -> dict:
    """调用 Claude 生成回答"""
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    # 构建上下文
    context_text = ""
    if search_results:
        context_text += "【搜索结果】\n"
        for i, r in enumerate(search_results[:8], 1):
            title = r.get("title", "")[:100]
            snippet = r.get("snippet", "")[:300]
            url = r.get("url", "")
            context_text += f"{i}. {title}\n   {snippet}\n   来源: {url}\n\n"
    else:
        context_text = "暂无搜索结果"

    # 构建 prompt
    user_prompt = f"""基于以下搜索结果，回答用户的问题。

用户问题：{query}

{context_text}

请按要求的格式回答，生成结构化的面经分析报告。"""

    # 意图特定的补充要求
    intent_requirements = {
        "experience": "重点描述面试流程和常见面试题",
        "jd_analysis": "分析该职位的优劣势，给出投递建议",
        "company_review": "重点描述公司文化、待遇、员工评价",
        "chat": "友好地打招呼，说明你可以提供什么帮助",
        "other": "根据问题给出合理的求职建议"
    }

    user_prompt += f"\n\n【回答重点】{intent_requirements.get(intent, '给出专业的求职建议')}"

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

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
            "sources": [{"title": r.get("title", ""), "url": r.get("url", "")} for r in search_results[:5]],
            "usage": result.get("usage", {})
        }

    except Exception as e:
        return {"error": str(e)}


def classify_intent(query: str) -> dict:
    """意图分类 + 提取公司名/岗位名"""
    import re
    query_lower = query.lower()

    # 闲聊检测
    chat_keywords = ["你好", "在吗", "hi", "hello", "谢谢", "你是谁"]
    if any(kw in query_lower for kw in chat_keywords):
        return {"intent": "chat", "skip_rag": True, "company": "", "position": ""}

    # 意图分类
    if any(kw in query_lower for kw in ["面经", "面试", "面试题", "一面", "二面", "三面"]):
        intent = "experience"
    elif any(kw in query_lower for kw in ["jd", "职位描述", "值得投", "分析"]):
        intent = "jd_analysis"
    elif any(kw in query_lower for kw in ["公司怎么样", "加班", "待遇", "文化"]):
        intent = "company_review"
    else:
        intent = "experience"

    # 提取公司名
    company = ""
    company_patterns = [
        (r"字节跳动|ByteDance|字节", "字节跳动"), (r"腾讯|Tencent|微信", "腾讯"),
        (r"阿里巴巴|Alibaba|阿里", "阿里巴巴"), (r"美团|Meituan", "美团"),
        (r"京东|JD\.com", "京东"), (r"百度|Baidu", "百度"),
        (r"华为|Huawei", "华为"), (r"小米|Xiaomi", "小米"),
        (r"拼多多|PDD|pdd", "拼多多"), (r"快手|Kuaishou", "快手"),
        (r"网易|NetEase", "网易"), (r"蔚来|NIO", "蔚来"),
        (r"理想汽车|理想", "理想汽车"), (r"小红书", "小红书"),
    ]
    for pattern, name in company_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            company = name
            break

    # 提取岗位名
    position = ""
    pos_patterns = [
        (r"前端|front-end|fe", "前端"), (r"后端|back-end|be|server", "后端"),
        (r"全栈|fullstack", "全栈"), (r"算法|ML|AI|机器学习", "算法"),
        (r"客户端|Android|iOS|移动端", "客户端"), (r"测试|QA|test", "测试"),
        (r"产品经理|PM|product", "产品经理"), (r"数据|data|analyst", "数据分析"),
        (r"运营|策划", "运营"), (r"市场|marketing", "市场"),
    ]
    for pattern, name in pos_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            position = name
            break

    return {"intent": intent, "skip_rag": False, "company": company, "position": position}


@app.api_route("/api/chat", methods=["GET", "POST"])
async def chat(request: Request):
    """
    统一对话接口
    流程：意图分类 → 实时搜索 (SerpAPI) → AI 生成 (Claude)
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

    # 1. 意图分类
    classify_result = classify_intent(query)
    intent = classify_result.get("intent", "other")
    company = classify_result.get("company", "")
    position = classify_result.get("position", "")

    # 闲聊直接返回
    if classify_result.get("skip_rag"):
        return Response(
            content=json.dumps({
                "query": query,
                "intent": intent,
                "intent_label": "闲聊",
                "answer": "你好！我是求职助手，可以帮你查找面经、分析JD、了解公司评价。有什么求职问题可以问我！",
                "sources": []
            }, ensure_ascii=False),
            media_type="application/json"
        )

    # 2. 实时搜索 (SerpAPI 或 DuckDuckGo 兜底)
    search_results = search_with_serpapi(query, company, position)
    if not search_results:
        search_results = search_with_duckduckgo(query, company, position)

    # 3. Claude 生成
    result = call_claude(query, search_results, intent)

    if "error" in result:
        return Response(
            content=json.dumps({"error": result["error"]}, ensure_ascii=False),
            media_type="application/json"
        )

    # 构建响应
    response = {
        "query": query,
        "intent": intent,
        "intent_label": {
            "experience": "面经",
            "jd_analysis": "JD分析",
            "company_review": "公司评价",
            "chat": "闲聊",
            "other": "其他"
        }.get(intent, "其他"),
        "company": company,
        "position": position,
        "answer": result["text"],
        "sources": result.get("sources", [])
    }

    return Response(
        content=json.dumps(response, ensure_ascii=False),
        media_type="application/json"
    )


@app.api_route("/api/generate", methods=["GET", "POST"])
async def generate(request: Request):
    """生成接口（保留兼容）"""
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
            search_results = data.get("search_results", [])
        except:
            query = ""
            intent = "experience"
            search_results = []

    if not query:
        return Response(
            content=json.dumps({"error": "Empty query"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 实时搜索
    classify_result = classify_intent(query)
    company = classify_result.get("company", "")
    position = classify_result.get("position", "")

    if not search_results:
        search_results = search_with_serpapi(query, company, position)
        if not search_results:
            search_results = search_with_duckduckgo(query, company, position)

    # 生成
    result = call_claude(query, search_results, intent)

    if "error" in result:
        return Response(
            content=json.dumps({"error": result["error"]}, ensure_ascii=False),
            media_type="application/json"
        )

    response = {
        "query": query,
        "intent": intent,
        "intent_label": {
            "experience": "面经", "jd_analysis": "JD分析",
            "company_review": "公司评价", "chat": "闲聊", "other": "其他"
        }.get(intent, "其他"),
        "answer": result["text"],
        "sources": result.get("sources", [])
    }

    return Response(
        content=json.dumps(response, ensure_ascii=False),
        media_type="application/json"
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "generate", "mode": "realtime-search"}