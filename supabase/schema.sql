-- 投了吗 · AI 面经知识库 Schema
-- 在 Supabase Dashboard > SQL Editor 里粘贴执行

-- =====================================================
-- 1. 面经表（核心知识库）
-- =====================================================
create table if not exists experiences (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,           -- 'xiaohongshu' | 'zhihu' | 'niuke'
  source_id       text,                   -- 原始平台帖子 ID
  source_url      text,                   -- 原始帖子链接
  company         text,                   -- 公司名（统一化）
  position        text,                   -- 岗位（统一化）
  content         text not null,           -- 原始内容（完整）
  cleaned_content text,                   -- 清洗后内容（去除广告/水军）
  embedding       vector(1024),           -- MiniMax embedding (1024维)
  quality_score   float,                  -- MiniMax 质量分 0-1
  intent_tags     text[],                  -- 意图标签 ['面经', 'HC', 'OC', '碎碎念']
  is_valid        boolean default true,   -- 是否通过质量审核
  filter_reason   text,                   -- 被过滤原因（如果有）
  view_count      integer default 0,      -- 阅读数
  like_count      integer default 0,      -- 点赞数
  scraper_version text,                   -- 爬虫版本号
  scraped_at      timestamptz default now(),
  indexed_at      timestamptz default now()
);

-- =====================================================
-- 2. 向量索引（IVF-flat，100个列表）
-- =====================================================
create index if not exists idx_experiences_embedding
  on experiences using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 辅助索引
create index if not exists idx_experiences_company on experiences(company);
create index if not exists idx_experiences_source on experiences(source);
create index if not exists idx_experiences_is_valid on experiences(is_valid) where is_valid = true;

-- =====================================================
-- 3. 查询日志（用于分析用户行为）
-- =====================================================
create table if not exists query_logs (
  id            uuid primary key default gen_random_uuid(),
  query_text    text not null,
  intent        text,                     -- '闲聊' | '面经咨询' | 'JD分析' | '公司评价'
  company       text,
  result_count  integer,                  -- 召回数量
  used_serpapi  boolean default false,    -- 是否触发了 SerpAPI 兜底
  latency_ms    integer,                  -- 响应时间
  user_id       uuid,                    -- 如果已登录
  created_at    timestamptz default now()
);

-- =====================================================
-- 4. 生成日志（用于质检）
-- =====================================================
create table if not exists generation_logs (
  id            uuid primary key default gen_random_uuid(),
  query_text    text not null,
  intent        text,
  context_used  jsonb,                    -- 使用的参考资料（来源 ID 列表）
  generated_response text,
  quality_score float,                   -- LLM-as-Judge 评分
  feedback     text,                    -- 用户反馈（thumbs up/down）
  created_at    timestamptz default now()
);

-- =====================================================
-- 5. RLS 策略
-- =====================================================
alter table experiences enable row level security;
alter table query_logs enable row level security;
alter table generation_logs enable row level security;

-- experiences: 公开读取（用于搜索），只有爬虫服务可写入
create policy "experiences_read_all" on experiences
  for select using (true);

create policy "experiences_insert_service" on experiences
  for insert with check (true);  -- 服务端写入

-- query_logs: 用户只能看到自己的查询
create policy "query_logs_own" on query_logs
  for all using (auth.uid() = user_id or user_id is null);

-- generation_logs: 同上
create policy "generation_logs_own" on generation_logs
  for all using (auth.uid() = user_id or user_id is null);

-- =====================================================
-- 6. 自动更新 updated_at
-- =====================================================
create or replace function update_indexed_at()
returns trigger as $$
begin new.indexed_at = now(); return new; end;
$$ language plpgsql;

create trigger experiences_indexed_at
  before update on experiences
  for each row execute function update_indexed_at();

-- =====================================================
-- 7. 向量相似度搜索函数（带过滤）
-- =====================================================
create or replace function search_experiences(
  query_embedding vector(1024),
  top_k integer default 5,
  company_filter text default null
)
returns table (
  id              uuid,
  source          text,
  company         text,
  position        text,
  cleaned_content text,
  quality_score   float,
  similarity      float
)
as $$
begin
  return query
  select
    e.id,
    e.source,
    e.company,
    e.position,
    e.cleaned_content,
    e.quality_score,
    1 - (e.embedding <=> search_experiences.query_embedding) as similarity
  from experiences e
  where
    e.is_valid = true
    and (company_filter is null or e.company = company_filter)
  order by e.embedding <=> query_embedding
  limit top_k;
end;
$$ language plpgsql;

-- =====================================================
-- 8. 公司名标准化（可选，后续维护）
-- =====================================================
create table if not exists company_aliases (
  id          uuid primary key default gen_random_uuid(),
  canonical   text not null,   -- 标准名：'字节跳动'
  aliases     text[] not null  -- 别名：['ByteDance', '字节', 'bytedance']
);

-- 插入常用别名
insert into company_aliases (canonical, aliases) values
  ('字节跳动', ARRAY['ByteDance', '字节', 'bytedance', 'Byte dance']),
  ('腾讯', ARRAY['Tencent', '腾讯', 'tencent', '微信', 'QQ']),
  ('阿里巴巴', ARRAY['Alibaba', '阿里', 'alibaba', '淘宝', '天猫']),
  ('美团', ARRAY['Meituan', '美团', 'meituan']),
  ('京东', ARRAY['JD', '京东', 'jd.com']),
  ('百度', ARRAY['Baidu', '百度', 'baidu']),
  ('华为', ARRAY['Huawei', '华为', 'huawei']),
  ('小米', ARRAY['Xiaomi', '小米', 'xiaomi']),
  ('拼多多', ARRAY['Pinduoduo', '拼多多', 'pinduoduo', 'PDD'])
on conflict do nothing;

-- =====================================================
-- 9. 验证向量维度（可选的健康检查）
-- =====================================================
create or replace function check_embedding_dimension(dim integer)
returns boolean as $$
begin
  -- 验证 MiniMax embedding 确实是 1024 维
  return dim = 1024;
end;
$$ language plpgsql;
