# 时事监测平台 (News Monitoring Platform)

新闻数据管线：n8n 抓取新闻 → Express+SQLite 后端存储 → React 前端展示，支持内容聚类和热度分析。

## 快速部署（Docker）

### 环境要求

- Docker & Docker Compose
- Linux / macOS / WSL2

### 1. 克隆仓库

```bash
git clone https://github.com/iwzbi/news-monitor.git
cd news-monitor
```

### 2. 启动服务

```bash
docker compose up -d --build
```

启动后访问：

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:3456/api |
| n8n 工作流 | http://localhost:5678 |

### 3. 配置 n8n

1. 打开 `http://localhost:5678`
2. 登录（首次需注册账号）
3. 导入工作流：点击右上角 **···** → **Import from File** → 选择 `workflow.json`
4. 配置 Webhook 节点的 URL 为 `http://backend:3456/api/news/batch`
5. 激活工作流

### 4. 导入工作流（命令行方式）

```bash
# 通过 n8n API 导入（需先在 UI 中获取 API Key）
node update-workflow.js
```

## 开发环境

### 后端

```bash
cd backend
npm install
npm run dev    # 开发模式，端口 3456
npm run build  # 编译 TypeScript
npm start      # 生产模式
```

### 前端

```bash
cd frontend
npm install
npm run dev    # 开发模式，端口 3000
npm run build  # 生产构建
```

## 项目结构

```
news-monitor/
├── docker-compose.yml        # Docker 编排
├── Dockerfile.n8n            # n8n 自定义镜像
├── workflow.json             # n8n 工作流配置
├── update-workflow.js        # 工作流更新脚本
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts          # Express 入口（端口 3456）
│   │   ├── db.ts             # SQLite 数据库初始化
│   │   ├── types.ts          # TypeScript 类型定义
│   │   ├── cluster.ts        # 内容聚类模块（jieba + Jaccard）
│   │   └── routes/
│   │       ├── ingest.ts     # POST 新闻/简报 接口
│   │       └── query.ts      # GET 查询接口
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx 配置（代理 API）
│   └── src/
│       ├── App.tsx           # 路由配置
│       ├── api/index.ts      # API 客户端
│       ├── types/index.ts    # TypeScript 类型
│       ├── components/
│       │   └── Layout.tsx    # 侧边栏布局
│       └── pages/
│           ├── Hotspots.tsx  # 时事热点页
│           ├── Summary.tsx   # 热点总结页
│           └── Tracking.tsx  # 关注目标页
└── pic1.png / pic2.png       # 设计参考图
```

## API 接口

### 新闻

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/news/batch` | 批量写入新闻（支持中英文字段名） |
| POST | `/api/news` | 写入单条新闻 |
| GET | `/api/news` | 查询新闻列表（支持分页、筛选） |
| GET | `/api/news/:id` | 查询单条新闻详情 |
| GET | `/api/news/filters` | 获取筛选选项（领域/国家/区域） |
| GET | `/api/news/aggregation` | 按领域聚合 |
| GET | `/api/news/cluster` | 内容聚类（`?range=1w&threshold=0.05`） |
| GET | `/api/news/timeline` | 时间线统计 |

### 简报

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/brief` | 写入简报 |
| POST | `/api/brief/append` | 追加简报内容 |
| GET | `/api/briefs` | 查询简报列表 |
| GET | `/api/briefs/dates` | 获取有简报的日期列表 |

### 仪表盘

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 统计概览 |
| GET | `/api/dashboard/trends` | 趋势数据 |
| GET | `/api/dashboard/overview` | 今日概览 |

## 数据库

SQLite 数据库文件存储在 Docker volume `news_data` 中（容器内 `/data/news.db`）。

### 表结构

**news 表**：id, title, title_cn, time, datetime_display, content, link, source, category, region, country, ai_score, ai_reason, full_content, summary, batch_id, created_at

**briefs 表**：id, type, title, content, date, label, news_id, created_at

### 数据备份

```bash
docker exec news-backend cp /data/news.db /data/news.db.bak
docker cp news-backend:/data/news.db ./news-backup.db
```

## 常见问题

### n8n 启动失败

```bash
docker compose logs n8n
```

检查端口 5678 是否被占用。

### 后端连不上数据库

确保 Docker volume 存在：

```bash
docker volume create news_data
```

### 前端白屏

检查 nginx 配置是否正确代理到后端：

```bash
docker exec news-frontend cat /etc/nginx/conf.d/default.conf
```

### 重新构建

```bash
docker compose down
docker compose up -d --build
```

## n8n 登录信息

- 邮箱：`wzbi0804@gmail.com`
- 密码：`kGze2EagN57cLyC`
