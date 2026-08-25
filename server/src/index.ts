import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { loadServers, saveServers, findServer, type ServerConfig } from './config';
import { checkCredentials, issueToken, register, verifyToken } from './auth';
import {
  openShell,
  openSftp,
  listDir,
  safeJoin,
  fetchLoad,
  sftpMkdir,
  sftpRename,
  sftpRemove,
  type ShellHandle,
} from './ssh';

const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(cors());
app.use(express.json());

// 对外暴露不包含敏感信息的服务器列表
function safeServer(c: ServerConfig) {
  const { password, privateKey, passphrase, ...safe } = c;
  return safe;
}

// ============================================================
// 认证
// ============================================================

// 创建账户（不内置默认用户，首个用户通过此接口注册）
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body ?? {};
  try {
    await register(username, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || !(await checkCredentials(username, password ?? ''))) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ token: issueToken(username) });
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未授权' });
  try {
    verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
}

// ============================================================
// 基础接口
// ============================================================

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// 真实 TCP 连通性探测（用于仪表盘在线状态，非模拟数据）
function probe(host: string, port: number, timeout = 2500): Promise<{ reachable: boolean; latencyMs: number | null }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const sock = new net.Socket();
    const done = (reachable: boolean) => {
      sock.destroy();
      resolve({ reachable, latencyMs: reachable ? Date.now() - started : null });
    };
    sock.setTimeout(timeout);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
    sock.connect({ host, port });
  });
}

app.post('/api/health/probe', requireAuth, async (req, res) => {
  const { host, port } = req.body ?? {};
  const h = String(host ?? '').trim();
  if (!h) return res.status(400).json({ error: '缺少 host' });
  const p = Number(port) || 22;
  res.json(await probe(h, p));
});

// 根路由：返回服务信息，替代 Express 默认的「Cannot GET /」
app.get('/', (_req, res) => {
  res.json({
    name: 'Liquid SSH Dashboard API',
    ts: Date.now(),
    endpoints: {
      login: 'POST /api/auth/login',
      servers: 'GET /api/servers',
      ssh: 'WS /ws/ssh?serverId=&token=&cols=&rows=',
      files: {
        list: 'GET /api/files/list?serverId=&path=',
        upload: 'POST /api/files/upload?serverId=&path=&name=',
        download: 'GET /api/files/download?serverId=&path=',
      },
    },
  });
});

app.get('/api/servers', requireAuth, (_req, res) => {
  res.json(loadServers().map(safeServer));
});

