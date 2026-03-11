"""
search.py — Tavily 搜索服务
"""
import os
from typing import List, Dict, Any
from tavily import TavilyClient
from app.core.config import settings


class SearchService:
    def __init__(self):
        api_key = settings.tavily_api_key
        if not api_key:
            self.client = None
        else:
            self.client = TavilyClient(api_key=api_key)

    def search(
        self,
        query: str,
        search_type: str = "general",
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        执行搜索并返回结构化结果
        """
        if not self.client:
            return [{
                "platform": "ai_summary",
                "platformIcon": "⚠️",
                "title": "服务未配置",
                "content": "请在环境变量中配置 TAVILY_API_KEY",
                "url": "",
                "likes": 0,
                "comments": 0,
                "is_ai_summary": True
            }]

        # 根据搜索类型构建查询
        enhanced_query = self._build_query(query, search_type)

        try:
            results = self.client.search(
                query=enhanced_query,
                max_results=max_results,
                include_answer=True,
                include_raw_content=False,
                include_images=False
            )

            return self._format_results(results, search_type)
        except Exception as e:
            print(f"Search error: {e}")
            return []

    def _build_query(self, query: str, search_type: str) -> str:
        """根据搜索类型增强查询"""
        type_suffixes = {
            "experience": "面经 面试经验 知乎 牛客",
            "jd": "JD 职位描述 招聘要求",
            "growth": "发展路径 晋升 薪资涨幅 成长",
            "company": "公司评价 口碑 工作体验 知乎"
        }

        suffix = type_suffixes.get(search_type, "")
        if suffix:
            return f"{query} {suffix}"
        return query

    def _format_results(self, raw_results: Dict, search_type: str) -> List[Dict[str, Any]]:
        """格式化搜索结果"""
        formatted = []

        # 添加 AI 摘要（如果有）
        if raw_results.get("answer"):
            formatted.append({
                "platform": "ai_summary",
                "platformIcon": "🤖",
                "title": "AI 智能摘要",
                "content": raw_results["answer"],
                "url": "",
                "likes": 0,
                "comments": 0,
                "is_ai_summary": True
            })

        # 处理搜索结果
        for item in raw_results.get("results", []):
            # 判断平台
            url = item.get("url", "")
            platform_info = self._detect_platform(url)

            formatted.append({
                "platform": platform_info["platform"],
                "platformIcon": platform_info["icon"],
                "title": item.get("title", ""),
                "content": item.get("content", "")[:200] + "..." if len(item.get("content", "")) > 200 else item.get("content", ""),
                "url": url,
                "likes": 0,
                "comments": 0,
                "score": item.get("score", 0)
            })

        return formatted

    def _detect_platform(self, url: str) -> Dict[str, str]:
        """检测URL对应的平台"""
        url_lower = url.lower()

        if "xiaohongshu.com" in url_lower:
            return {"platform": "xiaohongshu", "icon": "📕"}
        elif "zhihu.com" in url_lower:
            return {"platform": "zhihu", "icon": "🟦"}
        elif "nowcoder.com" in url_lower or "niuke" in url_lower:
            return {"platform": "niuke", "icon": "🐂"}
        elif "liepin.com" in url_lower:
            return {"platform": "liepin", "icon": "💼"}
        elif "zhipin.com" in url_lower or "boss" in url_lower:
            return {"platform": "boss", "icon": "👔"}
        elif "linkedin.com" in url_lower:
            return {"platform": "linkedin", "icon": "💼"}
        else:
            return {"platform": "web", "icon": "🌐"}


# 全局单例
_search_service = None


def get_search_service() -> SearchService:
    global _search_service
    if _search_service is None:
        _search_service = SearchService()
    return _search_service
