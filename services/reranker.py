#!/usr/bin/env python3
"""
Reranker 精排服务
使用 MiniMax 对召回的候选集进行精排，选出最相关的 top5
"""

import os
import json
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# MiniMax API 配置
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY") or os.getenv("MINIMAX_TEXT_KEY")
MINIMAX_BASE_URL = "https://api.minimax.chat/v1"

# 精排候选数量
TOP_K = 5


def rerank(
    query: str,
    candidates: list[dict],
    top_k: int = TOP_K
) -> list[dict]:
    """
    对候选集进行精排

    Args:
        query: 用户查询
        candidates: 候选列表，每项包含 id, content, company, similarity 等
        top_k: 返回 top_k 条

    Returns:
        精排后的列表，每项包含 id, content, company, score, reasons
    """
    if not candidates:
        return []

    if not MINIMAX_API_KEY:
        # 无 API Key 时使用原始相似度排序
        return sorted(candidates, key=lambda x: x.get("similarity", 0), reverse=True)[:top_k]

    # 构建批量比较的 prompt
    reranked = []
    for i, candidate in enumerate(candidates):
        score, reasons = score_candidate(query, candidate)
        candidate["rerank_score"] = score
        candidate["rerank_reasons"] = reasons
        reranked.append(candidate)

    # 按 rerank_score 排序
    reranked.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)

    return reranked[:top_k]


def score_candidate(query: str, candidate: dict) -> tuple[float, str]:
    """
    使用 MiniMax 评估单个候选与查询的相关性

    Returns:
        (score 0-1, reasons)
    """
    content = candidate.get("cleaned_content", "") or candidate.get("content", "")[:1000]

    prompt = f"""评估以下面经与用户查询的相关性。

用户查询：{query}

面经内容：
公司：{candidate.get('company', '未知')}
岗位：{candidate.get('position', '未知')}
内容：{content[:800]}

请从以下维度评估相关性（0-1分）：
1. 公司匹配度（查询中提到的公司 vs 面经中的公司）
2. 岗位匹配度（查询中提到的岗位 vs 面经中的岗位）
3. 内容相关性（面经内容是否回答了用户的问题）

【输出格式 - 严格返回JSON】
{{
  "score": 0.0-1.0,
  "reasons": "简要说明评分理由（20字内）"
}}"""

    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "MiniMax-Text-01",
        "messages": [
            {"role": "user", "content": prompt}
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

    except Exception as e:
        print(f"Rerank scoring error: {e}")

    # 失败时返回默认分
    return 0.5, "评估失败，使用默认分"


def parse_json_response(text: str) -> tuple[float, str]:
    """从响应中提取 JSON"""
    import re

    # 尝试找 ``` json ... ``` 块
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1)

    # 尝试直接解析
    try:
        data = json.loads(text)
        return float(data.get("score", 0.5)), data.get("reasons", "")
    except:
        pass

    # 尝试提取 {...}
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            data = json.loads(brace_match.group())
            return float(data.get("score", 0.5)), data.get("reasons", "")
        except:
            pass

    return 0.5, "解析失败"


def batch_rerank(
    query: str,
    candidates: list[dict],
    top_k: int = TOP_K,
    batch_size: int = 10
) -> list[dict]:
    """
    批量精排（每批并行评估多条）

    Args:
        query: 用户查询
        candidates: 候选列表
        top_k: 返回 top_k 条
        batch_size: 每批大小（避免 API 超时）

    Returns:
        精排后的列表
    """
    if not candidates:
        return []

    all_scores = []
    total = len(candidates)

    for i in range(0, total, batch_size):
        batch = candidates[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"Reranking batch {batch_num}/{total_batches}...")

        for j, candidate in enumerate(batch):
            score, reasons = score_candidate(query, candidate)
            candidate["rerank_score"] = score
            candidate["rerank_reasons"] = reasons
            all_scores.append(candidate)

        # 限速
        import time
        time.sleep(0.3)

    # 按 rerank_score 排序
    all_scores.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)

    return all_scores[:top_k]


if __name__ == "__main__":
    # 测试
    test_query = "字节跳动前端面经"
    test_candidates = [
        {
            "id": "1",
            "company": "字节跳动",
            "position": "前端",
            "cleaned_content": "字节跳动前端一面：1. React 原理 2. 手写 Promise 3. 算法题",
            "similarity": 0.85
        },
        {
            "id": "2",
            "company": "腾讯",
            "position": "前端",
            "cleaned_content": "腾讯前端二面：1. Vue 响应式原理 2. 项目介绍",
            "similarity": 0.70
        },
        {
            "id": "3",
            "company": "字节跳动",
            "position": "后端",
            "cleaned_content": "字节跳动后端一面：1. MySQL 索引 2. Redis 缓存",
            "similarity": 0.75
        }
    ]

    result = batch_rerank(test_query, test_candidates, top_k=3)
    print("\n精排结果：")
    for i, r in enumerate(result, 1):
        print(f"{i}. [{r['company']}] {r['position']} (score={r['rerank_score']:.2f})")
        print(f"   reasons: {r['rerank_reasons']}")
