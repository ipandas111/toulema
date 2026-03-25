# 知乎全链路 E2E 验证 — 设计文档

## 目标
用知乎真实面经数据，端到端验证「爬取 → 清洗 → 向量化 → 入库 → 检索 → 生成」全链路。

## 范围
- 10 家互联网公司，每家 10 条面经，共 100 条
- 公司列表：字节跳动、腾讯、阿里巴巴、美团、京东、百度、华为、小米、拼多多、快手

## 执行步骤

### Phase 1: Supabase 建表
- 启用 pgvector 扩展
- 创建 experiences 表（含 vector(1024) 列）
- 创建向量搜索函数 search_experiences()
- 创建 company_aliases 表

### Phase 2: 知乎爬虫
- 无 cookie 模式，用 httpx 调用知乎搜索 API
- 关键词："{公司名} 面经"
- 每公司 10 条，过滤 < 50 字的短内容
- 输出：data/raw/zhihu_{公司}.jsonl

### Phase 3: MiniMax 清洗
- 调用 MiniMax-Text-01 判断内容质量
- 过滤广告、低质、水军
- 提取公司名、岗位名、intent_tags
- 输出：data/cleaned/zhihu_{公司}.jsonl

### Phase 4: MiniMax 向量化 + Supabase 入库
- 调用 MiniMax embo-01 生成 1024 维 embedding
- 批量写入 experiences 表
- 验证入库数量

### Phase 5: 端到端测试
- 本地起 FastAPI
- 输入"字节跳动前端面经"
- 验证：意图分类 → 向量检索 → Claude 生成回答

## 环境变量（已就绪）
- MINIMAX_API_KEY ✅
- ANTHROPIC_API_KEY ✅
- SUPABASE_URL ✅
- SUPABASE_SERVICE_KEY ✅

## 验收标准
1. experiences 表有 60+ 条有效数据（100 条爬取，预计 60-80% 通过清洗）
2. 向量检索能返回相关结果（similarity > 0.5）
3. Claude 能基于检索结果生成结构化回答
