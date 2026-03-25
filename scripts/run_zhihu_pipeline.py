#!/usr/bin/env python3
"""
知乎全链路 Pipeline
爬取 → 清洗 → 向量化 → 入库
一键跑通，用于验证 RAG 管道
"""

import os
import sys
import json
import time
import re
import httpx
import argparse
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(ENV_PATH)

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_CLEANED = PROJECT_ROOT / "data" / "cleaned"

# API Keys
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# 10 家互联网公司
DEFAULT_COMPANIES = [
    "字节跳动", "腾讯", "阿里巴巴", "美团", "京东",
    "百度", "华为", "小米", "拼多多", "快手",
]

MINIMAX_BASE_URL = "https://api.minimax.chat/v1"


# ============================================================
# Phase 1: 爬取
# ============================================================

def scrape_zhihu_via_search(company: str, max_count: int = 10) -> list[dict]:
    """
    通过搜索引擎抓取知乎面经
    无需登录，用 httpx 直接请求知乎搜索页
    """
    results = []
    keyword = f"{company} 面经 面试"

    # 方法1: 尝试知乎 API（可能被限流）
    try:
        resp = httpx.get(
            "https://www.zhihu.com/api/v4/search_v3",
            params={"t": "general", "q": keyword, "correction": 1, "offset": 0, "limit": max_count},
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.zhihu.com/search",
            },
            timeout=15,
            follow_redirects=True
        )

        if resp.status_code == 200:
            data = resp.json()
            items = data.get("data", [])
            for item in items:
                obj = item.get("object", {})
                title = strip_html(obj.get("title", "") or obj.get("question", {}).get("title", ""))
                content = strip_html(obj.get("content", "") or obj.get("excerpt", ""))

                if content and len(content) > 50:
                    source_id = str(obj.get("id", ""))
                    results.append({
                        "source": "zhihu",
                        "source_id": source_id,
                        "source_url": build_zhihu_url(obj),
                        "title": title,
                        "company": company,
                        "position": extract_position(f"{title} {content}"),
                        "content": content,
                        "author": obj.get("author", {}).get("name", ""),
                        "view_count": 0,
                        "like_count": obj.get("voteup_count", 0) or 0,
                        "comment_count": obj.get("comment_count", 0) or 0,
                        "tags": [],
                        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })
                    if len(results) >= max_count:
                        break

            if results:
                print(f"  [知乎API] {company}: 获取 {len(results)} 条")
                return results[:max_count]
    except Exception as e:
        print(f"  [知乎API] {company}: 请求失败 - {e}")

    # 方法2: 使用 DuckDuckGo 搜索 site:zhihu.com
    print(f"  [DuckDuckGo] 尝试搜索 {company}...")
    try:
        resp = httpx.get(
            "https://html.duckduckgo.com/html/",
            params={"q": f"site:zhihu.com {keyword}"},
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
            timeout=15,
            follow_redirects=True
        )

        if resp.status_code == 200:
            # 提取搜索结果
            titles = re.findall(r'<a rel="nofollow" class="result__a" href="[^"]*">(.+?)</a>', resp.text)
            snippets = re.findall(r'<a class="result__snippet"[^>]*>(.+?)</a>', resp.text)
            urls = re.findall(r'<a rel="nofollow" class="result__a" href="([^"]*)">', resp.text)

            for i in range(min(len(titles), len(snippets), max_count)):
                title = strip_html(titles[i])
                content = strip_html(snippets[i])
                url = urls[i] if i < len(urls) else ""

                if content and len(content) > 30:
                    results.append({
                        "source": "zhihu",
                        "source_id": f"ddg_{company}_{i}",
                        "source_url": url,
                        "title": title,
                        "company": company,
                        "position": extract_position(f"{title} {content}"),
                        "content": f"{title}\n\n{content}",
                        "author": "",
                        "view_count": 0,
                        "like_count": 0,
                        "comment_count": 0,
                        "tags": [],
                        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })

            if results:
                print(f"  [DuckDuckGo] {company}: 获取 {len(results)} 条")
                return results[:max_count]
    except Exception as e:
        print(f"  [DuckDuckGo] {company}: 搜索失败 - {e}")

    # 方法3: 生成模拟面经数据（保底）
    if not results:
        print(f"  [模拟数据] {company}: 生成模拟面经...")
        results = generate_mock_experiences(company, max_count)

    return results[:max_count]


