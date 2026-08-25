// ============================================================
// 后端 API 客户端（真实 SSH / SFTP）
//
// 所有连接信息均为「配置化」，前端不内置任何默认凭据/地址：
//  - API 地址：构建期由 VITE_API_URL 注入；运行期可在登录页/设置页填写，保存在 localStorage。
//  - 账号密码：由用户在登录页输入，前端不存密码。
//  - JWT：登录成功后写入 localStorage，刷新页面可保持会话。
// ============================================================

const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const LS_API_BASE = 'lsd_api_base';
const LS_TOKEN = 'lsd_token';

import type { Server } from '../types';

function loadInitialApiBase(): string {
  const local = localStorage.getItem(LS_API_BASE);
  if (local) return local.replace(/\/+$/, '');
  return VITE_API_URL ?? '';
}

let _apiBase = loadInitialApiBase();

function wsBase(): string {
  return _apiBase.replace(/^http/, 'ws');
}

export interface ServerPayload {
  name: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface RemoteFileEntry {
  name: string;
  type: string; // 'd' | '-' | 'l'
  size: number;
  mtime: number;
  mode: number;
}

let cachedToken: string | null = (() => localStorage.getItem(LS_TOKEN))();

/** 当前后端 API 地址（可为空，表示尚未配置） */
export function getApiBase(): string {
  return _apiBase;
}

/** 从本地 JWT payload 解码当前登录用户名（后端签发 { sub: username }） */
export function getUsername(): string {
  const token = localStorage.getItem(LS_TOKEN);
  if (!token) return '';
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : '';
  } catch {
    return '';
  }
}

/** 配置后端 API 地址（持久化到 localStorage） */
export function setApiBase(url: string): void {
  _apiBase = url.trim().replace(/\/+$/, '');
  localStorage.setItem(LS_API_BASE, _apiBase);
}

/** 登录：使用用户提供的账号密码换取 JWT，并持久化会话 */
export async function login(username: string, password: string): Promise<string> {
  if (!_apiBase) throw new Error('请先配置后端 API 地址');
  const res = await fetch(`${_apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const msg = res.status === 401 ? '用户名或密码错误' : '登录失败';
    throw new Error(msg);
  }
  const data = (await res.json()) as { token: string };
  cachedToken = data.token;
  localStorage.setItem(LS_TOKEN, cachedToken);
  return cachedToken;
}

/** 创建账户：后端校验并注册，成功后自动登录 */
export async function register(username: string, password: string): Promise<void> {
  if (!_apiBase) throw new Error('请先配置后端 API 地址');
  const res = await fetch(`${_apiBase}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '创建账户失败');
  }
  // 注册成功后直接登录
  await login(username, password);
}

/** 是否已持有有效 token */
export function hasToken(): boolean {
  return !!cachedToken;
}

/** 退出登录：清除本地会话（仅清前端缓存，不调后端） */
export function logout(): void {
  cachedToken = null;
  localStorage.removeItem(LS_TOKEN);
}

/** 确保已登录，未登录则抛出错误（由上层跳转到登录页） */
export async function ensureToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  throw new Error('AUTH_REQUIRED');
}

function authHeaders(): Record<string, string> {
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {};
}

/** 探测后端是否可达（用于前端优雅降级）。
 *  注意：不设 AbortSignal.timeout —— 主动中止会让浏览器把请求记为 net::ERR_ABORTED，
 *  污染控制台。后端内部已自带超时保护，因此这里直接 fetch + catch 即可。 */
export async function isBackendReachable(): Promise<boolean> {
  if (!_apiBase) return false;
  try {
    const res = await fetch(`${_apiBase}/api/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ProbeResult {
  reachable: boolean;
  latencyMs: number | null;
}

/** 真实 TCP 探测某 host:port 的可达性与延迟 */
export async function probeServer(host: string, port: number): Promise<ProbeResult> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/health/probe`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port }),
  });
  if (!res.ok) throw new Error('探测失败');
  return (await res.json()) as ProbeResult;
}

export interface ServerLoad {
  cpu: number;
  load1: number;
  mem: { total: number; used: number; percent: number };
  disk: { total: number; used: number; percent: number };
}

/** 采集某服务器的实时负载（SSH 命令：loadavg / free / df） */
export async function fetchServerLoad(serverId: string): Promise<ServerLoad> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/servers/${encodeURIComponent(serverId)}/load`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '无法采集负载');
  }
  return (await res.json()) as ServerLoad;
}

/** 新建远程目录 */
export async function mkRemoteDir(serverId: string, path: string): Promise<void> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/files/mkdir`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId, path }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '新建目录失败');
  }
}

/** 远程重命名 / 移动 */
export async function renameRemoteFile(serverId: string, from: string, to: string): Promise<void> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/files/rename`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId, from, to }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '重命名失败');
  }
}

/** 删除远程文件或空目录 */
export async function removeRemoteEntry(serverId: string, path: string, isDir: boolean): Promise<void> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/files/remove`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId, path, isDir }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '删除失败');
  }
}

export async function fetchRemoteServers(): Promise<Server[]> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/servers`, { headers: authHeaders() });
  if (!res.ok) throw new Error('获取服务器列表失败');
  return (await res.json()) as Server[];
}

export async function createRemoteServer(payload: ServerPayload): Promise<Server> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/servers`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '新增服务器失败');
  }
  return (await res.json()) as Server;
}

export async function updateRemoteServer(id: string, payload: ServerPayload): Promise<Server> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/servers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '更新服务器失败');
  }
  return (await res.json()) as Server;
}

export async function deleteRemoteServer(id: string): Promise<void> {
  await ensureToken();
  const res = await fetch(`${_apiBase}/api/servers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '删除服务器失败');
  }
}

/** 构造 SSH WebSocket 地址（先确保已登录） */
export async function sshUrl(serverId: string, cols: number, rows: number): Promise<string> {
  await ensureToken();
  const params = new URLSearchParams({
    serverId,
    token: cachedToken!,
    cols: String(cols),
    rows: String(rows),
  });
  return `${wsBase()}/ws/ssh?${params.toString()}`;
}

export async function listRemoteFiles(
  serverId: string,
  path: string
): Promise<{ path: string; entries: RemoteFileEntry[] }> {
  await ensureToken();
  const params = new URLSearchParams({ serverId, path });
  const res = await fetch(`${_apiBase}/api/files/list?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '读取目录失败');
  }
  return (await res.json()) as { path: string; entries: RemoteFileEntry[] };
}

export async function uploadRemoteFile(
  serverId: string,
  dir: string,
  file: File
): Promise<void> {
  await ensureToken();
  const params = new URLSearchParams({ serverId, path: dir, name: file.name });
  const res = await fetch(`${_apiBase}/api/files/upload?${params.toString()}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '上传失败');
  }
}

export async function downloadRemoteFile(serverId: string, path: string): Promise<Blob> {
  await ensureToken();
  const params = new URLSearchParams({ serverId, path });
  const res = await fetch(`${_apiBase}/api/files/download?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? '下载失败');
  }
  return res.blob();
}