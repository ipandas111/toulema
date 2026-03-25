# 知乎全链路 E2E 验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end validate the RAG pipeline using 100 real Zhihu interview posts (10 companies × 10 posts).

**Architecture:** Zhihu scraper → MiniMax cleaner → MiniMax embedding → Supabase pgvector → search API → Claude generation. All scripts run locally, reading from `.env.local`.

**Tech Stack:** Python 3, httpx, MiniMax API, Supabase pgvector, Claude API, FastAPI

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/scrape_zhihu.py` | Modify | Fix API compatibility, add multi-company batch mode |
| `scripts/run_zhihu_pipeline.py` | Create | Single script: scrape → clean → vectorize → verify |
| `services/cleaner.py` | Modify | Fix dotenv path to load `.env.local` |
| `services/vectorizer.py` | Modify | Fix dotenv path, fix Supabase insert for pgvector |
| `api/generate.py` | Modify | Wire `search_knowledge()` to real vector search |
| `api/search.py` | Modify | Fix dotenv path |
| `api/classify.py` | Modify | Fix dotenv path |

---

### Task 1: Enable pgvector in Supabase + create tables

**Files:** `supabase/schema.sql` (reference only — executed via CLI)

- [ ] **Step 1: Enable pgvector extension**

```bash
cd /Users/terry/Desktop/投了吗
supabase db execute --project-ref aycmsmntksxnxhmoacoj \
  "create extension if not exists vector with schema extensions;"
```

- [ ] **Step 2: Create experiences table**

```bash
supabase db execute --project-ref aycmsmntksxnxhmoacoj \
  "$(cat supabase/schema.sql)"
```

- [ ] **Step 3: Verify table exists**

```bash
supabase db execute --project-ref aycmsmntksxnxhmoacoj \
  "select count(*) from information_schema.tables where table_name = 'experiences';"
```

Expected: count = 1

---

### Task 2: Fix all Python scripts to load `.env.local`

**Files:**
- Modify: `services/cleaner.py:17`
- Modify: `services/vectorizer.py:16`
- Modify: `api/search.py` (top)
- Modify: `api/classify.py` (top)
- Modify: `api/generate.py:14`

- [ ] **Step 1: Replace `load_dotenv()` with `load_dotenv('.env.local')` in all 5 files**

In each file, change:
```python
load_dotenv()
```
to:
```python
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))
```

This ensures scripts find `.env.local` at project root regardless of working directory.

---

### Task 3: Fix Zhihu scraper for no-cookie mode

**Files:** Modify: `scripts/scrape_zhihu.py`

The current scraper uses `zhihu.com/api/v4/search_v3` which requires login. Without cookie, we need a fallback approach.

- [ ] **Step 1: Add fallback scraping via web search**

Replace `search_zhihu()` with a DuckDuckGo-based approach that searches `site:zhihu.com {company} 面经` and extracts content from the results. This avoids Zhihu's auth requirement.

- [ ] **Step 2: Add multi-company batch mode to main()**

Add `--companies` arg that accepts a list and iterates, outputting one JSONL per company.

- [ ] **Step 3: Test scraper with 1 company**

```bash
cd /Users/terry/Desktop/投了吗
python scripts/scrape_zhihu.py --keyword "字节跳动 面经" --max 10 --output data/raw/zhihu_bytedance.jsonl
```

Expected: `data/raw/zhihu_bytedance.jsonl` with 5-10 records.

---

### Task 4: Create unified pipeline script

**Files:** Create: `scripts/run_zhihu_pipeline.py`

- [ ] **Step 1: Write pipeline script**

Single Python script that:
1. Scrapes 10 companies × 10 posts → `data/raw/zhihu_all.jsonl`
2. Runs MiniMax cleaner → `data/cleaned/zhihu_all.jsonl`
3. Runs MiniMax vectorizer → inserts into Supabase
4. Prints summary stats

- [ ] **Step 2: Run full pipeline**

```bash
cd /Users/terry/Desktop/投了吗
python scripts/run_zhihu_pipeline.py
```

Expected: 60-100 records in Supabase experiences table.

---

### Task 5: Wire search_knowledge() to real vector search

**Files:** Modify: `api/generate.py:309-313`

- [ ] **Step 1: Replace stub with real search logic**

Replace the stub `search_knowledge()` function with actual calls to:
1. MiniMax embedding for query
2. Supabase vector search via `search_experiences()` RPC
3. SerpAPI fallback if similarity < 0.7

Import the relevant functions from `api/search.py`.

---

### Task 6: End-to-end test

- [ ] **Step 1: Start local API server**

```bash
cd /Users/terry/Desktop/投了吗
uvicorn api.generate:app --reload --port 8000
```

- [ ] **Step 2: Test chat endpoint**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "字节跳动前端面经"}'
```

Expected: JSON with `intent`, `answer` (markdown), `sources` (non-empty array).

- [ ] **Step 3: Verify vector results are being used**

Check that `answer` references specific interview questions from the scraped data, and `sources` contains entries with `company: "字节跳动"` and `source: "zhihu"`.

---

### Task 7: Commit

- [ ] **Step 1: Commit all changes**

```bash
git add scripts/ services/ api/ supabase/ data/ .gitignore
git commit -m "feat: e2e zhihu RAG pipeline - scrape, clean, vectorize, search, generate"
```
