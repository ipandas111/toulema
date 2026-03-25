#!/usr/bin/env python3
"""
牛客面经爬虫
使用牛客公开 API 抓取面经数据
"""

import httpx
import json
import time
import argparse
from typing import Iterator
from dataclasses import dataclass
from pathlib import Path

BASE_URL = "https://www.nowcoder.com"
SEARCH_API = "/api/search/front/search"
EXPERIENCE_API = "/aw/api/v1/answer/detail"  # 面经详情 API

@dataclass
class NiukeExperience:
    source_id: str
    title: str
    company: str
    position: str
    content: str
    author: str
    view_count: int
    like_count: int
    comment_count: int
    tags: list[str]
    created_at: str
    source_url: str


def search_experiences(
    keyword: str,
    search_type: str = "experience",
    page: int = 1,
    page_size: int = 20
) -> dict:
    """搜索牛客面经"""
    params = {
        "keyword": keyword,
        "type": search_type,
        "page": page,
        "pageSize": page_size,
        "sortType": "time_desc"  # 按时间倒序
    }
    try:
        resp = httpx.get(
            f"{BASE_URL}{SEARCH_API}",
            params=params,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": BASE_URL
            },
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"搜索失败: {e}")
        return {}


def get_experience_detail(experience_id: str) -> dict:
    """获取面经详情"""
    try:
        resp = httpx.get(
            f"{BASE_URL}{EXPERIENCE_API}",
            params={"id": experience_id},
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": f"{BASE_URL}/discuss/{experience_id}"
            },
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"获取详情失败 {experience_id}: {e}")
        return {}


def parse_search_result(item: dict) -> NiukeExperience | None:
    """解析搜索结果为 NiukeExperience"""
    try:
        return NiukeExperience(
            source_id=str(item.get("id", "")),
            title=item.get("title", ""),
            company=item.get("companyName", ""),
            position=item.get("positionName", ""),
            content=item.get("content", ""),
            author=item.get("authorName", ""),
            view_count=item.get("viewCount", 0) or 0,
            like_count=item.get("likeCount", 0) or 0,
            comment_count=item.get("commentCount", 0) or 0,
            tags=[t.get("tagName", "") for t in item.get("tags", []) if t.get("tagName")],
            created_at=item.get("createTime", ""),
            source_url=f"{BASE_URL}/discuss/{item.get('id', '')}"
        )
    except Exception as e:
        print(f"解析失败: {e}")
        return None


def scrape_by_company(
    company: str,
    max_count: int = 100,
    delay: float = 1.0
) -> Iterator[NiukeExperience]:
    """按公司名爬取面经"""
    page = 1
    total = 0

    while total < max_count:
        print(f"爬取 {company} 第 {page} 页...")
        result = search_experiences(company, page=page)

        if not result or result.get("code") != 0:
            print(f"API 返回错误: {result}")
            break

        items = result.get("data", {}).get("list", [])
        if not items:
            break

        for item in items:
            exp = parse_search_result(item)
            if exp and exp.content and len(exp.content) > 50:  # 过滤太短的内容
                yield exp
                total += 1
                if total >= max_count:
                    break

        time.sleep(delay)
        page += 1


def scrape_by_keyword(
    keyword: str,
    max_count: int = 100,
    delay: float = 1.0
) -> Iterator[NiukeExperience]:
    """按关键词爬取（公司+岗位）"""
    yield from scrape_by_company(keyword, max_count, delay)


def experiences_to_jsonl(experiences: list[NiukeExperience], output_path: str):
    """导出为 JSONL 格式"""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with open(output, "w", encoding="utf-8") as f:
        for exp in experiences:
            record = {
                "source": "niuke",
                "source_id": exp.source_id,
                "source_url": exp.source_url,
                "title": exp.title,
                "company": exp.company,
                "position": exp.position,
                "content": exp.content,
                "author": exp.author,
                "view_count": exp.view_count,
                "like_count": exp.like_count,
                "comment_count": exp.comment_count,
                "tags": exp.tags,
                "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"已保存 {len(experiences)} 条记录到 {output}")


def main():
    parser = argparse.ArgumentParser(description="牛客面经爬虫")
    parser.add_argument("--company", "-c", help="公司名", default="字节跳动")
    parser.add_argument("--keyword", "-k", help="关键词（公司或岗位）", default=None)
    parser.add_argument("--max", "-m", type=int, default=100, help="最大条数")
    parser.add_argument("--output", "-o", default="data/raw/niuke.jsonl", help="输出路径")
    parser.add_argument("--delay", "-d", type=float, default=1.0, help="请求间隔(秒)")
    args = parser.parse_args()

    keyword = args.keyword or args.company

    print(f"开始爬取: {keyword}, 目标: {args.max} 条")
    experiences = list(scrape_by_keyword(keyword, args.max, args.delay))

    if experiences:
        experiences_to_jsonl(experiences, args.output)
        print(f"完成！共爬取 {len(experiences)} 条面经")
    else:
        print("未爬取到任何数据")


if __name__ == "__main__":
    main()
