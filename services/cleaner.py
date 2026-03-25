#!/usr/bin/env python3
"""
MiniMax 内容质量过滤服务
判断面经是否为真实面经，过滤广告/低质/水军内容
"""

import httpx
import json
import os
import argparse
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# MiniMax API 配置
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY") or os.getenv("MINIMAX_TEXT_KEY")
MINIMAX_BASE_URL = "https://api.minimax.chat/v1"
MINIMAX_GROUP_ID = os.getenv("MINIMAX_GROUP_ID")

# 系统提示词
SYSTEM_PROMPT = """你是一个专业的内容质量审核员，专门判断中文互联网平台（小红书、知乎、牛客）上的帖子是否为真实的求职面经。

【判断标准 - 拒绝以下内容】
1. ❌ 广告帖：招聘内推收费、卖课、带货、推广链接
2. ❌ 低质量内容：少于150字的流水账、无具体面试问题
3. ❌ 水军/刷屏：同一用户短时间内发多条相似内容
4. ❌ 无关内容：纯吐槽、晒offer、职场八卦、情感帖
5. ❌ 钓鱼/诈骗：诱导加微信、付费内推等可疑内容

【判断标准 - 通过以下内容】
1. ✅ 真实面经：包含具体面试问题、技术考点、流程描述
2. ✅ OC (Offer Call) 帖：有具体的薪资/职级信息
3. ✅ HC (Headcount) 帖：内部推荐、招聘进度
4. ✅ 求职经验分享：准备过程、技巧心得

【输出格式 - 严格返回JSON】
{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由（10-30字）",
  "extracted_company": "提取的公司名（如果没有则为空）",
  "extracted_position": "提取的岗位名（如果没有则为空）",
  "intent_tags": ["面经"/"OC"/"HC"/"碎碎念"/"广告"]
}
"""

@dataclass
class CleanResult:
    source_id: str
    is_valid: bool
    confidence: float
    reason: str
    company: str
    position: str
    intent_tags: list[str]
    cleaned_content: str


