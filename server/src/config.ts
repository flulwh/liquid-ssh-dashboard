import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 极简 .env 加载（无需 dotenv 依赖） */
function loadEnvFile() {
  const p = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnvFile();

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  passphrase?: string;
}

/** 从 servers.json（或 SERVERS_FILE 环境变量指定路径）读取服务器配置；不存在则返回空列表 */
export function loadServers(): ServerConfig[] {
  const p = process.env.SERVERS_FILE || path.resolve(__dirname, '../servers.json');
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as ServerConfig[];
  } catch {
    return [];
  }
}

/** 写回服务器配置（真实持久化，供前端增删改） */
export function saveServers(list: ServerConfig[]): void {
  const p = process.env.SERVERS_FILE || path.resolve(__dirname, '../servers.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(list, null, 2));
}

export function findServer(id: string): ServerConfig | undefined {
  return loadServers().find((s) => s.id === id);
}