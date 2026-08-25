import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client, type ClientChannel, type ConnectConfig, type SFTPWrapper } from 'ssh2';
import type { ServerConfig } from './config';

export function makeConnectConfig(cfg: ServerConfig): ConnectConfig {
  const c: ConnectConfig = {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    readyTimeout: 15000,
  };
  if (cfg.password) c.password = cfg.password;
  if (cfg.privateKey) c.privateKey = readFileSync(cfg.privateKey);
  if (cfg.passphrase) c.passphrase = cfg.passphrase;
  return c;
}

// ============================================================
// Shell 会话（用于 WebSocket 交互终端）
// ============================================================

export interface ShellHandle {
  id: string;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  close: () => void;
  onOutput: (handler: (data: string) => void) => void;
  onClose: (handler: () => void) => void;
}

interface ActiveSession {
  conn: Client;
  stream: ClientChannel;
}

const sessions = new Map<string, ActiveSession>();

export function openShell(
  cfg: ServerConfig,
  opts: { cols: number; rows: number }
): Promise<ShellHandle> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const outputHandlers: Array<(d: string) => void> = [];
    const closeHandlers: Array<() => void> = [];
    let settled = false;

    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', cols: opts.cols, rows: opts.rows }, (err, stream) => {
        if (err) {
          conn.end();
          if (!settled) {
            settled = true;
            reject(err);
          }
          return;
        }
        sessions.set(id, { conn, stream });

        stream.on('data', (data: Buffer) => outputHandlers.forEach((h) => h(data.toString('utf8'))));
        if (stream.stderr) {
          stream.stderr.on('data', (data: Buffer) => outputHandlers.forEach((h) => h(data.toString('utf8'))));
        }
        stream.on('close', () => {
          sessions.delete(id);
          conn.end();
          closeHandlers.forEach((h) => h());
        });

        if (!settled) {
          settled = true;
          resolve({
            id,
            write: (data) => stream.write(data),
            resize: (cols2, rows2) => stream.setWindow(rows2, cols2, 0, 0),
            close: () => {
              sessions.delete(id);
              stream.close();
              conn.end();
            },
            onOutput: (h) => outputHandlers.push(h),
            onClose: (h) => closeHandlers.push(h),
          });
        }
      });
    });

    conn.on('error', (err) => {
      conn.end();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    conn.connect(makeConnectConfig(cfg));
  });
}

export function closeSession(id: string) {
  const s = sessions.get(id);
  if (s) {
    sessions.delete(id);
    s.stream.close();
    s.conn.end();
  }
}

// ============================================================
// SFTP（文件上传 / 下载 / 列表）
// ============================================================

export interface RemoteEntry {
  name: string;
  type: string; // 'd' | '-' | 'l'
  size: number;
  mtime: number;
  mode: number;
}

export function openSftp(cfg: ServerConfig): Promise<{ sftp: SFTPWrapper; end: () => void }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('error', (err) => {
      conn.end();
      reject(err);
    });
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        resolve({ sftp, end: () => conn.end() });
      });
    });
    conn.connect(makeConnectConfig(cfg));
  });
}

export function listDir(cfg: ServerConfig, dir: string): Promise<RemoteEntry[]> {
  return openSftp(cfg).then(
    ({ sftp, end }) =>
      new Promise<RemoteEntry[]>((resolve, reject) => {
        sftp.readdir(dir, (err, list) => {
          end();
          if (err) return reject(err);
          resolve(
            list.map((l) => ({
              name: l.filename,
              type: l.longname.charAt(0),
              size: l.attrs.size ?? 0,
              mtime: (l.attrs.mtime ?? 0) * 1000,
              mode: l.attrs.mode ?? 0,
            }))
          );
        });
      })
  );
}

/** 新建远程目录 */
export function sftpMkdir(cfg: ServerConfig, dir: string): Promise<void> {
  return openSftp(cfg).then(
    ({ sftp, end }) =>
      new Promise<void>((resolve, reject) => {
        sftp.mkdir(dir, (err) => {
          end();
          err ? reject(err) : resolve();
        });
      })
  );
}