def call_minimax_chat(
    content: str,
    api_key: str,
    model: str = "MiniMax-Text-01"
) -> Optional[dict]:
    """调用 MiniMax Chat API 进行内容质量判断"""
    if not api_key:
        print("错误: MINIMAX_API_KEY 未设置")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"请判断以下内容是否为真实面经：\n\n{content[:2000]}"}  # 限制长度
        ],
        "temperature": 0.1,  # 低温度保证稳定性
        "max_tokens": 500
    }

    try:
        resp = httpx.post(
            f"{MINIMAX_BASE_URL}/text/chatcompletion_v2",
            headers=headers,
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()

        # 解析响应
        choices = result.get("choices", [])
        if choices:
            text = choices[0].get("message", {}).get("content", "")
            # 尝试提取 JSON
            return parse_json_response(text)

        return None
    except Exception as e:
        print(f"API 调用失败: {e}")
        return None


def parse_json_response(text: str) -> dict:
    """从响应中提取 JSON"""
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


def extract_keywords(content: str) -> tuple[str, str]:
    """用正则提取公司名和岗位名"""
    # 常见公司名模式
    company_patterns = [
        r"(字节跳动|ByteDance|字节|bytedance)",
        r"(腾讯|Tencent|微信|QQ)",
        r"(阿里巴巴|Alibaba|阿里|淘宝|天猫)",
        r"(美团|Meituan)",
        r"(京东|JD|jd\.com)",
        r"(百度|Baidu|baidu)",
        r"(华为|Huawei|huawei)",
        r"(小米|Xiaomi|xiaomi)",
        r"(拼多多|Pinduoduo|PDD|pdd)",
        r"(快手|Kuaishou|ks)",
        r"(网易|NetEase|netease)",
        r"(滴滴|Didi)",
        r"(携程|Ctrip)",
        r"(哔哩哔哩|B站|bilibili|Bilibili)",
        r"(新浪|Sina)",
        r"(小红书|XHS|xhs)",
        r"(蔚来|NIO)",
        r"(理想汽车|Li Auto|理想)",
        r"(大疆|DJI|dji)",
    ]

    # 常见岗位模式
    position_patterns = [
        r"(前端|front-end|FrontEnd|FE)",
        r"(后端|back-end|BackEnd|BE|server)",
        r"(全栈|fullstack|full-stack)",
        r"(算法|ML|machine learning|AI)",
        r"(客户端|Android|iOS|移动端)",
        r"(测试|QA|test|QC)",
        r"(产品经理|PM|product)",
        r"(运营|operation)",
        r"(数据|data|analyst|数据分析师)",
        r"(DevOps|SRE|运维)",
        r"(安全|security)",
        r"(嵌入式|embedded)",
        r"(C\+\+|Java|Python|Go|后端开发)",
    ]

    company = ""
    for p in company_patterns:
        m = re.search(p, content, re.IGNORECASE)
        if m:
            company = m.group(1)
            break

    position = ""
    for p in position_patterns:
        m = re.search(p, content, re.IGNORECASE)
        if m:
            position = m.group(1)
            break

    return company, position


def clean_content(content: str) -> str:
    """清洗内容：去除水军标记、推广链接等"""
    # 去除 emoji（保留表情符号作为情感参考）
    content = re.sub(r"[\U0001F000-\U0001F9FF]", " ", content)  # 移除装饰性 emoji

    # 去除多余空白
    content = re.sub(r"\s+", " ", content).strip()

    # 去除常见推广话术
    spam_phrases = [
        "想要内推的可以加我微信",
        "有偿内推",
        "需要代面试辅导",
        "点击下方链接",
        "扫码领取",
        "评论区留言",
        "更多面经请关注",
    ]
    for phrase in spam_phrases:
        content = content.replace(phrase, "")

    return content.strip()


def process_record(
    record: dict,
    api_key: str
) -> CleanResult:
    """处理单条记录"""
    source_id = record.get("source_id", "")
    content = record.get("content", "")

    # 调用 MiniMax 判断
    ai_result = call_minimax_chat(content, api_key)

    # 提取公司/岗位
    extracted_company, extracted_position = extract_keywords(content)

    if ai_result:
        return CleanResult(
            source_id=source_id,
            is_valid=ai_result.get("is_valid", False),
            confidence=ai_result.get("confidence", 0.0),
            reason=ai_result.get("reason", ""),
            company=ai_result.get("extracted_company", "") or extracted_company,
            position=ai_result.get("extracted_position", "") or extracted_position,
            intent_tags=ai_result.get("intent_tags", []),
            cleaned_content=clean_content(content)
        )
    else:
        # API 失败时使用规则过滤
        is_valid = len(content) >= 150 and not any(
            phrase in content for phrase in ["加微信", "有偿", "点击链接", "扫码"]
        )
        return CleanResult(
            source_id=source_id,
            is_valid=is_valid,
            confidence=0.5,
            reason="规则过滤" if not is_valid else "默认通过",
            company=extracted_company,
            position=extracted_position,
            intent_tags=["面经"] if is_valid else ["碎碎念"],
            cleaned_content=clean_content(content)
        )


def process_jsonl(
    input_path: str,
    output_path: str,
    api_key: str,
    batch_size: int = 10
):
    """批量处理 JSONL 文件"""
    input_file = Path(input_path)
    if not input_file.exists():
        print(f"文件不存在: {input_path}")
        return

    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    results = []
    valid_count = 0
    total = 0

    with open(input_file, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f]

    print(f"开始处理 {len(records)} 条记录...")

    for i, record in enumerate(records):
        print(f"[{i+1}/{len(records)}] 处理中...", end="\r")
        result = process_record(record, api_key)
        results.append(result)
        if result.is_valid:
            valid_count += 1
        total += 1

        # 批量写入
        if (i + 1) % batch_size == 0:
            write_results(results, output_file)
            results = []

        # API 限速
        import time
        time.sleep(0.5)

    # 写入剩余结果
    if results:
        write_results(results, output_file)

    print(f"\n完成！通过 {valid_count}/{total} 条 ({100*valid_count/total:.1f}%)")


def write_results(results: list[CleanResult], output_file: Path):
    """写入结果到 JSONL"""
    with open(output_file, "a", encoding="utf-8") as f:
        for r in results:
            record = {
                "source_id": r.source_id,
                "is_valid": r.is_valid,
                "confidence": r.confidence,
                "reason": r.reason,
                "company": r.company,
                "position": r.position,
                "intent_tags": r.intent_tags,
                "cleaned_content": r.cleaned_content
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="MiniMax 内容质量过滤")
    parser.add_argument("--input", "-i", required=True, help="输入 JSONL 文件")
    parser.add_argument("--output", "-o", default="data/cleaned/output.jsonl", help="输出路径")
    parser.add_argument("--key", "-k", default=None, help="MiniMax API Key（可选，环境变量 MINIMAX_API_KEY）")
    args = parser.parse_args()

    api_key = args.key or MINIMAX_API_KEY
    if not api_key:
        print("错误: 需要设置 MINIMAX_API_KEY 环境变量")
        print("或使用 --key 参数传入")
        return

    process_jsonl(args.input, args.output, api_key)


if __name__ == "__main__":
    main()
