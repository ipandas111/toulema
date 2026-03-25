#!/usr/bin/env python3
"""
MiniMax 向量化服务
使用 MiniMax Embedding API 将文本转为向量，存入 Supabase
"""

import httpx
import os
import json
import argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# MiniMax API 配置
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY") or os.getenv("MINIMAX_TEXT_KEY")
MINIMAX_BASE_URL = "https://api.minimax.chat/v1"
MINIMAX_EMBED_MODEL = "embo01"  # MiniMax Embedding 模型

# Supabase 配置
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

# 向量维度（MiniMax emb01 是 1024 维）
EMBEDDING_DIM = 1024
BATCH_SIZE = 50  # 每批处理数量


def get_minimax_embedding(
    texts: list[str],
    api_key: str
) -> Optional[list[list[float]]]:
    """调用 MiniMax Embedding API"""
    if not api_key:
        print("错误: MINIMAX_API_KEY 未设置")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MINIMAX_EMBED_MODEL,
        "texts": texts
    }

    try:
        resp = httpx.post(
            f"{MINIMAX_BASE_URL}/embeddings",
            headers=headers,
            json=payload,
            timeout=60
        )
        resp.raise_for_status()
        result = resp.json()

        embeddings = []
        for item in result.get("data", []):
            embedding = item.get("embedding", [])
            if len(embedding) == EMBEDDING_DIM:
                embeddings.append(embedding)
            else:
                print(f"警告: 向量维度错误 {len(embedding)}，期望 {EMBEDDING_DIM}")
                embeddings.append([0.0] * EMBEDDING_DIM)  # 用零向量填充

        return embeddings

    except Exception as e:
        print(f"Embedding API 调用失败: {e}")
        return None


def get_supabase_client() -> Optional[Client]:
    """创建 Supabase 客户端"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("错误: SUPABASE_URL 或 SUPABASE_SERVICE_KEY 未设置")
        return None

    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Supabase 客户端创建失败: {e}")
        return None


def vectorize_and_store(
    input_path: str,
    batch_size: int = BATCH_SIZE
):
    """读取清洗后的数据，向量化，存入 Supabase"""
    input_file = Path(input_path)
    if not input_file.exists():
        print(f"文件不存在: {input_path}")
        return

    # 初始化客户端
    supabase = get_supabase_client()
    if not supabase:
        return

    # 读取数据
    with open(input_file, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f]

    print(f"开始向量化 {len(records)} 条记录...")

    total_vectorized = 0
    total_stored = 0

    for batch_start in range(0, len(records), batch_size):
        batch_end = min(batch_start + batch_size, len(records))
        batch = records[batch_start:batch_end]

        print(f"\n处理批次 {batch_start//batch_size + 1}/{(len(records)-1)//batch_size + 1} ({batch_start}-{batch_end})...")

        # 提取文本
        texts = []
        valid_indices = []
        for i, record in enumerate(batch):
            if record.get("is_valid") and record.get("cleaned_content"):
                texts.append(record["cleaned_content"][:4000])  # 限制长度
                valid_indices.append(i)
            else:
                print(f"  跳过无效记录: {record.get('source_id', 'unknown')}")

        if not texts:
            print("  本批次无有效数据")
            continue

        # 调用 Embedding API
        embeddings = get_minimax_embedding(texts, MINIMAX_API_KEY)
        if not embeddings:
            print("  Embedding API 失败，跳过本批次")
            continue

        total_vectorized += len(embeddings)

        # 准备入库数据
        experiences = []
        for i, embedding in enumerate(embeddings):
            record = batch[valid_indices[i]]

            exp = {
                "source": "niuke",  # 来源（后续扩展其他平台）
                "source_id": record.get("source_id", ""),
                "source_url": record.get("source_url", ""),
                "company": record.get("company", ""),
                "position": record.get("position", ""),
                "content": record.get("content", ""),
                "cleaned_content": record.get("cleaned_content", ""),
                "embedding": embedding,
                "quality_score": record.get("confidence", 0.5),
                "intent_tags": record.get("intent_tags", []),
                "is_valid": record.get("is_valid", True),
                "filter_reason": record.get("reason", ""),
                "view_count": record.get("view_count", 0),
                "like_count": record.get("like_count", 0),
            }
            experiences.append(exp)

        # 批量入库
        try:
            result = supabase.table("experiences").insert(experiences).execute()
            if result.data:
                total_stored += len(result.data)
                print(f"  成功入库 {len(result.data)} 条")
            else:
                print(f"  入库返回空，可能有重复: {result.error}")
        except Exception as e:
            print(f"  入库失败: {e}")

        # API 限速
        import time
        time.sleep(1)

    print(f"\n完成！共向量化 {total_vectorized} 条，入库 {total_stored} 条")


def main():
    parser = argparse.ArgumentParser(description="MiniMax 向量化服务")
    parser.add_argument("--input", "-i", required=True, help="清洗后的 JSONL 文件")
    parser.add_argument("--batch", "-b", type=int, default=BATCH_SIZE, help="批处理大小")
    args = parser.parse_args()

    if not MINIMAX_API_KEY:
        print("错误: 需要设置 MINIMAX_API_KEY 环境变量")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("错误: 需要设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 环境变量")
        return

    vectorize_and_store(args.input, args.batch)


if __name__ == "__main__":
    main()
