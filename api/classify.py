#!/usr/bin/env python3
"""
意图分类 API
使用 MiniMax 对用户查询进行意图分类
"""

import os
import json
import httpx
from fastapi import FastAPI, Response
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI()

# MiniMax API 配置
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY") or os.getenv("MINIMAX_TEXT_KEY")
MINIMAX_BASE_URL = "https://api.minimax.chat/v1"

# 意图定义
INTENTS = {
    "chat": {"label": "闲聊", "description": "打招呼、问候、不需要面经信息", "skip_rag": True},
    "experience": {"label": "面经咨询", "description": "询问面试经验、题目、流程", "skip_rag": False},
    "jd_analysis": {"label": "JD分析", "description": "分析职位描述是否值得投递", "skip_rag": False},
    "company_review": {"label": "公司评价", "description": "询问公司文化、待遇、加班", "skip_rag": False},
    "other": {"label": "其他", "description": "其他求职相关问题", "skip_rag": False},
}

SYSTEM_PROMPT = """你是一个求职助手，负责判断用户查询的意图类型。

【意图类型】
1. 闲聊(chat)：打招呼、问候、纯聊天，不需要搜索面经
2. 面经咨询(experience)：询问具体公司的面试经验、面试题目、面试流程
3. JD分析(jd_analysis)：让AI分析一个职位描述是否值得投递
4. 公司评价(company_review)：询问某个公司的文化、待遇、工作体验
5. 其他(other)：不属于以上类型的求职相关问题

【判断规则】
- 如果用户只是说"你好"、"在吗"、"谢谢" → 闲聊
- 如果用户问"XX公司面经"、"XX公司面试题" → 面经咨询
- 如果用户粘贴了一段JD让你分析 → JD分析
- 如果用户问"XX公司怎么样"、"XX公司加班严重吗" → 公司评价
- 如果问招聘进度、HC、薪资谈判 → 其他

【输出格式 - 严格返回JSON】
{
  "intent": "experience/jd_analysis/company_review/chat/other",
  "company": "提取的公司名（如果没有则为空）",
  "position": "提取的岗位名（如果没有则为空）",
  "reason": "判断理由"
}"""


class QueryRequest(BaseModel):
    query: str


def call_minimax(query: str) -> dict:
    """调用 MiniMax 进行意图分类"""
    if not MINIMAX_API_KEY:
        return {"error": "MINIMAX_API_KEY not configured"}

    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "MiniMax-Text-01",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"判断这个查询的意图：{query}"}
        ],
        "temperature": 0.1,
        "max_tokens": 300
    }

    try:
        resp = httpx.post(
            f"{MINIMAX_BASE_URL}/text/chatcompletion_v2",
            headers=headers,
            json=payload,
            timeout=15
        )
        resp.raise_for_status()
        result = resp.json()

        choices = result.get("choices", [])
        if choices:
            text = choices[0].get("message", {}).get("content", "")
            return parse_json_response(text)

        return {"error": "No response from MiniMax"}
    except Exception as e:
        return {"error": str(e)}


def parse_json_response(text: str) -> dict:
    """从响应中提取 JSON"""
    import re

    # 尝试找 ```json ... ``` 块
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1)

    # 尝试直接解析
    try:
        return json.loads(text)
    except:
        # 尝试提取 {...}
        brace_match = re.search(r"\{.*\}", text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group())
            except:
                pass
        return {}


@app.api_route("/api/classify", methods=["GET", "POST"])
async def classify(request):
    """意图分类接口"""
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

    # 调用 MiniMax
    result = call_minimax(query)

    if "error" in result:
        # 降级：使用规则判断
        intent = classify_by_rules(query)
        result = {
            "intent": intent,
            "company": extract_company(query),
            "position": extract_position(query),
            "reason": "Rule-based fallback"
        }

    # 构建响应
    response = {
        "query": query,
        "intent": result.get("intent", "other"),
        "intent_label": INTENTS.get(result.get("intent", "other"), {}).get("label", "其他"),
        "skip_rag": INTENTS.get(result.get("intent", "other"), {}).get("skip_rag", False),
        "company": result.get("company", ""),
        "position": result.get("position", ""),
        "reason": result.get("reason", "")
    }

    return Response(
        content=json.dumps(response, ensure_ascii=False),
        media_type="application/json"
    )


def classify_by_rules(query: str) -> str:
    """基于规则的意图分类（降级用）"""
    query_lower = query.lower()

    # 闲聊关键词
    chat_keywords = ["你好", "在吗", "hi", "hello", "谢谢", "帮忙", "请问"]
    if any(kw in query_lower for kw in chat_keywords):
        return "chat"

    # 面经关键词
    experience_keywords = ["面经", "面试", "面试题", "面试经", "一面", "二面", "三面", "hr面", "技术面"]
    if any(kw in query_lower for kw in experience_keywords):
        return "experience"

    # JD分析关键词
    jd_keywords = ["jd", "职位描述", "岗位要求", "值得投吗", "分析一下", "看看这个"]
    if any(kw in query_lower for kw in jd_keywords):
        return "jd_analysis"

    # 公司评价关键词
    company_keywords = ["公司怎么样", "加班", "待遇", "文化", "氛围", "值不值得", "建议"]
    if any(kw in query_lower for kw in company_keywords):
        return "company_review"

    return "other"


def extract_company(query: str) -> str:
    """提取公司名"""
    import re

    company_patterns = [
        r"(字节跳动|ByteDance|字节|bytedance)",
        r"(腾讯|Tencent|微信|QQ)",
        r"(阿里巴巴|Alibaba|阿里)",
        r"(美团|Meituan)",
        r"(京东|JD)",
        r"(百度|Baidu)",
        r"(华为|Huawei)",
        r"(小米|Xiaomi)",
        r"(拼多多|PDD|pdd)",
        r"(快手|Kuaishou)",
        r"(网易|NetEase)",
        r"(蔚来|NIO)",
        r"(理想汽车|理想)",
        r"(大疆|DJI)",
    ]

    for p in company_patterns:
        m = re.search(p, query, re.IGNORECASE)
        if m:
            return m.group(1)

    return ""


def extract_position(query: str) -> str:
    """提取岗位名"""
    import re

    position_patterns = [
        r"(前端|front-end|fe)",
        r"(后端|back-end|be|server)",
        r"(全栈|fullstack)",
        r"(算法|ML|machine learning)",
        r"(客户端|Android|iOS|移动端)",
        r"(测试|QA|test)",
        r"(产品经理|PM)",
        r"(数据|data|analyst)",
        r"(SRE|DevOps|运维)",
        r"(安全|security)",
    ]

    for p in position_patterns:
        m = re.search(p, query, re.IGNORECASE)
        if m:
            return m.group(1)

    return ""


@app.get("/health")
def health():
    return {"status": "ok", "service": "classify"}
