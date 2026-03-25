#!/usr/bin/env python3
"""
小红书面经爬虫
使用 Playwright 模拟浏览器抓取面经数据
"""

import json
import time
import argparse
import asyncio
import re
from typing import Iterator
from dataclasses import dataclass
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("请安装 playwright: pip install playwright && playwright install chromium")
    exit(1)

BASE_URL = "https://www.xiaohongshu.com"


@dataclass
class XHSExperience:
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


def extract_company_from_text(text: str) -> str:
    """从文本中提取公司名"""
    patterns = [
        r"(字节跳动|ByteDance|字节)", r"(腾讯|Tencent)",
        r"(阿里巴巴|Alibaba|阿里)", r"(美团|Meituan)",
        r"(京东|JD)", r"(百度|Baidu)", r"(华为|Huawei)",
        r"(小米|Xiaomi)", r"(拼多多|PDD)", r"(快手|Kuaishou)",
        r"(网易|NetEase)", r"(滴滴|Didi)", r"(携程|Ctrip)",
        r"(哔哩哔哩|B站|bilibili)", r"(小红书|XHS)",
        r"(蔚来|NIO)", r"(理想汽车|理想)", r"(大疆|DJI)",
        r"(微软|Microsoft)", r"(谷歌|Google)", r"(亚马逊|Amazon)",
        r"(苹果|Apple)", r"(Meta|Facebook)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


def extract_position_from_text(text: str) -> str:
    """从文本中提取岗位名"""
    patterns = [
        r"(前端|front-end|FE)", r"(后端|back-end|BE|server)",
        r"(全栈|fullstack)", r"(算法|ML|machine learning|AI)",
        r"(客户端|Android|iOS|移动端)", r"(测试|QA)",
        r"(产品经理|PM|product)", r"(数据|data|analyst)",
        r"(SRE|DevOps|运维)", r"(安全|security)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


async def scrape_xhs(
    keyword: str,
    max_count: int = 100,
    headless: bool = True,
    cookie_file: str = None
) -> list[XHSExperience]:
    """使用 Playwright 抓取小红书面经"""
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )

        # 加载 cookie（如果有）
        if cookie_file and Path(cookie_file).exists():
            with open(cookie_file, "r") as f:
                cookies = json.load(f)
                await context.add_cookies(cookies)

        page = await context.new_page()

        # 拦截 XHR 请求获取数据
        api_responses = []

        async def handle_response(response):
            url = response.url
            if "api/sns/web/v1/search/notes" in url:
                try:
                    data = await response.json()
                    api_responses.append(data)
                except:
                    pass

        page.on("response", handle_response)

        # 搜索面经
        search_url = f"{BASE_URL}/search_result?keyword={keyword}面经&type=1"
        await page.goto(search_url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)

        # 滚动加载更多
        scroll_count = 0
        max_scrolls = max_count // 20 + 1

        while len(results) < max_count and scroll_count < max_scrolls:
            # 解析当前页面的笔记卡片
            cards = await page.query_selector_all("section.note-item")

            for card in cards:
                try:
                    # 获取标题
                    title_el = await card.query_selector(".title span")
                    title = await title_el.inner_text() if title_el else ""

                    # 获取链接
                    link_el = await card.query_selector("a")
                    href = await link_el.get_attribute("href") if link_el else ""
                    note_id = href.split("/")[-1] if href else ""

                    # 获取作者
                    author_el = await card.query_selector(".author-wrapper .name")
                    author = await author_el.inner_text() if author_el else ""

                    # 获取点赞数
                    like_el = await card.query_selector(".like-wrapper span.count")
                    like_text = await like_el.inner_text() if like_el else "0"
                    like_count = parse_count(like_text)

                    if note_id and title:
                        exp = XHSExperience(
                            source_id=note_id,
                            title=title,
                            company=extract_company_from_text(title),
                            position=extract_position_from_text(title),
                            content=title,  # 列表页只有标题，详情需要点进去
                            author=author,
                            view_count=0,
                            like_count=like_count,
                            comment_count=0,
                            tags=[],
                            created_at="",
                            source_url=f"{BASE_URL}/explore/{note_id}"
                        )

                        # 避免重复
                        if not any(r.source_id == note_id for r in results):
                            results.append(exp)

                except Exception as e:
                    print(f"解析卡片失败: {e}")
                    continue

            # 滚动页面
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(2000)
            scroll_count += 1

            print(f"已抓取 {len(results)} 条，滚动 {scroll_count}/{max_scrolls}")

        # 抓取详情页
        print(f"\n开始抓取 {len(results)} 条笔记详情...")
        for i, exp in enumerate(results[:max_count]):
            try:
                await page.goto(exp.source_url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(1500)

                # 获取正文
                content_el = await page.query_selector("#detail-desc")
                if content_el:
                    exp.content = await content_el.inner_text()

                # 获取标签
                tag_els = await page.query_selector_all("#detail-desc a.tag")
                exp.tags = []
                for tag_el in tag_els:
                    tag_text = await tag_el.inner_text()
                    exp.tags.append(tag_text.strip("#"))

                # 重新提取公司和岗位（从正文）
                full_text = f"{exp.title} {exp.content}"
                if not exp.company:
                    exp.company = extract_company_from_text(full_text)
                if not exp.position:
                    exp.position = extract_position_from_text(full_text)

                print(f"  [{i+1}/{len(results)}] {exp.title[:30]}...")

            except Exception as e:
                print(f"  [{i+1}] 详情抓取失败: {e}")
                continue

            # 随机延迟防反爬
            await page.wait_for_timeout(1000 + (i % 3) * 500)

        # 从 API 响应中补充数据
        for api_data in api_responses:
            items = api_data.get("data", {}).get("items", [])
            for item in items:
                note = item.get("note_card", {})
                note_id = note.get("note_id", "")
                # 匹配已有结果，补充互动数据
                for exp in results:
                    if exp.source_id == note_id:
                        exp.like_count = note.get("interact_info", {}).get("liked_count", exp.like_count)
                        break

        await browser.close()

    return results[:max_count]


def parse_count(text: str) -> int:
    """解析数字（支持 '1.2万' 格式）"""
    text = text.strip()
    if not text or text == "0":
        return 0
    if "万" in text:
        try:
            return int(float(text.replace("万", "")) * 10000)
        except:
            return 0
    try:
        return int(text)
    except:
        return 0


def experiences_to_jsonl(experiences: list[XHSExperience], output_path: str):
    """导出为 JSONL 格式"""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with open(output, "w", encoding="utf-8") as f:
        for exp in experiences:
            record = {
                "source": "xiaohongshu",
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
    parser = argparse.ArgumentParser(description="小红书面经爬虫")
    parser.add_argument("--keyword", "-k", default="字节跳动", help="搜索关键词")
    parser.add_argument("--max", "-m", type=int, default=50, help="最大条数")
    parser.add_argument("--output", "-o", default="data/raw/xhs.jsonl", help="输出路径")
    parser.add_argument("--no-headless", action="store_true", help="显示浏览器窗口（调试用）")
    parser.add_argument("--cookie", "-c", default=None, help="cookie 文件路径（JSON格式）")
    args = parser.parse_args()

    print(f"开始爬取小红书: {args.keyword}, 目标: {args.max} 条")
    experiences = asyncio.run(
        scrape_xhs(args.keyword, args.max, headless=not args.no_headless, cookie_file=args.cookie)
    )

    if experiences:
        experiences_to_jsonl(experiences, args.output)
        print(f"完成！共爬取 {len(experiences)} 条面经")
    else:
        print("未爬取到任何数据，可能需要登录 cookie")


if __name__ == "__main__":
    main()