/** 删除远程文件（unlink）或空目录（rmdir） */
export function sftpRemove(cfg: ServerConfig, target: string, isDir: boolean): Promise<void> {
  return openSftp(cfg).then(
    ({ sftp, end }) =>
      new Promise<void>((resolve, reject) => {
        const fn = isDir ? sftp.rmdir.bind(sftp) : sftp.unlink.bind(sftp);
        fn(target, (err) => {
          end();
          err ? reject(err) : resolve();
        });
      })
  );
}

/** 远程重命名 / 移动 */
export function sftpRename(cfg: ServerConfig, from: string, to: string): Promise<void> {
  return openSftp(cfg).then(
    ({ sftp, end }) =>
      new Promise<void>((resolve, reject) => {
        sftp.rename(from, to, (err) => {
          end();
          err ? reject(err) : resolve();
        });
      })
  );
}

// ============================================================
// 负载采集（真实执行命令读取）
// ============================================================

export interface ServerLoad {
  cpu: number; // 0..100（loadavg1 相对核数）
  load1: number;
  mem: { total: number; used: number; percent: number };
  disk: { total: number; used: number; percent: number };
}

function exec(cfg: ServerConfig, command: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error('命令执行超时'));
    }, timeoutMs);
    let out = '';
    conn.on('error', (err) => {
      clearTimeout(timer);
      conn.end();
      reject(err);
    });
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          reject(err);
          return;
        }
        stream.on('data', (d: Buffer) => {
          out += d.toString('utf8');
        });
        stream.stderr?.on('data', (d: Buffer) => {
          out += d.toString('utf8');
        });
        stream.on('close', () => {
          clearTimeout(timer);
          conn.end();
          resolve(out);
        });
      });
    });
    conn.connect(makeConnectConfig(cfg));
  });
}

/** 采集 CPU 负载 / 内存 / 磁盘（真实 `/proc/loadavg`、`free`、`df`） */
export async function fetchLoad(cfg: ServerConfig): Promise<ServerLoad> {
  const cmd =
    'cat /proc/loadavg; echo __BREAK__; free -b; echo __BREAK__; df -B1 / 2>/dev/null; echo __BREAK__; nproc';
  const raw = await exec(cfg, cmd);
  const [avg, freePart, diskPart, nprocPart] = raw.split('__BREAK__').map((s) => s.trim());

  const load1 = Number(avg?.split(/\s+/)[0] ?? 0) || 0;
  const cpus = Number(nprocPart ?? 1) || 1;
  const cpu = Math.max(0, Math.min(100, (load1 / cpus) * 100));

  // free -b：第二行为 Mem 行，列序 total 可用(available)
  const memLine = (freePart || '').split('\n')[1] ?? '0 0 0 0 0 0 0 0 0 0';
  const mem = memLine.trim().split(/\s+/).map(Number);
  const memTotal = mem[1] ?? 0;
  const memAvail = mem[6] ?? 0;
  const memUsed = Math.max(0, memTotal - memAvail);

  // df -B1 /：第二行为数据行，列序 1B-blocks Used
  const diskLine = (diskPart || '').split('\n')[1] ?? '';
  const d = diskLine.trim().split(/\s+/).map(Number);
  const diskTotal = d[1] ?? 0;
  const diskUsed = d[2] ?? 0;

  return {
    cpu: Math.round(cpu * 10) / 10,
    load1,
    mem: {
      total: memTotal,
      used: memUsed,
      percent: memTotal ? Math.round((memUsed / memTotal) * 100) : 0,
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      percent: diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0,
    },
  };
}

/** 拼接远程路径（POSIX）并做基础防穿越处理 */
export function safeJoin(dir: string, name: string): string {
  const clean = name.replace(/^\.\.(\/|$)/, '').replace(/[/\\]/g, '');
  return path.posix.join(dir || '.', clean);
}