# Tasks

- [x] Task 1: 在 `server/src/index.ts` 新增 `GET /` 根路由与统一 JSON 404 兜底
  - [x] SubTask 1.1: 在 `/api/health` 附近新增 `app.get('/', ...)`，返回服务名 + 时间戳 + 可用接口列表（JSON）
  - [x] SubTask 1.2: 在最后一个路由之后注册 Express 兜底中间件 `app.use((req, res) => res.status(404).json({ error: 'Not Found' }))`
  - [x] SubTask 1.3: 运行 `cd server && npm run typecheck` 确认类型通过

# Task Dependencies
- 无（单文件、单任务）