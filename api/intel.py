"""
多模型 AI 情报引擎
- Tavily: 多源搜索
- MiniMax-Text-01: 质量评分
- Claude Sonnet 4.6: 合成建议
"""
import os
import json
import hashlib
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ 配置 ============
def get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


TAVILY_API_KEY = get_env("TAVILY_API_KEY")
MINIMAX_API_KEY = get_env("MINIMAX_API_KEY")
ANTHROPIC_API_KEY = get_env("ANTHROPIC_API_KEY")


# ============ API 客户端 ============
async def call_tavily(query: str, search_type: str = "experience", max_results: int = 15) -> List[Dict]:
    """Tavily 多源搜索"""
    if not TAVILY_API_KEY:
        return [{"error": "TAVILY_API_KEY not configured"}]

    type_suffixes = {
        "experience": "面经 面试经验 知乎 牛客",
        "jd": "JD 职位描述 招聘要求 薪资",
        "growth": "发展路径 晋升 薪资涨幅 成长 职级",
        "company": "公司评价 口碑 工作体验 知乎 脉脉",
        "salary": "薪资待遇 月薪 年薪 package",
        "hc": "HC headcount 招聘人数",
        "atmosphere": "团队氛围 工作环境 加班",
    }

    suffix = type_suffixes.get(search_type, "")
    enhanced_query = f"{query} {suffix}" if suffix else query

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": enhanced_query,
                    "max_results": max_results,
                    "include_answer": True,
                    "include_raw_content": False,
                    "include_images": False,
                },
                timeout=30.0,
            )
            data = resp.json()
            return data.get("results", [])
    except Exception as e:
        return [{"error": str(e)}]


async def call_minimax(text: str, context: str = "") -> Dict:
    """
    MiniMax-Text-01 质量评分
    返回: { score: 0-10, reasons: [], summary: str }
    """
    if not MINIMAX_API_KEY:
        return {"score": 7.0, "reasons": ["MiniMax API 未配置，使用默认评分"], "summary": text[:200]}

    prompt = f"""你是一个内容质量评估专家。请对以下内容进行质量评分（0-10分）。

评分标准：
- 内容相关性：与求职/面试的相关程度
- 信息价值：是否包含有用的具体信息
- 真实可信：来源是否可靠，内容是否可信
- 详细程度：信息是否足够详细

搜索上下文：{context}

待评分内容：
{text}

请以JSON格式返回：
{{"score": 分数, "reasons": ["原因1", "原因2"], "summary": "一句话总结"}}"""

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.minimax.chat/v1/text/chatcompletion_v2",
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-Text-01",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
                timeout=30.0,
            )
            result = resp.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

            # 解析 JSON
            import re
            json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"score": 7.0, "reasons": ["评分解析失败，使用默认"], "summary": text[:200]}
    except Exception as e:
        return {"score": 7.0, "reasons": [f"评分失败: {str(e)}"], "summary": text[:200]}


async def call_claude(context: str, query: str, history: List[Dict] = None) -> Dict:
    """
    Claude Sonnet 4.6 合成结构化建议
    """
    if not ANTHROPIC_API_KEY:
        return {"response": "Claude API 未配置", "sources": []}

    # 构建消息历史
    messages = []
    if history:
        for h in history[-5:]:  # 只保留最近5轮
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

    system_prompt = """你是一个专业的求职顾问AI助手，擅长帮助用户分析职位、准备面试、规划职业发展。

请基于以下搜索结果和上下文，为用户提供：
1. 结构化的职位/公司分析
2. 面试准备建议
3. 薪资和发展前景评估
4. 具体的行动建议

如果用户追问，请基于之前的对话上下文进行回答。
支持模拟面试，可以给出面试题和建议答案。"""

    user_content = f"""用户问题：{query}

参考上下文：
{context}

请给出专业的分析和建议。"""

    messages.append({"role": "user", "content": user_content})

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 2000,
                    "system": system_prompt,
                    "messages": messages,
                },
                timeout=60.0,
            )
            result = resp.json()
            return {
                "response": result.get("content", [{}])[0].get("text", ""),
                "sources": [],
                "usage": result.get("usage", {}),
            }
    except Exception as e:
        return {"response": f"Claude API 调用失败: {str(e)}", "sources": []}


# ============ 搜索与评分流程 ============
async def search_with_quality_filter(query: str, search_type: str = "experience", max_results: int = 10):
    """完整搜索流程：搜索 -> 评分 -> 过滤"""

    # 1. 多源搜索
    raw_results = await call_tavily(query, search_type, max_results * 2)

    if isinstance(raw_results, list) and len(raw_results) > 0 and "error" in raw_results[0]:
        return {"error": raw_results[0]["error"], "results": []}

    # 2. 质量评分与排序
    scored_results = []
    for item in raw_results[:max_results * 2]:
        content = item.get("content", "")
        url = item.get("url", "")

        # MiniMax 质量评分
        quality = await call_minimax(content, f"搜索类型: {search_type}, 关键词: {query}")

        scored_results.append({
            "title": item.get("title", ""),
            "content": content,
            "url": url,
            "score": quality.get("score", 5.0),
            "quality_summary": quality.get("summary", ""),
            "quality_reasons": quality.get("reasons", []),
            "platform": detect_platform(url),
        })

    # 3. 按质量排序，取Top结果
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    filtered_results = scored_results[:max_results]

    # 4. 构建 RAG 上下文
    context = "\n\n".join([
        f"【{r['title']}】{r['content'][:300]}..."
        for r in filtered_results
    ])

    return {
        "results": filtered_results,
        "context": context,
        "total_found": len(raw_results),
    }


