# 贡献指南

## 分支规范
- `main` — 稳定版本，只通过 PR 合并
- `dev` — 开发主分支
- `feat/xxx` — 功能分支，从 dev 拉取
- `fix/xxx` — Bug 修复分支

## 提交规范
```
feat: 添加质量评分 LLM 层
fix: 修复 Kanban 拖拽在移动端的问题
docs: 更新 API 文档
refactor: 重构 vectorstore 模块
```

## 分工说明
- **后端/AI** — FastAPI, RAG pipeline, 质量评分
- **前端/UI** — React 组件, Tailwind 样式, 交互设计
- **共同维护** — 接口定义 (api/ 目录下的 schema)

## PR 流程
1. 从 `dev` 新建功能分支
2. 完成开发后开 PR → `dev`
3. 至少 1 人 Review 通过后 merge
4. `dev` → `main` 由 maintainer 定期合并
