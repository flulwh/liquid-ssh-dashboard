# Liquid SSH Dashboard

一个采用 **Material Design 3** 深色主题的现代 Web SSH 管理平台。
真实 SSH 会话 · SFTP 文件管理 · 实时负载/趋势监控。

**项目主页**：<https://github.com/flulwh/liquid-ssh-dashboard>
**作者 GitHub**：<https://github.com/flulwh>

## 技术栈

| 领域 | 方案 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3（Material Design 3 设计系统，深色主题） |
| 动画 | Framer Motion |
| 状态 | Zustand |
| 终端 | xterm.js（@xterm/xterm + @xterm/addon-fit） |
| SSH 后端 | Node.js + Express + ssh2 + ws + jsonwebtoken（`server/`） |
| 文件传输 | ssh2 SFTP（目录浏览 / 上传 / 下载） |
| 图表 | Recharts |
| 图标 | lucide-react |
| 路由 | react-router-dom |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查 + 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

## 目录结构

```
liquid-ssh-dashboard/
├── index.html
├── vite.config.ts
├── tailwind.config.js            # 玻璃/极光设计令牌
├── tsconfig.json
├── server/                       # 真实 SSH 后端（Node.js + ssh2 + ws + SFTP）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── servers.example.json      # 服务器配置（复制为 servers.json）
│   └── src/
│       ├── index.ts             # Express + WebSocket 入口
│       ├── config.ts            # 服务器配置加载
│       ├── auth.ts              # JWT 鉴权
│       └── ssh.ts               # ssh2 会话 + SFTP
└── src/
    ├── main.tsx                 # 入口
    ├── App.tsx                  # 路由
    ├── index.css                # Liquid Glass 设计系统（核心样式）
    ├── types/                   # 全局类型
    ├── utils/                   # cn / format 工具
    ├── api/                     # 后端 API 客户端（登录 / 列表 / 文件传输）
    ├── store/                   # Zustand（auth / servers / ui / terminal）
    ├── hooks/                   # useMouseGlow
    ├── components/
    │   ├── AuroraBackground.tsx # 动态极光背景
    │   ├── GlassCard.tsx        # 玻璃卡片（光斑跟随）
    │   ├── GlassNavbar.tsx      # 顶部玻璃导航
    │   ├── LoginScreen.tsx      # 登录 / 创建账户（配置化）
    │   ├── ServerCard.tsx       # 服务器卡片
    │   ├── RealTerminal.tsx     # 真实 SSH 终端（WebSocket）
    │   ├── FileManager.tsx      # SFTP 文件管理器
    │   ├── AIHelper.tsx         # AI 运维助手
    │   ├── CommandPalette.tsx   # ⌘K 命令面板
    │   └── AnimatedNumber.tsx   # 数字滚动
    ├── layouts/AppLayout.tsx    # 全局布局
    └── pages/                   # Dashboard / Servers / Terminal / Monitoring / Settings
```

## 功能一览

- **Dashboard**：已配置服务器数、在线/离线统计、后端地址、服务器列表（TCP 连通性探测）与每台实时的 CPU/内存/磁盘。
- **Servers**：搜索、真实增删改服务器（持久化到后端 `servers.json`）。
- **Terminal**：多标签真实 SSH 终端（WebSocket）。
- **Files**：SFTP 远程目录浏览、上传、下载、右键菜单（重命名 / 删除 / 复制路径 / 新建目录）。
- **Monitoring**：每台服务器的实时 CPU/内存/磁盘 与历史趋势曲线（真实 SSH 命令采集）。
- **Settings**：账号、偏好设置（终端外观 / 刷新间隔 / 动效，持久化）、后端连接、退出登录。
- **CommandPalette**：`⌘K` / `Ctrl+K` 全局搜索服务器与操作。

> 说明：前端不内置任何示例/演示数据。所有服务器、账号均来自真实后端（`servers.json` / `users.json`），前端无 mock 数据源。

## 启动真实 SSH 后端

`server/` 已内置真实的 Node.js + `ssh2` + WebSocket + SFTP 后端，前端「终端」页自动使用真实会话。

```bash
# 1. 进入后端目录，安装依赖
cd server
npm install

# 2. （可选）配置环境变量
cp .env.example .env

# 3. 启动后端（默认 http://localhost:8787）
npm run dev
```

首次使用时，在应用登录页「创建账户」注册第一个用户（后端 `users.json` 不内置默认账户）。之后在「服务器」页添加真实 SSH 服务器即可。

前端默认不写死任何凭据或后端地址，均为「配置化」：

- **后端地址**：可在登录页或「设置 → 后端连接」中填写并保存到浏览器；也可用构建期环境变量 `VITE_API_URL` 注入（运行时配置优先于环境变量）。
- **登录账号**：在登录页输入，前端仅调用后端换取 JWT，**不保存密码**。

```bash
# 可选：构建时注入默认后端地址
# 复制为 .env.local 并修改（不提交到 git）
cp .env.example .env.local
# VITE_API_URL=http://localhost:8787
```

> 说明：不配置 `VITE_API_URL` 时，首次访问会进入登录页，在那里填写后端地址与账号密码即可；令牌（JWT）会保存在浏览器中，刷新页面无需重新登录。

### 接口约定

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 登录换取 JWT |
| GET | `/api/servers` | 获取脱敏后的服务器列表 |
| WS | `/ws/ssh?serverId=&token=&cols=&rows=` | SSH 交互终端通道 |
| GET | `/api/files/list?serverId=&path=` | 列出远程目录 |
| POST | `/api/files/upload?serverId=&path=&name=` | 上传文件（二进制体） |
| GET | `/api/files/download?serverId=&path=` | 下载文件 |

生产环境建议通过反向代理将 `wss://` 与 HTTPS 统一转发，避免明文暴露。

## 部署说明

### 任意静态托管（Vercel / Netlify / Cloudflare Pages）

构建产物在 `dist/`。由于使用 `react-router` 的 `BrowserRouter`，需配置 **SPA 回退**：

- **Vercel**：`vercel.json` 添加 `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Netlify**：新建 `public/_redirects`，内容 `/*  /index.html  200`

### Nginx

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/liquid-ssh-dashboard/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

构建并运行：

```bash
docker build -t liquid-ssh-dashboard .
docker run -p 8080:80 liquid-ssh-dashboard
```

## 设计说明

- 界面基于 **Material Design 3** 深色主题：`surface-container` 卡片、种子色 `#6750A4`（默认紫）生成的 primary / primary-container 色板。
- 卡片为克制的 MD3 表面材质（细描边 + 层级抬升），无玻璃模糊/渐变光效，保证信息可读性。
- 动效遵循 `prefers-reduced-motion`，并可在「设置 → 偏好设置 → 高级动效」中关闭（`MotionConfig reducedMotion`）。