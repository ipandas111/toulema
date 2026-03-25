#!/usr/bin/env python3
"""
并行抓取所有平台面经
统一调度 → 清洗 → 向量化 → 入库
"""

import asyncio
import subprocess
import sys
import time
import argparse
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_CLEANED = PROJECT_ROOT / "data" / "cleaned"

# 要爬取的公司列表
DEFAULT_COMPANIES = [
    "字节跳动", "腾讯", "阿里巴巴", "美团", "京东",
    "百度", "华为", "小米", "拼多多", "快手",
    "网易", "滴滴", "携程", "哔哩哔哩", "大疆",
]


def run_scraper(platform: str, keyword: str, max_count: int, output_dir: Path):
    """运行单个爬虫"""
    output_file = output_dir / f"{platform}_{keyword}.jsonl"
    script = PROJECT_ROOT / "scripts" / f"scrape_{platform}.py"

    if not script.exists():
        print(f"  跳过 {platform}: 脚本不存在")
        return False

    cmd = [
        sys.executable, str(script),
        "--keyword" if platform != "niuke" else "--company", keyword,
        "--max", str(max_count),
        "--output", str(output_file)
    ]

    try:
        print(f"  [{platform}] 开始爬取: {keyword}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode == 0:
            print(f"  [{platform}] 完成: {keyword}")
            return True
        else:
            print(f"  [{platform}] 失败: {result.stderr[:200]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  [{platform}] 超时: {keyword}")
        return False
    except Exception as e:
        print(f"  [{platform}] 错误: {e}")
        return False


def run_cleaner(input_dir: Path, output_dir: Path):
    """运行清洗服务"""
    cleaner_script = PROJECT_ROOT / "services" / "cleaner.py"
    input_files = list(input_dir.glob("*.jsonl"))

    if not input_files:
        print("没有原始数据文件")
        return

    for input_file in input_files:
        output_file = output_dir / input_file.name
        cmd = [
            sys.executable, str(cleaner_script),
            "--input", str(input_file),
            "--output", str(output_file)
        ]

        print(f"清洗: {input_file.name}")
        try:
            subprocess.run(cmd, timeout=600)
        except Exception as e:
            print(f"清洗失败 {input_file.name}: {e}")


def run_vectorizer(input_dir: Path):
    """运行向量化服务"""
    vectorizer_script = PROJECT_ROOT / "services" / "vectorizer.py"
    input_files = list(input_dir.glob("*.jsonl"))

    if not input_files:
        print("没有清洗后的数据文件")
        return

    for input_file in input_files:
        cmd = [
            sys.executable, str(vectorizer_script),
            "--input", str(input_file)
        ]

        print(f"向量化: {input_file.name}")
        try:
            subprocess.run(cmd, timeout=600)
        except Exception as e:
            print(f"向量化失败 {input_file.name}: {e}")


def main():
    parser = argparse.ArgumentParser(description="全平台面经爬取调度器")
    parser.add_argument("--companies", "-c", nargs="+", default=DEFAULT_COMPANIES, help="要爬取的公司列表")
    parser.add_argument("--platforms", "-p", nargs="+", default=["niuke", "zhihu"], help="平台列表 (niuke/zhihu/xhs)")
    parser.add_argument("--max", "-m", type=int, default=50, help="每个公司每个平台最大条数")
    parser.add_argument("--skip-scrape", action="store_true", help="跳过爬取，只做清洗和向量化")
    parser.add_argument("--skip-clean", action="store_true", help="跳过清洗")
    parser.add_argument("--skip-vectorize", action="store_true", help="跳过向量化")
    args = parser.parse_args()

    # 创建目录
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    DATA_CLEANED.mkdir(parents=True, exist_ok=True)

    start_time = time.time()

    # Phase 1: 爬取
    if not args.skip_scrape:
        print("=" * 50)
        print("Phase 1: 爬取面经数据")
        print("=" * 50)

        for company in args.companies:
            print(f"\n--- {company} ---")
            for platform in args.platforms:
                run_scraper(platform, company, args.max, DATA_RAW)
                time.sleep(1)  # 平台间间隔

    # Phase 2: 清洗
    if not args.skip_clean:
        print("\n" + "=" * 50)
        print("Phase 2: MiniMax 质量过滤")
        print("=" * 50)
        run_cleaner(DATA_RAW, DATA_CLEANED)

    # Phase 3: 向量化入库
    if not args.skip_vectorize:
        print("\n" + "=" * 50)
        print("Phase 3: 向量化入库 Supabase")
        print("=" * 50)
        run_vectorizer(DATA_CLEANED)

    elapsed = time.time() - start_time
    print(f"\n全部完成！耗时 {elapsed:.1f} 秒")


if __name__ == "__main__":
    main()
