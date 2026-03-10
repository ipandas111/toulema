# 投了吗 · TouLeMa

> 求职投递管理神器 — 多平台投递看板 × AI 多源信息搜索 × 面经情报

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ipandas111/toulema)

## 简介

投了吗是一个专为求职者设计的投递管理工具，帮助你系统化管理求职投递进度，同时提供强大的AI搜索功能，帮你快速获取目标公司/岗位的面经、JD分析、成长前景等信息。

## 功能

### 📊 投递管理
- **Kanban 看板** — 7列拖拽管理，清晰展示投递进度
- **投递统计** — 总投递数、进行中、Offer、已拒绝实时统计
- **截止日提醒** — 智能提醒即将截止的岗位
- **日历视图** — 可视化查看每日投递情况

### 🔍 AI 多源信息搜索
- **多平台聚合** — 整合小红书、知乎、牛客、猎聘、BOSS直聘等信息
- **智能搜索类型**：
  - 面经搜索 — 查找目标公司/岗位的面试经验
  - JD分析 — 分析岗位值不值得投
  - 成长前景 — 了解岗位发展路径
  - 公司评价 — 搜索公司口碑

### 🌐 浏览器插件
- **一键记录** — 在招聘网站页面一键记录投递信息
- **自动同步** — 支持将插件记录的投递同步到网站
- **智能识别** — 自动识别公司名、岗位名、平台来源

### 💾 数据管理
- **本地存储** — 数据保存在浏览器 localStorage
- **导入/导出** — 支持 JSON 格式备份和恢复数据

## 快速开始

### 在线访问
直接访问线上版本：https://frontend-opal-one-64.vercel.app

### 本地开发

#### 前端
```bash
cd frontend
npm install
npm run dev
```

#### 插件安装
1. 打开 Chrome 扩展程序页面 (`chrome://extensions/`)
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension` 文件夹

## 技术栈

**Frontend:** React + TypeScript + Vite + Tailwind CSS + dnd-kit + date-fns
**Deploy:** Vercel

## 项目结构

```
toulema/
├── frontend/           # 网站前端
│   ├── src/
│   │   ├── components/  # React 组件
│   │   │   ├── AISearch.tsx      # AI 搜索组件
│   │   │   ├── CalendarHeatmap.tsx # 日历视图
│   │   │   ├── Kanban/            # 看板组件
│   │   │   └── JobModal/          # 投递编辑弹窗
│   │   ├── hooks/       # React Hooks
│   │   └── utils/      # 工具函数
│   └── public/
│       └── favicon.svg  # 网站图标
├── extension/         # Chrome 浏览器插件
│   ├── manifest.json   # 插件配置
│   ├── popup.html     # 插件弹窗
│   ├── popup.js       # 弹窗逻辑
│   └── content.js     # 内容脚本
└── README.md
```

## 更新日志

### 2026-03-10
- ✨ 新增 AI 多源信息搜索功能
- 🎨 优化 UI：添加投递按钮加粗、导入导出移至右侧
- 🐛 修复日历组件样式问题
- 🔧 更新 favicon 为"投"字
- 🔄 修复插件与网站数据同步问题

## 作者

- **刘子安** — 康奈尔大学系统工程研究生
- GitHub: [@ipandas111](https://github.com/ipandas111)

## License

MIT
