#!/usr/bin/env python3
"""
LLM-as-Judge 质检服务
对生成的回答进行质量评分，20% 抽样检查
"""

import os
import json
import random
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Claude API
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# 抽样比例
SAMPLE_RATE = 0.2


SYSTEM_PROMPT = """你是一个严格的质量评估专家，负责评估 AI 生成的回答是否符合标准。

【评估维度 - 每项 1-5 分】
1. **准确性**：回答是否基于提供的面经，有无编造内容？
2. **完整性**：是否涵盖了用户问题的关键方面？
3. **来源标注**：是否明确标注了信息来源（公司、平台）？
4. **可操作性**：建议是否具体、可执行？
5. **结构化**：回答是否条理清晰、格式良好？

【评分标准】
- 5分：优秀，完全符合标准
- 4分：良好，有小瑕疵但整体合格
- 3分：及格，有明显不足
- 2分：较差，有重大问题
- 1分：不合格，无法使用

【输出格式 - 严格返回JSON】
{
  "scores": {
    "accuracy": 1-5,
    "completeness": 1-5,
    "source_citation": 1-5,
    "actionability": 1-5,
    "structure": 1-5
  },
  "total_score": 1-25,
  "issues": ["问题1", "问题2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "overall_comment": "总体评价（50字内）"
}
"""


def evaluate_response(
    query: str,
    response: str,
    sources: list[dict]
) -> dict:
    """
    评估单个回答的质量

    Args:
        query: 用户原始问题
        response: AI 生成的回答
        sources: 参考来源列表

    Returns:
        评估结果 dict
    """
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    # 构建上下文
    sources_text = ""
    for i, s in enumerate(sources[:5], 1):
        if s.get("company"):
            sources_text += f"{i}. [{s['company']}]({s.get('source', 'unknown')})\n"
        elif s.get("title"):
            sources_text += f"{i}. {s['title']} ({s.get('url', '')}))\n"

    if not sources_text:
        sources_text = "无参考来源"

    prompt = f"""评估以下 AI 回答的质量。

用户问题：{query}

AI 回答：
{response[:1500]}

参考来源：
{sources_text}

请按标准评估。
"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": "claude-sonnet-4-6-20250514",
        "max_tokens": 800,
        "temperature": 0.1,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()

        text = result.get("content", [{}])[0].get("text", "")
        return parse_json_response(text)

    except Exception as e:
        return {"error": str(e)}


def parse_json_response(text: str) -> dict:
    """从响应中提取 JSON"""
    import re

    # 尝试找 ``` json ... ``` 块
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1)

    # 尝试直接解析
    try:
        return json.loads(text)
    except:
        pass

    # 尝试提取 {...}
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except:
            pass

    return {}


def should_sample() -> bool:
    """根据抽样比例决定是否抽样"""
    return random.random() < SAMPLE_RATE


def quality_check(
    query: str,
    response: str,
    sources: list[dict]
) -> Optional[dict]:
    """
    质量检查入口

    Returns:
        如果被抽样，返回评估结果；否则返回 None
    """
    if not should_sample():
        return None

    result = evaluate_response(query, response, sources)
    return result


def batch_quality_check(
    logs: list[dict],
    sample_rate: float = SAMPLE_RATE
) -> list[dict]:
    """
    批量质量检查

    Args:
        logs: 生成日志列表，每项包含 query, response, sources
        sample_rate: 抽样比例

    Returns:
        被抽中的日志及其评估结果
    """
    results = []

    for log in logs:
        if random.random() < sample_rate:
            result = evaluate_response(
                log.get("query", ""),
                log.get("response", ""),
                log.get("sources", [])
            )
            results.append({
                "log": log,
                "evaluation": result
            })

    return results


if __name__ == "__main__":
    # 测试
    test_query = "字节跳动前端面经有什么？"
    test_response = """## 面经总结

### 一、面试流程
字节跳动前端岗位通常3-4轮面试：
1. 笔试（算法+前端基础）
2. 技术面（2轮）
3. HR面

### 二、常见面试题
- React 原理（Fiber、Virtual DOM）
- 手写 Promise.all
- HTTP/TCP 协议
- Webpack 配置

### 三、准备建议
1. 重点看 React 源码
2. 刷算法题（medium 难度）
3. 准备项目亮点

---
来源：字节跳动 - 牛客，共 5 条面经
"""
    test_sources = [
        {"company": "字节跳动", "source": "牛客"},
        {"company": "字节跳动", "source": "小红书"}
    ]

    result = quality_check(test_query, test_response, test_sources)

    if result:
        print("质量评估结果：")
        print(f"  准确性: {result.get('scores', {}).get('accuracy', 'N/A')}")
        print(f"  完整性: {result.get('scores', {}).get('completeness', 'N/A')}")
        print(f"  来源标注: {result.get('scores', {}).get('source_citation', 'N/A')}")
        print(f"  总分: {result.get('total_score', 'N/A')}/25")
        print(f"  问题: {result.get('issues', [])}")
    else:
        print("未被抽样，跳过")
