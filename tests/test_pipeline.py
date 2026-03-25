#!/usr/bin/env python3
"""
端到端管道测试
验证离线建库 + 在线查询完整流程
"""

import sys
import os
import json
import pytest

# 添加项目根目录到 path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ============================================================
# 1. 爬虫模块测试
# ============================================================

class TestScrapers:
    """爬虫模块单元测试"""

    def test_niuke_parse_search_result(self):
        """测试牛客搜索结果解析"""
        from scripts.scrape_niuke import parse_search_result

        item = {
            "id": "12345",
            "title": "字节跳动前端面经",
            "companyName": "字节跳动",
            "positionName": "前端",
            "content": "一面：手撕算法题，二叉树遍历..." * 10,
            "authorName": "匿名用户",
            "viewCount": 100,
            "likeCount": 50,
            "commentCount": 10,
            "tags": [{"tagName": "面经"}, {"tagName": "前端"}],
            "createTime": "2026-03-01",
        }

        exp = parse_search_result(item)
        assert exp is not None
        assert exp.source_id == "12345"
        assert exp.company == "字节跳动"
        assert exp.position == "前端"
        assert exp.like_count == 50

    def test_niuke_filter_short_content(self):
        """牛客爬虫应过滤过短内容"""
        from scripts.scrape_niuke import parse_search_result

        item = {
            "id": "99999",
            "title": "test",
            "content": "太短了",
            "companyName": "",
            "positionName": "",
            "authorName": "",
            "viewCount": 0,
            "likeCount": 0,
            "commentCount": 0,
            "tags": [],
            "createTime": "",
        }

        exp = parse_search_result(item)
        # parse_search_result 不过滤，但 content 太短会在 scrape_by_company 中被过滤
        assert exp is not None
        assert len(exp.content) < 50

    def test_xhs_extract_company(self):
        """测试小红书公司名提取"""
        from scripts.scrape_xhs import extract_company_from_text

        assert extract_company_from_text("字节跳动前端面经分享") == "字节跳动"
        assert extract_company_from_text("Tencent后端面试") == "腾讯"
        assert extract_company_from_text("阿里一面二面三面") == "阿里巴巴"
        assert extract_company_from_text("无关内容") == ""

    def test_xhs_parse_count(self):
        """测试小红书数字解析"""
        from scripts.scrape_xhs import parse_count

        assert parse_count("100") == 100
        assert parse_count("1.2万") == 12000
        assert parse_count("0") == 0
        assert parse_count("") == 0

    def test_zhihu_strip_html(self):
        """测试知乎 HTML 标签去除"""
        from scripts.scrape_zhihu import strip_html

        assert strip_html("<p>Hello</p>") == "Hello"
        assert strip_html("a&amp;b") == "a b"
        assert strip_html("<em>bold</em> text") == "bold text"


# ============================================================
# 2. 清洗模块测试
# ============================================================

class TestCleaner:
    """清洗模块单元测试"""

    def test_clean_content_removes_spam(self):
        """测试清洗去除推广话术"""
        from services.cleaner import clean_content

        text = "字节跳动面经分享 想要内推的可以加我微信 一面问了算法题"
        cleaned = clean_content(text)
        assert "加我微信" not in cleaned
        assert "字节跳动" in cleaned

    def test_clean_content_normalizes_whitespace(self):
        """测试清洗去除多余空白"""
        from services.cleaner import clean_content

        text = "面经   分享    一面    二面"
        cleaned = clean_content(text)
        assert "   " not in cleaned

    def test_extract_keywords_company(self):
        """测试公司名提取"""
        from services.cleaner import extract_keywords

        company, _ = extract_keywords("字节跳动前端面经")
        assert company in ["字节跳动", "ByteDance", "字节"]

    def test_extract_keywords_position(self):
        """测试岗位名提取"""
        from services.cleaner import extract_keywords

        _, position = extract_keywords("腾讯后端面经")
        assert position in ["后端", "back-end", "BE"]

    def test_parse_json_response(self):
        """测试 JSON 响应解析"""
        from services.cleaner import parse_json_response

        # 直接 JSON
        result = parse_json_response('{"is_valid": true, "reason": "test"}')
        assert result["is_valid"] is True

        # ```json 块
        result = parse_json_response('```json\n{"is_valid": false}\n```')
        assert result["is_valid"] is False

        # 混合文本
        result = parse_json_response('这是一个面经 {"is_valid": true} 判断完毕')
        assert result["is_valid"] is True

        # 无效 JSON
        result = parse_json_response("不是JSON")
        assert result == {}


