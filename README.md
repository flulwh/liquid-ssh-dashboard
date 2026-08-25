<p align="center">
  <img src="assets/banner.svg" alt="Liquid SSH Dashboard banner" width="100%" />
</p>

# Liquid SSH Dashboard

> **A modern Web SSH terminal &amp; server management platform** built with React + TypeScript, wrapped in a **Material Design 3** dark UI. Connect real SSH sessions in your browser, monitor live load, and manage files over SFTP — all locally, with **zero sample / fake data**.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff)](https://vitejs.dev/)

---

> ## ⭐ If this project helps you, please consider giving it a ⭐. It motivates future development.

---

## ✨ Features

- 🌐 **Real SSH Terminal** — interactive sessions over WebSocket (xterm.js), multi-tab, remote resize, 1000-line scrollback.
- 📊 **Live Monitoring** — real CPU / memory / disk collected over SSH, with historical trend charts.
- 📁 **SFTP File Manager** — browse remote dirs, upload / download files, with a context menu (rename · delete · copy path · new folder).
- 📡 **Server Dashboard** — TCP reachability probing + per-server real-time load, all real data.
- 🖥 **Server Management** — search / add / edit / delete servers, persisted to the backend.
- 🔐 **Accounts &amp; JWT Auth** — register &amp; log in from the UI; no hard-coded credentials, no mock data anywhere.
- ⚙️ **Preferences** — terminal font/size, refresh interval, reduced motion (persisted locally).
- ⌨️ **Command Palette** — `Ctrl+K` / `⌘K` global search &amp; quick actions.

## 📸 Live UI

| Terminal | Monitoring |
| --- | --- |
| Real xterm.js SSH over WebSocket | Real CPU / memory / disk trends from SSH |

*(Run it locally — Screenshots on the README refresh as the app evolves.)*

## 🚀 Quick Start

Requires **Node.js 18+**. One command for everything (frontend + backend):

```bash
# install all dependencies
npm install && (cd server && npm install)

# start frontend + backend together (cross-platform)
npm run dev:all
```

Then open **http://localhost:5173/**, register the first account at the login screen, add a server, and connect.

> The one-click script [`scripts/dev.mjs`](scripts/dev.mjs) starts both the Vite frontend and the Node backend together on **Windows / macOS / Linux**. Stop everything with `Ctrl+C`.

## 📦 Installation

```bash
# clone
git clone https://github.com/flulwh/liquid-ssh-dashboard.git
cd liquid-ssh-dashboard

# frontend
npm install

# backend
cd server && npm install && cp servers.example.json servers.json && cd ..
```

Backend config (optional):

```bash
cd server && cp .env.example .env   # optional env vars
```

Production build:

```bash
# type-check + build
npm run build

# preview the build
npm run preview
```

## 🛠 Tech Stack

| Area | Choice |
| --- | --- |
| Frontend | React 18 · TypeScript · Vite 5 |
| Styling | Tailwind CSS 3 (Material Design 3 design system, dark theme) |
| Animation | Framer Motion |
| State | Zustand |
| Terminal | xterm.js (`@xterm/xterm` + `@xterm/addon-fit`) |
| SSH Backend | Node.js · Express · ssh2 · ws · jsonwebtoken (`server/`) |
| File Transfer | ssh2 SFTP (list / upload / download) |
| Charts | Recharts |
| Routing | react-router-dom |

## 🧭 Why this project?

- **Real, not demo** — the frontend ships **zero mock data**. Every server, account, and metric comes from the live backend (`servers.json` / `users.json`).
- **Truly local &amp; private** — everything runs on your machine; your SSH credentials never leave it.
- **Clean, focused UI** — a restrained **Material Design 3** dark surface (seed color `#6750A4`) instead of flashy gradients, built for readability.
- **Fast to adopt** — one command starts the whole stack; it's a solid template for a modern React + WebSocket + SSH admin tool.

## 🗺 Roadmap

- [ ] GitHub Actions CI (type-check + build on every push)
- [ ] Docker one-command deployment (frontend + backend + nginx)
- [ ] SSH key management in the UI
- [ ] Multi-user RBAC / team workspaces
- [ ] Session recording &amp; playback
- [ ] i18n (EN / 中文)
- [ ] Custom theme color picker (dynamic MD3 color)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. **Fork** the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes
4. Push &amp; open a **Pull Request**

Please keep commits focused and descriptive. See the open [Issues](https://github.com/flulwh/liquid-ssh-dashboard/issues) for ideas.

## 📄 License

This project plans to use the **MIT License**; a `LICENSE` file will be added. Until then, the author reserves all rights.
If you use or reference this project, please credit the original author.

---

## 🔗 Links

- 👤 Author — [@flulwh](https://github.com/flulwh)
- 🌐 Repo — https://github.com/flulwh/liquid-ssh-dashboard

---

## Details for developers

### API contract (backend, `server/`)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/servers` | Sanitized server list |
| WS | `/ws/ssh?serverId=&token=&cols=&rows=` | Interactive SSH channel |
| GET | `/api/files/list?serverId=&path=` | List remote directory |
| POST | `/api/files/upload?serverId=&path=&name=` | Upload file (binary body) |
| GET | `/api/files/download?serverId=&path=` | Download file |

> In production, put the backend behind a reverse proxy with `wss://` + HTTPS.

### Project structure

```
liquid-ssh-dashboard/
├── index.html
├── vite.config.ts
├── tailwind.config.js            # MD3 design tokens
├── server/                       # Node.js + ssh2 + ws + SFTP backend
│   ├── servers.example.json      # server config (copy to servers.json)
│   └── src/{index,config,auth,ssh}.ts
└── src/
    ├── api/client.ts             # API / WS client (auth · files)
    ├── store/                    # Zustand (auth · servers · ui · terminal)
    ├── hooks/                    # useServerLoads, useServerReachability …
    ├── components/               # RealTerminal, FileManager, ServerCard …
    ├── layouts/AppLayout.tsx
    └── pages/                    # Dashboard · Servers · Terminal · Files · Monitoring · Settings · About
```

### Deployment

**Any static host (Vercel / Netlify / Cloudflare Pages)** — build static files go to `dist/`. Since the app uses `BrowserRouter`, configure SPA fallback:

- **Vercel** — `vercel.json`:
  `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Netlify** — `public/_redirects` with `/*  /index.html  200`

**Nginx**

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/liquid-ssh-dashboard/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

**Docker**

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

```bash
docker build -t liquid-ssh-dashboard .
docker run -p 8080:80 liquid-ssh-dashboard
```

### Design notes

- **Material Design 3** dark theme: `surface-container` surfaces, seed color `#6750A4` (default purple) producing the primary / primary-container palette.
- Cards use restrained MD3 surface material (hairline border + elevation), no glass blur / gradient glows.
- Motion respects `prefers-reduced-motion`; can also be disabled in **Settings → Preferences** (`MotionConfig reducedMotion`).

---

<p align="center"><sub>Made with ❤️ by <a href="https://github.com/flulwh">flulwh</a> · React Dashboard · TypeScript · Open Source</sub></p>