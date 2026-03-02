# 投了吗 · TouLeMa

> 求职版 Power BI — 多平台投递看板 × AI 情报引擎 × 面经质量评分体系

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/tou-le-ma)

## 功能

- **投递看板** — 7 列 Kanban，拖拽管理，截止日提醒
- **AI 情报引擎** — 添加岗位后自动搜索 JD + 面经，质量评分过滤，RAG 合成简报
- **面经质量评分** — 规则层 × LLM 层 × 交叉验证，低质量内容自动过滤
- **AI 对话助手** — 基于已入库面经，回答追问，来源可溯
- **数据 Dashboard** — 投递漏斗、渠道转化率可视化

## 快速开始

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填入 API Keys
uvicorn app.main:app --reload
```

### 完整本地环境（推荐）
```bash
docker-compose up
```

## 环境变量

| 变量 | 说明 | 获取 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Claude API | [console.anthropic.com](https://console.anthropic.com) |
| `TAVILY_API_KEY` | 搜索 API | [tavily.com](https://tavily.com) |
| `DATABASE_URL` | PostgreSQL | Railway / Supabase |
| `REDIS_URL` | Celery broker | Railway |

## 技术栈

**Frontend:** React + Vite + Tailwind CSS + dnd-kit  
**Backend:** Python FastAPI + Celery + PostgreSQL  
**AI:** MiniMax-Text-01 (评分) + Claude Sonnet 4.6 (合成) + BGE-M3 嵌入 + ChromaDB
**Search:** Tavily API  
**Deploy:** Vercel (前端) + Railway (后端)

## 贡献

欢迎 PR！请先阅读 [CONTRIBUTING.md](docs/CONTRIBUTING.md)

## License

MIT