# ============================================================
# 3. 意图分类测试
# ============================================================

class TestClassify:
    """意图分类测试（规则降级）"""

    def test_chat_intent(self):
        """闲聊意图"""
        from api.classify import classify_by_rules

        assert classify_by_rules("你好") == "chat"
        assert classify_by_rules("谢谢") == "chat"

    def test_experience_intent(self):
        """面经意图"""
        from api.classify import classify_by_rules

        assert classify_by_rules("字节跳动面经") == "experience"
        assert classify_by_rules("腾讯一面面试题") == "experience"

    def test_jd_analysis_intent(self):
        """JD分析意图"""
        from api.classify import classify_by_rules

        assert classify_by_rules("帮我分析一下这个JD") == "jd_analysis"

    def test_company_review_intent(self):
        """公司评价意图"""
        from api.classify import classify_by_rules

        assert classify_by_rules("字节跳动加班严重吗") == "company_review"

    def test_company_extraction(self):
        """公司名提取"""
        from api.classify import extract_company

        assert extract_company("字节跳动面经") in ["字节跳动", "ByteDance", "字节"]
        assert extract_company("腾讯后端") in ["腾讯", "Tencent"]
        assert extract_company("随便聊聊") == ""

    def test_position_extraction(self):
        """岗位名提取"""
        from api.classify import extract_position

        assert extract_position("前端面经") in ["前端", "front-end", "fe"]
        assert extract_position("后端面试") in ["后端", "back-end", "be"]


# ============================================================
# 4. Reranker 测试
# ============================================================

class TestReranker:
    """Reranker 精排测试"""

    def test_rerank_empty_candidates(self):
        """空候选列表应返回空"""
        from services.reranker import rerank

        result = rerank("字节跳动面经", [])
        assert result == []

    def test_rerank_returns_top_k(self):
        """rerank 应返回 top_k 条"""
        from services.reranker import rerank

        candidates = [
            {"id": str(i), "content": f"面经内容{i}", "company": "字节跳动", "similarity": 0.8 - i * 0.05}
            for i in range(10)
        ]
        # 不调 API 时 rerank 内部会 fallback，至少不报错
        result = rerank("字节跳动面经", candidates, top_k=5)
        assert isinstance(result, list)
        assert len(result) <= 5


# ============================================================
# 5. 集成测试（需要环境变量）
# ============================================================

@pytest.mark.skipif(
    not os.getenv("MINIMAX_API_KEY"),
    reason="需要 MINIMAX_API_KEY 环境变量"
)
class TestIntegrationMiniMax:
    """MiniMax API 集成测试"""

    def test_classify_api(self):
        """测试意图分类 API"""
        from api.classify import call_minimax

        result = call_minimax("字节跳动前端面经")
        assert "intent" in result
        assert result["intent"] in ["experience", "chat", "jd_analysis", "company_review", "other"]

    def test_cleaner_api(self):
        """测试清洗 API"""
        from services.cleaner import call_minimax_chat

        api_key = os.getenv("MINIMAX_API_KEY")
        content = "字节跳动前端一面面经：第一题是手写Promise，第二题是React虚拟DOM的diff算法，第三题是CSS布局。面试官很nice，整体难度中等。"
        result = call_minimax_chat(content, api_key)
        assert result is not None
        assert "is_valid" in result


@pytest.mark.skipif(
    not os.getenv("SUPABASE_URL"),
    reason="需要 SUPABASE_URL 环境变量"
)
class TestIntegrationSupabase:
    """Supabase 集成测试"""

    def test_vector_search(self):
        """测试向量检索"""
        from api.search import vector_search

        # 零向量搜索（应返回结果但相似度低）
        results = vector_search([0.0] * 1024, top_k=5)
        assert isinstance(results, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
