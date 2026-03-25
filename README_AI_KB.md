# 投了吗 - AI 面经知识库

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        离线建库阶段（一次性）                        │
│  小红书/知乎/牛客 → 爬虫抓取 → MiniMax 初筛 → 向量化 → Supabase    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         在线查询阶段                               │
│  用户输入 → MiniMax 意图分类 → 关键词过滤 → 向量检索 top20        │
│  → Reranker 精排 top5 → 相似度阈值 → SerpAPI 兜底 → Claude 生成  │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
投了吗/
├── scripts/                    # 一次性脚本
│   └── scrape_niuke.py       # 牛客爬虫
│
├── services/                  # 后台服务
│   ├── cleaner.py            # MiniMax 内容质量过滤
│   ├── vectorizer.py         # 向量化入库
│   ├── reranker.py           # Reranker 精排
│   └── quality_checker.py     # LLM-as-Judge 质检
│
├── api/                       # 在线 API
│   ├── classify.py           # 意图分类（MiniMax）
│   ├── search.py             # 向量检索 + SerpAPI 兜底
│   └── generate.py           # Claude 生成答案
│
├── frontend/                  # React 前端
│   └── src/components/
│       └── AISearch.tsx      # AI 搜索组件
│
├── supabase/
│   └── schema.sql            # 向量数据库 Schema
│
└── requirements.txt          # Python 依赖
```

## 快速开始

### 1. 数据库设置

在 Supabase SQL Editor 执行：
```bash
cat supabase/schema.sql | pbcopy
# 粘贴到 Supabase > SQL Editor > Run
```

### 2. 配置环境变量

```bash
# .env
MINIMAX_API_KEY=your_minimax_key
ANTHROPIC_API_KEY=your_claude_key
SERPAPI_API_KEY=your_serpapi_key  # 可选
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### 3. 离线建库

```bash
# 安装依赖
pip install -r requirements.txt

# 1. 爬取面经（以牛客为例）
python scripts/scrape_niuke.py --company "字节跳动" --max 100

# 2. MiniMax 质量过滤
python services/cleaner.py --input data/raw/niuke.jsonl --output data/cleaned/niuke.jsonl

# 3. 向量化入库
python services/vectorizer.py --input data/cleaned/niuke.jsonl
```

### 4. 在线 API

```bash
# 本地测试
uvicorn api.classify:app --reload --port 8001
uvicorn api.search:app --reload --port 8002
uvicorn api.generate:app --reload --port 8003

# 或使用统一入口
uvicorn api.generate:app --reload --port 8000
# POST /api/chat
```

### 5. 前端对接

前端通过 `/api/chat` 接口调用：

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "字节跳动前端面经",
    intent: "experience"
  })
})
const data = await response.json()
// data.answer: AI 回答
// data.sources: 参考来源
```

## API 文档

### POST /api/chat

统一对话接口，整合意图分类→检索→生成。

**请求：**
```json
{
  "query": "字节跳动前端面经",
  "intent": "experience"
}
```

**响应：**
```json
{
  "query": "字节跳动前端面经",
  "intent": "experience",
  "intent_label": "面经咨询",
  "answer": "## 面经总结\n\n...",
  "sources": [
    {"company": "字节跳动", "source": "牛客", "url": "..."}
  ]
}
```

### POST /api/classify

意图分类接口。

**请求：**
```json
{
  "query": "腾讯工作体验怎么样"
}
```

**响应：**
```json
{
  "query": "腾讯工作体验怎么样",
  "intent": "company_review",
  "intent_label": "公司评价",
  "skip_rag": false,
  "company": "腾讯",
  "position": ""
}
```

### POST /api/search

向量检索接口。

**请求：**
```json
{
  "query": "字节跳动前端",
  "company": "字节跳动",
  "top_k": 20
}
```

## 模型分工

| 阶段 | 模型 | 职责 | 成本 |
|------|------|------|------|
| 离线初筛 | MiniMax | 过滤广告/低质内容 | 低 |
| 在线意图分类 | MiniMax | 判断用户意图 | 极低 |
| Reranker 精排 | MiniMax | 精选 top5 | 低 |
| 生成答案 | Claude Sonnet 4.6 | 结构化建议 | 高 |
| 兜底搜索 | SerpAPI | 实时搜索 | 中 |
| 质检 | Claude | 20% 抽样检查 | 低 |

## 成本估算

| 场景 | 预估成本 |
|------|----------|
| 离线建库（10000条） | ~$5（MiniMax） |
| 单次查询 | ~$0.01（Claude） |
| SerpAPI 兜底 | 仅低相似度时触发 |

## 数据库 Schema

核心表 `experiences`：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| source | text | 来源平台 |
| company | text | 公司名 |
| position | text | 岗位 |
| content | text | 原始内容 |
| cleaned_content | text | 清洗后内容 |
| embedding | vector(1024) | MiniMax 向量 |
| quality_score | float | 质量分 0-1 |
| is_valid | boolean | 是否通过审核 |

向量检索函数 `search_experiences(query_embedding, top_k, company_filter)`

## 扩展爬虫

参考 `scripts/scrape_niuke.py`，按相同结构实现：
- `scrape_xhs.py` - 小红书
- `scrape_zhihu.py` - 知乎

统一输出 JSONL 格式：
```json
{"source": "niuke", "source_id": "123", "content": "...", ...}
```
