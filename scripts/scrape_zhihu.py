#!/usr/bin/env python3
"""
知乎面经爬虫
抓取知乎面经相关问答
"""

import httpx
import json
import time
import argparse
import re
from typing import Iterator
from dataclasses import dataclass
from pathlib import Path

BASE_URL = "https://www.zhihu.com"
SEARCH_API = "https://www.zhihu.com/api/v4/search_v3"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.zhihu.com/search",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


@dataclass
class ZhihuExperience:
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


def extract_company(text: str) -> str:
    """提取公司名"""
    patterns = [
        r"(字节跳动|ByteDance|字节)", r"(腾讯|Tencent)",
        r"(阿里巴巴|Alibaba|阿里)", r"(美团|Meituan)",
        r"(京东|JD)", r"(百度|Baidu)", r"(华为|Huawei)",
        r"(小米|Xiaomi)", r"(拼多多|PDD)", r"(快手|Kuaishou)",
        r"(网易|NetEase)", r"(滴滴|Didi)", r"(携程|Ctrip)",
        r"(哔哩哔哩|B站|bilibili)", r"(蔚来|NIO)",
        r"(理想汽车|理想)", r"(大疆|DJI)",
        r"(微软|Microsoft)", r"(谷歌|Google)", r"(亚马逊|Amazon)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


def extract_position(text: str) -> str:
    """提取岗位名"""
    patterns = [
        r"(前端|front-end|FE)", r"(后端|back-end|BE|server)",
        r"(全栈|fullstack)", r"(算法|ML|AI)",
        r"(客户端|Android|iOS)", r"(测试|QA)",
        r"(产品经理|PM)", r"(数据|data|analyst)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


def strip_html(text: str) -> str:
    """去除 HTML 标签"""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&\w+;", " ", text)
    return text.strip()


def search_zhihu(
    keyword: str,
    search_type: str = "general",
    page: int = 1,
    page_size: int = 20,
    cookie: str = None
) -> dict:
    """搜索知乎"""
    params = {
        "t": search_type,
        "q": keyword,
        "correction": 1,
        "offset": (page - 1) * page_size,
        "limit": page_size,
    }

    headers = {**HEADERS}
    if cookie:
        headers["Cookie"] = cookie

    try:
        resp = httpx.get(
            SEARCH_API,
            params=params,
            headers=headers,
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"搜索失败: {e}")
        return {}


def get_answer_detail(answer_id: str, cookie: str = None) -> dict:
    """获取回答详情"""
    url = f"https://www.zhihu.com/api/v4/answers/{answer_id}"
    params = {"include": "content,voteup_count,comment_count"}

    headers = {**HEADERS}
    if cookie:
        headers["Cookie"] = cookie

    try:
        resp = httpx.get(url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"获取回答详情失败 {answer_id}: {e}")
        return {}


def parse_search_item(item: dict) -> ZhihuExperience | None:
    """解析搜索结果"""
    try:
        obj = item.get("object", {})
        item_type = item.get("type", "")

        if item_type == "search_result":
            obj = item.get("object", {})

        title = strip_html(obj.get("title", "") or obj.get("question", {}).get("title", ""))
        content = strip_html(obj.get("content", "") or obj.get("excerpt", ""))
        author_info = obj.get("author", {})

        source_id = str(obj.get("id", ""))
        source_url = ""

        if obj.get("type") == "answer":
            question_id = obj.get("question", {}).get("id", "")
            source_url = f"https://www.zhihu.com/question/{question_id}/answer/{source_id}"
        elif obj.get("type") == "article":
            source_url = f"https://zhuanlan.zhihu.com/p/{source_id}"
        else:
            source_url = f"https://www.zhihu.com/question/{source_id}"

        full_text = f"{title} {content}"

        return ZhihuExperience(
            source_id=source_id,
            title=title,
            company=extract_company(full_text),
            position=extract_position(full_text),
            content=content,
            author=author_info.get("name", ""),
            view_count=0,
            like_count=obj.get("voteup_count", 0) or 0,
            comment_count=obj.get("comment_count", 0) or 0,
            tags=[],
            created_at=str(obj.get("created_time", "")),
            source_url=source_url
        )
    except Exception as e:
        print(f"解析失败: {e}")
        return None


def scrape_by_keyword(
    keyword: str,
    max_count: int = 100,
    delay: float = 2.0,
    cookie: str = None
) -> list[ZhihuExperience]:
    """按关键词爬取"""
    results = []
    page = 1
    seen_ids = set()

    while len(results) < max_count:
        print(f"搜索 '{keyword}' 第 {page} 页...")
        data = search_zhihu(keyword, page=page, cookie=cookie)

        if not data:
            break

        items = data.get("data", [])
        if not items:
            break

        for item in items:
            exp = parse_search_item(item)
            if exp and exp.source_id not in seen_ids and exp.content and len(exp.content) > 50:
                seen_ids.add(exp.source_id)
                results.append(exp)
                if len(results) >= max_count:
                    break

        # 检查是否有下一页
        paging = data.get("paging", {})
        if paging.get("is_end", True):
            break

        time.sleep(delay)
        page += 1

    return results


def experiences_to_jsonl(experiences: list[ZhihuExperience], output_path: str):
    """导出为 JSONL 格式"""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with open(output, "w", encoding="utf-8") as f:
        for exp in experiences:
            record = {
                "source": "zhihu",
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
    parser = argparse.ArgumentParser(description="知乎面经爬虫")
    parser.add_argument("--keyword", "-k", default="字节跳动 面经", help="搜索关键词")
    parser.add_argument("--max", "-m", type=int, default=100, help="最大条数")
    parser.add_argument("--output", "-o", default="data/raw/zhihu.jsonl", help="输出路径")
    parser.add_argument("--delay", "-d", type=float, default=2.0, help="请求间隔(秒)")
    parser.add_argument("--cookie", "-c", default=None, help="知乎 cookie 字符串")
    args = parser.parse_args()

    print(f"开始爬取知乎: {args.keyword}, 目标: {args.max} 条")
    experiences = scrape_by_keyword(args.keyword, args.max, args.delay, args.cookie)

    if experiences:
        experiences_to_jsonl(experiences, args.output)
        print(f"完成！共爬取 {len(experiences)} 条面经")
    else:
        print("未爬取到任何数据，可能需要提供 cookie")


if __name__ == "__main__":
    main()