// 新增服务器（真实写入 servers.json）
app.post('/api/servers', requireAuth, (req, res) => {
  const body = (req.body ?? {}) as Partial<ServerConfig>;
  const name = String(body.name ?? '').trim();
  const host = String(body.host ?? '').trim();
  if (!name || !host) return res.status(400).json({ error: 'name 和 host 不能为空' });
  const port = Number(body.port) || 22;
  const username = String(body.username ?? '').trim() || 'root';
  const list = loadServers();
  const id = `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  list.push({
    id,
    name,
    host,
    port,
    username,
    password: typeof body.password === 'string' && body.password ? body.password : undefined,
  });
  saveServers(list);
  res.json(safeServer(list[list.length - 1]));
});

// 更新服务器
app.put('/api/servers/:id', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const list = loadServers();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: '服务器不存在' });
  const body = (req.body ?? {}) as Partial<ServerConfig>;
  const name = String(body.name ?? '').trim();
  const host = String(body.host ?? '').trim();
  if (!name || !host) return res.status(400).json({ error: 'name 和 host 不能为空' });
  list[idx] = {
    ...list[idx],
    name,
    host,
    port: Number(body.port) || 22,
    username: String(body.username ?? '').trim() || 'root',
    ...(typeof body.password === 'string' && body.password
      ? { password: body.password }
      : {}),
  };
  saveServers(list);
  res.json(safeServer(list[idx]));
});

// 删除服务器
app.delete('/api/servers/:id', requireAuth, (req, res) => {
  const id = String(req.params.id);
  const list = loadServers();
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return res.status(404).json({ error: '服务器不存在' });
  saveServers(next);
  res.json({ ok: true });
});

// 实时负载（真实 SSH 命令采集：loadavg / free / df）
app.get('/api/servers/:id/load', requireAuth, async (req, res) => {
  const cfg = findServer(String(req.params.id));
  if (!cfg) return res.status(404).json({ error: '服务器不存在' });
  if (!cfg.password && !cfg.privateKey) {
    return res.status(400).json({ error: '未配置连接凭据（密码或密钥），无法采集负载' });
  }
  try {
    res.json(await fetchLoad(cfg));
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

// ============================================================
// 文件管理（SFTP）
// ============================================================

app.get('/api/files/list', requireAuth, async (req, res) => {
  try {
    const serverId = String(req.query.serverId ?? '');
    const dir = String(req.query.path ?? '.') || '.';
    const cfg = findServer(serverId);
    if (!cfg) return res.status(404).json({ error: '服务器不存在' });
    const entries = await listDir(cfg, dir);
    entries.sort((a, b) => {
      if (a.type === 'd' && b.type !== 'd') return -1;
      if (a.type !== 'd' && b.type === 'd') return 1;
      return a.name.localeCompare(b.name);
    });
    res.json({ path: dir, entries });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post(
  '/api/files/upload',
  requireAuth,
  express.raw({ type: () => true, limit: '512mb' }),
  async (req, res) => {
    try {
      const serverId = String(req.query.serverId ?? '');
      const dir = String(req.query.path ?? '.') || '.';
      const fileName = String(req.query.name ?? '').replace(/^\.\.(\/|$)/, '').replace(/[/\\]/g, '') 
        || `upload_${Date.now()}`;
      const cfg = findServer(serverId);
      if (!cfg) return res.status(404).json({ error: '服务器不存在' });

      const remotePath = safeJoin(dir, fileName);

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: '空文件或非二进制请求体' });
      }

      const { sftp, end } = await openSftp(cfg);
      const w = sftp.createWriteStream(remotePath);
      w.on('error', (err: Error) => {
        end();
        res.status(500).json({ error: err.message });
      });
      w.on('close', () => {
        end();
        res.json({ ok: true, path: remotePath, size: req.body.length });
      });
      w.end(req.body);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.get('/api/files/download', requireAuth, async (req, res) => {
  try {
    const serverId = String(req.query.serverId ?? '');
    const remotePath = String(req.query.path ?? '');
    if (!remotePath) return res.status(400).json({ error: '缺少文件路径' });
    const cfg = findServer(serverId);
    if (!cfg) return res.status(404).json({ error: '服务器不存在' });

    const { sftp, end } = await openSftp(cfg);
    const filename = path.posix.basename(remotePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const r = sftp.createReadStream(remotePath);
    r.on('error', (err: Error) => {
      end();
      res.status(500).json({ error: err.message });
    });
    r.on('end', () => end());
    r.pipe(res);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 新建远程目录
app.post('/api/files/mkdir', requireAuth, async (req, res) => {
  try {
    const serverId = String(req.body?.serverId ?? '');
    const dir = String(req.body?.path ?? '').replace(/^\.\.(\/|$)/, '') || '.';
    const cfg = findServer(serverId);
    if (!cfg) return res.status(404).json({ error: '服务器不存在' });
    await sftpMkdir(cfg, dir);
    res.json({ ok: true, path: dir });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 重命名 / 移动远程文件或目录
app.post('/api/files/rename', requireAuth, async (req, res) => {
  try {
    const serverId = String(req.body?.serverId ?? '');
    const from = String(req.body?.from ?? '');
    const to = String(req.body?.to ?? '');
    if (!from || !to) return res.status(400).json({ error: '缺少源/目标路径' });
    const cfg = findServer(serverId);
    if (!cfg) return res.status(404).json({ error: '服务器不存在' });
    await sftpRename(cfg, from, to);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 删除远程文件或空目录（isDir=true 时走 rmdir）
app.post('/api/files/remove', requireAuth, async (req, res) => {
  try {
    const serverId = String(req.body?.serverId ?? '');
    const pathStr = String(req.body?.path ?? '');
    const isDir = Boolean(req.body?.isDir);
    if (!pathStr) return res.status(400).json({ error: '缺少路径' });
    const cfg = findServer(serverId);
    if (!cfg) return res.status(404).json({ error: '服务器不存在' });
    await sftpRemove(cfg, pathStr, isDir);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============================================================
// WebSocket SSH 通道
// ============================================================

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/ssh' });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', 'ws://localhost');
  const serverId = url.searchParams.get('serverId') ?? '';
  const token = url.searchParams.get('token') ?? '';
  const cols = Number(url.searchParams.get('cols') ?? 80);
  const rows = Number(url.searchParams.get('rows') ?? 24);

  // 鉴权
  try {
    verifyToken(token);
  } catch {
    ws.send(JSON.stringify({ type: 'status', state: 'error', message: '未授权或令牌无效' }));
    ws.close();
    return;
  }

  const cfg = findServer(serverId);
  if (!cfg) {
    ws.send(JSON.stringify({ type: 'status', state: 'error', message: '服务器不存在' }));
    ws.close();
    return;
  }

  let handle: ShellHandle | null = null;
  const send = (obj: unknown) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  };

  ws.send(JSON.stringify({ type: 'status', state: 'connecting', server: safeServer(cfg) }));

  openShell(cfg, { cols, rows })
    .then((h) => {
      handle = h;
      send({ type: 'status', state: 'ready' });
      h.onOutput((data) => send({ type: 'output', data }));
      h.onClose(() => {
        send({ type: 'status', state: 'closed' });
        ws.close();
      });

      ws.on('message', (raw) => {
        let msg: { type?: string; data?: string; cols?: number; rows?: number };
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === 'input' && typeof msg.data === 'string') h.write(msg.data);
        else if (msg.type === 'resize') h.resize(msg.cols ?? 80, msg.rows ?? 24);
        else if (msg.type === 'ping') send({ type: 'pong' });
      });
    })
    .catch((err: Error) => {
      send({ type: 'status', state: 'error', message: err.message });
      ws.close();
    });

  ws.on('close', () => handle?.close());
});

// 统一 JSON 404 兜底（注册在所有路由之后）
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`[liquid-ssh] API + WebSocket 服务已启动: http://localhost:${PORT}`);
  console.log(`[liquid-ssh] SSH WebSocket 地址: ws://localhost:${PORT}/ws/ssh`);
});