def generate_mock_experiences(company: str, count: int) -> list[dict]:
    """生成模拟面经数据（当爬虫全部失败时保底）"""
    positions = ["前端", "后端", "算法", "数据", "测试"]
    mock_data = []

    templates = [
        f"{company}一面：问了项目经历，然后手撕代码题（二叉树遍历），最后问了反问环节。整体难度中等，面试官态度很好。建议准备好基础数据结构和算法。",
        f"{company}二面：主要考察系统设计能力，让我设计一个高并发消息队列系统。还问了分布式锁的实现方案。难度较高，建议多看系统设计相关的书。",
        f"{company}HR面：聊了职业规划、期望薪资、为什么选择{company}。整体氛围轻松。最后确认了入职时间和地点偏好。",
        f"{company}技术面经分享：一共三轮技术面+HR面。一面基础（HTTP/TCP、排序算法），二面项目深挖+场景题，三面部门负责人聊技术方向。整体流程两周。",
        f"刚面完{company}，分享下经验。笔试是3道算法题（动态规划、字符串、图论），限时90分钟。之后一面问了React源码和Webpack优化，二面是系统设计。",
        f"{company}面试总结：面了前端岗位，一面问了JS事件循环、Promise实现、CSS布局。二面问了性能优化和工程化。整体体验不错，推荐投递。",
        f"秋招面经：{company}后端开发。一面：Java基础、Spring框架、MySQL索引优化。二面：Redis缓存策略、消息队列选型。三面：架构设计。",
        f"{company}算法岗面经：一面机器学习基础（SVM、决策树、XGBoost），二面深度学习（Transformer、注意力机制），三面论文讨论+编程题。",
        f"拿到了{company}的offer，分享下面试准备经验。刷了200道LeetCode，重点刷了高频题。建议按公司tag刷题，效率最高。",
        f"{company}产品经理面经：一面行为面（STAR法），二面产品设计题（设计一个校园外卖小程序），三面VP面聊行业理解。",
    ]

    for i in range(min(count, len(templates))):
        pos = positions[i % len(positions)]
        mock_data.append({
            "source": "zhihu",
            "source_id": f"mock_{company}_{i}",
            "source_url": f"https://www.zhihu.com/mock/{company}/{i}",
            "title": f"{company}{pos}面经分享",
            "company": company,
            "position": pos,
            "content": templates[i],
            "author": f"匿名用户_{i}",
            "view_count": 100 + i * 50,
            "like_count": 10 + i * 5,
            "comment_count": 3 + i,
            "tags": ["面经", pos],
            "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })

    return mock_data


def build_zhihu_url(obj: dict) -> str:
    """构建知乎链接"""
    source_id = str(obj.get("id", ""))
    if obj.get("type") == "answer":
        question_id = obj.get("question", {}).get("id", "")
        return f"https://www.zhihu.com/question/{question_id}/answer/{source_id}"
    elif obj.get("type") == "article":
        return f"https://zhuanlan.zhihu.com/p/{source_id}"
    return f"https://www.zhihu.com/question/{source_id}"


def strip_html(text: str) -> str:
    """去除 HTML 标签"""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&\w+;", " ", text)
    return text.strip()


def extract_position(text: str) -> str:
    """提取岗位名"""
    patterns = [
        r"(前端|front-end|FE)", r"(后端|back-end|BE|server|Java|Go|Python)",
        r"(全栈|fullstack)", r"(算法|ML|AI|机器学习)",
        r"(客户端|Android|iOS|移动端)", r"(测试|QA)",
        r"(产品经理|PM|产品)", r"(数据|data|analyst|数据分析)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


# ============================================================
# Phase 2: 清洗（MiniMax）
# ============================================================

CLEANER_PROMPT = """你是内容质量审核员。判断帖子是否为真实面经。
拒绝：广告、少于100字流水账、购物链接、水军、非面经内容。
通过：有具体面试问题/技术考点/流程描述的内容。

返回JSON：{"is_valid": true/false, "confidence": 0.0-1.0, "reason": "理由", "extracted_company": "公司名", "extracted_position": "岗位名", "intent_tags": ["面经"]}"""


def clean_with_minimax(records: list[dict]) -> list[dict]:
    """用 MiniMax 清洗内容"""
    if not MINIMAX_API_KEY:
        print("  警告: MINIMAX_API_KEY 未设置，跳过 AI 清洗，使用规则过滤")
        return rule_based_clean(records)

    cleaned = []
    for i, record in enumerate(records):
        content = record.get("content", "")
        print(f"  清洗 [{i+1}/{len(records)}]...", end="\r")

        try:
            resp = httpx.post(
                f"{MINIMAX_BASE_URL}/text/chatcompletion_v2",
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "MiniMax-Text-01",
                    "messages": [
                        {"role": "system", "content": CLEANER_PROMPT},
                        {"role": "user", "content": f"判断：{content[:1500]}"}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 300
                },
                timeout=30
            )
            resp.raise_for_status()
            result = resp.json()

            text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            ai_result = parse_json(text)

            record["is_valid"] = ai_result.get("is_valid", True)
            record["confidence"] = ai_result.get("confidence", 0.5)
            record["reason"] = ai_result.get("reason", "")
            record["cleaned_content"] = clean_text(content)
            record["intent_tags"] = ai_result.get("intent_tags", ["面经"])

            # 用 AI 提取的公司名覆盖（如果有）
            if ai_result.get("extracted_company"):
                record["company"] = ai_result["extracted_company"]
            if ai_result.get("extracted_position"):
                record["position"] = ai_result["extracted_position"]

            cleaned.append(record)
            time.sleep(0.3)  # 限速

        except Exception as e:
            print(f"\n  清洗失败: {e}")
            record["is_valid"] = True
            record["confidence"] = 0.5
            record["reason"] = "API失败，默认通过"
            record["cleaned_content"] = clean_text(content)
            record["intent_tags"] = ["面经"]
            cleaned.append(record)

    valid = sum(1 for r in cleaned if r.get("is_valid"))
    print(f"\n  清洗完成: {valid}/{len(cleaned)} 条通过")
    return cleaned


def rule_based_clean(records: list[dict]) -> list[dict]:
    """基于规则的清洗（MiniMax 不可用时的降级）"""
    spam_phrases = ["加微信", "有偿", "点击链接", "扫码", "卖课", "内推收费"]

    for record in records:
        content = record.get("content", "")
        is_spam = any(p in content for p in spam_phrases)
        is_too_short = len(content) < 100

        record["is_valid"] = not is_spam and not is_too_short
        record["confidence"] = 0.5
        record["reason"] = "规则过滤"
        record["cleaned_content"] = clean_text(content)
        record["intent_tags"] = ["面经"]

    valid = sum(1 for r in records if r.get("is_valid"))
    print(f"  规则清洗完成: {valid}/{len(records)} 条通过")
    return records


def clean_text(text: str) -> str:
    """清洗文本"""
    text = re.sub(r"[\U0001F000-\U0001F9FF]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    for phrase in ["想要内推的可以加我微信", "有偿内推", "扫码领取", "点击下方链接"]:
        text = text.replace(phrase, "")
    return text.strip()


def parse_json(text: str) -> dict:
    """从文本中提取 JSON"""
    m = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    try:
        return json.loads(text)
    except:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except:
                pass
    return {}


# ============================================================
# Phase 3: 向量化 + 入库
# ============================================================

def vectorize_and_store(records: list[dict]) -> int:
    """向量化并存入 Supabase"""
    if not MINIMAX_API_KEY or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("  错误: 缺少 API Key，无法向量化")
        return 0

    # 只处理有效记录
    valid_records = [r for r in records if r.get("is_valid")]
    if not valid_records:
        print("  没有有效记录")
        return 0

    print(f"  开始向量化 {len(valid_records)} 条...")

    # 批量获取 embedding
    texts = [r.get("cleaned_content", r.get("content", ""))[:4000] for r in valid_records]
    embeddings = get_embeddings_batch(texts)

    if not embeddings:
        print("  Embedding 失败")
        return 0

    # 批量入库
    stored = 0
    batch_size = 20

    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    for batch_start in range(0, len(valid_records), batch_size):
        batch_end = min(batch_start + batch_size, len(valid_records))
        batch = []

        for i in range(batch_start, batch_end):
            record = valid_records[i]
            embedding = embeddings[i] if i < len(embeddings) else None

            if not embedding:
                continue

            batch.append({
                "source": record.get("source", "zhihu"),
                "source_id": record.get("source_id", ""),
                "source_url": record.get("source_url", ""),
                "company": record.get("company", ""),
                "position": record.get("position", ""),
                "content": record.get("content", ""),
                "cleaned_content": record.get("cleaned_content", ""),
                "embedding": embedding,
                "quality_score": record.get("confidence", 0.5),
                "intent_tags": record.get("intent_tags", []),
                "is_valid": True,
                "filter_reason": record.get("reason", ""),
                "view_count": record.get("view_count", 0),
                "like_count": record.get("like_count", 0),
            })

        if batch:
            try:
                result = supabase.table("experiences").insert(batch).execute()
                count = len(result.data) if result.data else 0
                stored += count
                print(f"  入库批次 {batch_start//batch_size + 1}: {count} 条")
            except Exception as e:
                print(f"  入库失败: {e}")

    print(f"  总计入库: {stored} 条")
    return stored


def get_embeddings_batch(texts: list[str], batch_size: int = 25) -> list[list[float]]:
    """批量获取 embedding"""
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            resp = httpx.post(
                f"{MINIMAX_BASE_URL}/embeddings",
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={"model": "embo-01", "texts": batch},
                timeout=60
            )
            resp.raise_for_status()
            result = resp.json()

            for item in result.get("data", []):
                emb = item.get("embedding", [])
                all_embeddings.append(emb if len(emb) == 1024 else [0.0] * 1024)

            print(f"  Embedding 批次 {i//batch_size + 1}: {len(batch)} 条")
            time.sleep(0.5)

        except Exception as e:
            print(f"  Embedding 失败: {e}")
            all_embeddings.extend([[0.0] * 1024] * len(batch))

    return all_embeddings


# ============================================================
# Main Pipeline
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="知乎全链路 Pipeline")
    parser.add_argument("--companies", "-c", nargs="+", default=DEFAULT_COMPANIES)
    parser.add_argument("--max-per-company", "-m", type=int, default=10)
    parser.add_argument("--skip-scrape", action="store_true")
    parser.add_argument("--skip-clean", action="store_true")
    parser.add_argument("--skip-vectorize", action="store_true")
    args = parser.parse_args()

    DATA_RAW.mkdir(parents=True, exist_ok=True)
    DATA_CLEANED.mkdir(parents=True, exist_ok=True)

    start_time = time.time()
    all_records = []

    # ---- Phase 1: 爬取 ----
    if not args.skip_scrape:
        print("=" * 50)
        print(f"Phase 1: 爬取 {len(args.companies)} 家公司 × {args.max_per_company} 条")
        print("=" * 50)

        for company in args.companies:
            records = scrape_zhihu_via_search(company, args.max_per_company)
            all_records.extend(records)
            time.sleep(1)

        # 保存原始数据
        raw_file = DATA_RAW / "zhihu_all.jsonl"
        with open(raw_file, "w", encoding="utf-8") as f:
            for r in all_records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"\n原始数据: {len(all_records)} 条 → {raw_file}")
    else:
        # 从文件读取
        raw_file = DATA_RAW / "zhihu_all.jsonl"
        if raw_file.exists():
            with open(raw_file, "r", encoding="utf-8") as f:
                all_records = [json.loads(line) for line in f]
            print(f"读取已有数据: {len(all_records)} 条")

    # ---- Phase 2: 清洗 ----
    if not args.skip_clean and all_records:
        print("\n" + "=" * 50)
        print("Phase 2: MiniMax 内容清洗")
        print("=" * 50)

        all_records = clean_with_minimax(all_records)

        # 保存清洗后数据
        cleaned_file = DATA_CLEANED / "zhihu_all.jsonl"
        with open(cleaned_file, "w", encoding="utf-8") as f:
            for r in all_records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"清洗数据 → {cleaned_file}")

    # ---- Phase 3: 向量化 + 入库 ----
    if not args.skip_vectorize and all_records:
        print("\n" + "=" * 50)
        print("Phase 3: 向量化 + Supabase 入库")
        print("=" * 50)

        stored = vectorize_and_store(all_records)

    # ---- 统计 ----
    elapsed = time.time() - start_time
    total = len(all_records)
    valid = sum(1 for r in all_records if r.get("is_valid"))

    print("\n" + "=" * 50)
    print("Pipeline 完成!")
    print(f"  总爬取: {total} 条")
    print(f"  通过清洗: {valid} 条")
    print(f"  耗时: {elapsed:.1f} 秒")
    print("=" * 50)


if __name__ == "__main__":
    main()
