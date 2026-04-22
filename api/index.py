#!/usr/bin/env python3
"""API 入口 - Vercel Python Serverless Function"""
import os
import json
import httpx
from fastapi import FastAPI, Response, Request
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")
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
### 二、常见面试题
### 三、准备建议
### 四、公司/岗位评价

---
来源：网络搜索整理
```"""


def search_serpapi(query: str, company: str = "", position: str = "") -> list:
    if not SERPAPI_KEY:
        return []
    try:
        resp = httpx.get(
            "https://serpapi.com/search",
            params={"q": f"{company} {position} {query}".strip(), "api_key": SERPAPI_KEY, "num": 10},
            timeout=30
        )
        resp.raise_for_status()
        return [{"title": r.get("title", ""), "snippet": r.get("snippet", ""), "url": r.get("link", "")}
                for r in resp.json().get("organic_results", [])[:10]]
    except:
        return []


def search_duckduckgo(query: str, company: str = "", position: str = "") -> list:
    try:
        resp = httpx.get(
            "https://duckduckgo.com/html/",
            params={"q": f"{company} {position} {query}".strip(), "kl": "cn-zh"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=30
        )
        import re
        titles = re.findall(r'<a class="result__a" href="([^"]+)">([^<]+)</a>', resp.text)
        snippets = re.findall(r'<a class="result__snippet"[^>]*>([^<]+)</a>', resp.text)
        return [{"title": t.strip(), "snippet": snippets[i].strip() if i < len(snippets) else "", "url": u}
                for i, (u, t) in enumerate(titles[:10])]
    except:
        return []


def call_claude(query: str, search_results: list, intent: str) -> dict:
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    context = "\n".join([f"{i+1}. {r['title']}: {r['snippet'][:200]}" for i, r in enumerate(search_results[:8])]) or "暂无搜索结果"

    intent_req = {
        "experience": "重点描述面试流程和常见面试题",
        "jd_analysis": "分析该职位的优劣势，给出投递建议",
        "company_review": "重点描述公司文化、待遇",
        "chat": "友好地打招呼",
        "other": "给出专业求职建议"
    }

    user_prompt = f"""基于搜索结果回答用户问题。

用户问题：{query}

搜索结果：
{context}

【回答重点】{intent_req.get(intent, '')}"""

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": CLAUDE_MODEL, "max_tokens": 2000, "temperature": 0.3,
                  "system": SYSTEM_PROMPT, "messages": [{"role": "user", "content": user_prompt}]},
            timeout=60
        )
        resp.raise_for_status()
        result = resp.json()
        return {
            "text": result.get("content", [{}])[0].get("text", ""),
            "sources": [{"title": r["title"], "url": r["url"]} for r in search_results[:5]]
        }
    except Exception as e:
        return {"error": str(e)}


def classify_intent(query: str) -> dict:
    import re
    q = query.lower()
    if any(kw in q for kw in ["你好", "在吗", "hi", "hello", "谢谢"]):
        return {"intent": "chat", "skip": True, "company": "", "position": ""}

    intent = "experience"
    if any(kw in q for kw in ["jd", "职位描述", "值得投"]):
        intent = "jd_analysis"
    elif any(kw in q for kw in ["公司怎么样", "加班", "待遇"]):
        intent = "company_review"

    company = ""
    for pat, name in [(r"字节跳动|ByteDance|字节", "字节跳动"), (r"腾讯|Tencent|微信", "腾讯"),
                      (r"阿里巴巴|Alibaba|阿里", "阿里巴巴"), (r"美团|Meituan", "美团"),
                      (r"京东|JD\.com", "京东"), (r"百度|Baidu", "百度"),
                      (r"华为|Huawei", "华为"), (r"小米|Xiaomi", "小米"),
                      (r"拼多多|PDD|pdd", "拼多多"), (r"快手|Kuaishou", "快手")]:
        if re.search(pat, query, re.I):
            company = name
            break

    position = ""
    for pat, name in [(r"前端|front-end|fe", "前端"), (r"后端|back-end|be", "后端"),
                      (r"算法|ML|AI|机器学习", "算法"), (r"数据|data|analyst", "数据分析"),
                      (r"测试|QA|test", "测试"), (r"产品经理|PM", "产品经理")]:
        if re.search(pat, query, re.I):
            position = name
            break

    return {"intent": intent, "skip": False, "company": company, "position": position}


# ============ 路由 ============

@app.api_route("/api/chat", methods=["GET", "POST"])
async def chat(request: Request):
    """统一对话接口"""
    if request.method == "GET":
        from urllib.parse import parse_qs
        query = parse_qs(request.url.query).get("q", [""])[0]
    else:
        try:
            query = (await request.body()).decode() or ""
            data = json.loads(query) if query else {}
            query = data.get("query", "")
        except:
            query = ""

    if not query:
        return Response(content=json.dumps({"error": "Empty query"}, ensure_ascii=False), media_type="application/json")

    cls = classify_intent(query)
    intent, company, position = cls["intent"], cls["company"], cls["position"]

    if cls["skip"]:
        return Response(
            content=json.dumps({"query": query, "intent": "chat", "intent_label": "闲聊",
                               "answer": "你好！我是求职助手，可以帮你查找面经、分析JD、了解公司评价。有什么求职问题可以问我！",
                               "sources": []}, ensure_ascii=False),
            media_type="application/json")

    results = search_serpapi(query, company, position) or search_duckduckgo(query, company, position)
    result = call_claude(query, results, intent)

    if "error" in result:
        return Response(content=json.dumps({"error": result["error"]}, ensure_ascii=False), media_type="application/json")

    return Response(
        content=json.dumps({"query": query, "intent": intent, "intent_label":
                           {"experience": "面经", "jd_analysis": "JD分析", "company_review": "公司评价",
                            "chat": "闲聊", "other": "其他"}.get(intent, "其他"),
                           "company": company, "position": position,
                           "answer": result["text"], "sources": result.get("sources", [])}, ensure_ascii=False),
        media_type="application/json")


@app.api_route("/api/generate", methods=["GET", "POST"])
async def generate(request: Request):
    """生成接口"""
    if request.method == "GET":
        from urllib.parse import parse_qs
        params = parse_qs(request.url.query)
        query = params.get("q", [""])[0]
        intent = params.get("intent", ["experience"])[0]
    else:
        try:
            data = json.loads((await request.body()).decode() or "{}")
            query = data.get("query", "")
            intent = data.get("intent", "experience")
        except:
            query, intent = "", "experience"

    if not query:
        return Response(content=json.dumps({"error": "Empty query"}, ensure_ascii=False), media_type="application/json")

    cls = classify_intent(query)
    company, position = cls["company"], cls["position"]

    results = search_serpapi(query, company, position) or search_duckduckgo(query, company, position)
    result = call_claude(query, results, intent)

    if "error" in result:
        return Response(content=json.dumps({"error": result["error"]}, ensure_ascii=False), media_type="application/json")

    return Response(
        content=json.dumps({"query": query, "intent": intent, "intent_label":
                           {"experience": "面经", "jd_analysis": "JD分析", "company_review": "公司评价",
                            "chat": "闲聊", "other": "其他"}.get(intent, "其他"),
                           "answer": result["text"], "sources": result.get("sources", [])}, ensure_ascii=False),
        media_type="application/json")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "api", "mode": "realtime-search"}