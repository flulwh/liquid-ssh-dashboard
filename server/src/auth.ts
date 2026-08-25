import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SECRET = process.env.JWT_SECRET || 'liquid-ssh-dev-secret';
// 用户数据文件（不内置任何默认账户，首次通过注册创建）
const USERS_FILE = process.env.USERS_FILE || path.resolve(__dirname, '../users.json');

interface StoredUser {
  username: string;
  hash: string;
  createdAt: string;
}

function loadUsers(): StoredUser[] {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function hasUsers(): boolean {
  return loadUsers().length > 0;
}

export function userExists(username: string): boolean {
  return loadUsers().some((u) => u.username === username);
}

/** 创建账户：密码使用 bcrypt 哈希存储，绝不保存明文 */
export async function register(username: string, password: string): Promise<void> {
  if (typeof username !== 'string' || !username.trim()) throw new Error('用户名不能为空');
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('密码至少 6 位');
  }
  if (userExists(username)) throw new Error('用户已存在');
  const hash = await bcrypt.hash(password, 10);
  const users = loadUsers();
  users.push({ username: username.trim(), hash, createdAt: new Date().toISOString() });
  saveUsers(users);
}

/** 校验用户名密码：匹配则返回 true */
export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const user = loadUsers().find((u) => u.username === username);
  if (!user) return false;
  return bcrypt.compare(password, user.hash);
}

export function issueToken(username: string): string {
  return jwt.sign({ sub: username }, SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, SECRET) as { sub: string };
}