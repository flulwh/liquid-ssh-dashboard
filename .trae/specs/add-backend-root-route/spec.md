# 后端根路由（修复 "Cannot GET /"）Spec

## Why
用户访问后端根地址 `http://localhost:8787/` 时，Express 因未定义根路由而返回默认的 HTML 错误页「Cannot GET /」，体验与预期不符。

## What Changes
- 在 `server/src/index.ts` 新增 `GET /` 根路由，返回服务信息（JSON）。
- 新增统一的 JSON 404 兜底处理，避免任意未匹配路径再次出现「Cannot GET ...」纯文本。

## Impact
- Affected specs: 后端 HTTP 接口
- Affected code: `server/src/index.ts`

## ADDED Requirements

### Requirement: 后端根路由
系统 SHALL 在 `GET /` 上返回 200 及服务信息 JSON，而不是 Express 默认的「Cannot GET /」。

#### Scenario: 访问根地址
- **WHEN** 用户用浏览器或 curl 请求 `GET http://localhost:8787/`
- **THEN** 返回 HTTP 200，正文为包含服务名、当前时间戳与可用接口说明的 JSON（不含任何敏感/服务器凭据信息）

### Requirement: 统一 JSON 404
系统 SHALL 对未匹配到任何路由的请求返回 JSON 格式的 404，而非 HTML「Cannot GET <path>」。

#### Scenario: 访问不存在的路径
- **WHEN** 请求一个不存在的路径（如 `GET /api/nope` 或 `GET /whatever`）
- **THEN** 返回 HTTP 404，正文为 `{ "error": "Not Found" }` 形式的 JSON