def detect_platform(url: str) -> Dict:
    """检测平台"""
    url_lower = url.lower()
    if "xiaohongshu.com" in url_lower:
        return {"platform": "xiaohongshu", "icon": "📕", "name": "小红书"}
    elif "zhihu.com" in url_lower:
        return {"platform": "zhihu", "icon": "🟦", "name": "知乎"}
    elif "nowcoder.com" in url_lower or "niuke" in url_lower:
        return {"platform": "niuke", "icon": "🐂", "name": "牛客"}
    elif "liepin.com" in url_lower:
        return {"platform": "liepin", "icon": "💼", "name": "猎聘"}
    elif "zhipin.com" in url_lower or "boss" in url_lower:
        return {"platform": "boss", "icon": "👔", "name": "BOSS"}
    elif "maimai.cn" in url_lower or "脉脉" in url_lower:
        return {"platform": "maimai", "icon": "💬", "name": "脉脉"}
    elif "kanzhun.com" in url_lower or "看准" in url_lower:
        return {"platform": "kanzhun", "icon": "🔍", "name": "看准网"}
    else:
        return {"platform": "web", "icon": "🌐", "name": "网页"}


# ============ 会话管理（简单内存存储）===========
# Vercel serverless 下使用简单内存存储，生产环境建议用 Redis
sessions: Dict[str, List[Dict]] = {}


def get_session_id(user_id: str = "default") -> str:
    return hashlib.md5(user_id.encode()).hexdigest()[:16]


# ============ API 路由 ============
@app.api_route("/api/intel/search", methods=["GET", "POST"])
async def intel_search(request):
    """AI 智能搜索（完整流程）"""
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        query = query_params.get("q", [""])[0]
        search_type = query_params.get("type", ["experience"])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            query = data.get("query", "")
            search_type = data.get("search_type", "experience")
        except:
            query = ""
            search_type = "experience"

    if not query:
        return Response(
            content=json.dumps({"error": "query is required"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 执行搜索+评分+RAG流程
    search_result = await search_with_quality_filter(query, search_type, max_results=10)

    if "error" in search_result:
        return Response(
            content=json.dumps(search_result, ensure_ascii=False),
            media_type="application/json"
        )

    # Claude 合成建议
    claude_result = await call_claude(search_result["context"], query)

    # 格式化返回
    formatted_results = []
    for r in search_result["results"]:
        platform_info = r["platform"]
        formatted_results.append({
            "platform": platform_info["platform"],
            "platformIcon": platform_info["icon"],
            "platformName": platform_info["name"],
            "title": r["title"],
            "content": r["content"],
            "url": r["url"],
            "quality_score": r["score"],
            "likes": 0,
            "comments": 0,
        })

    result = {
        "query": query,
        "search_type": search_type,
        "ai_summary": claude_result.get("response", ""),
        "results": formatted_results,
        "total_found": search_result["total_found"],
    }

    return Response(
        content=json.dumps(result, ensure_ascii=False),
        media_type="application/json"
    )


@app.api_route("/api/intel/chat", methods=["GET", "POST"])
async def intel_chat(request):
    """追问功能"""
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        message = query_params.get("message", [""])[0]
        session_id = query_params.get("session", ["default"])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            message = data.get("message", "")
            session_id = data.get("session_id", "default")
        except:
            message = ""
            session_id = "default"

    if not message:
        return Response(
            content=json.dumps({"error": "message is required"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 获取会话历史
    sid = get_session_id(session_id)
    if sid not in sessions:
        sessions[sid] = []

    # 添加用户消息
    sessions[sid].append({"role": "user", "content": message})

    # 简单 RAG：从历史中获取上下文
    context = "\n".join([
        f"{h['role']}: {h['content']}"
        for h in sessions[sid][-10:]
    ])

    # 调用 Claude
    result = await call_claude(context, message, sessions[sid])

    # 添加 AI 响应
    sessions[sid].append({"role": "assistant", "content": result.get("response", "")})

    return Response(
        content=json.dumps({
            "response": result.get("response", ""),
            "session_id": session_id,
        }, ensure_ascii=False),
        media_type="application/json"
    )


@app.api_route("/api/intel/interview", methods=["GET", "POST"])
async def mock_interview(request):
    """模拟面试功能"""
    # 解析请求
    if request.method == "GET":
        from urllib.parse import parse_qs
        query_params = parse_qs(request.url.query)
        role = query_params.get("role", [""])[0]
        company = query_params.get("company", [""])[0]
        session_id = query_params.get("session", ["default"])[0]
    else:
        try:
            body = await request.body()
            data = json.loads(body) if body else {}
            role = data.get("role", "")
            company = data.get("company", "")
            session_id = data.get("session_id", "default")
        except:
            role = ""
            company = ""
            session_id = "default"

    if not role:
        return Response(
            content=json.dumps({"error": "role is required"}, ensure_ascii=False),
            media_type="application/json"
        )

    # 构建面试上下文
    query = f"{company} {role} 面试" if company else f"{role} 面试"
    search_result = await search_with_quality_filter(query, "experience", max_results=5)

    context = search_result.get("context", "")

    # Claude 生成模拟面试
    prompt = f"""请为用户生成一次模拟面试。

岗位：{role}
公司：{company}

请生成：
1. 3-5个高频面试问题
2. 每个问题的参考回答
3. 面试建议

基于以下真实面经：
{context}

请以结构化格式输出。"""

    result = await call_claude(context, prompt)

    return Response(
        content=json.dumps({
            "role": role,
            "company": company,
            "questions": result.get("response", ""),
            "session_id": session_id,
        }, ensure_ascii=False),
        media_type="application/json"
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "services": {
            "tavily": bool(TAVILY_API_KEY),
            "minimax": bool(MINIMAX_API_KEY),
            "anthropic": bool(ANTHROPIC_API_KEY),
        }
    }


# Vercel handler
def handler(request):
    return app(request)
