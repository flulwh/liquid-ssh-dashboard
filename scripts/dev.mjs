#!/usr/bin/env node
/**
 * Liquid SSH Dashboard — 一键启动 / 关闭（跨平台：Windows / macOS / Linux）
 *
 * 用法：
 *   node scripts/dev.mjs            # 同时启动前端 + 后端
 *   停止：在该终端按 Ctrl+C，脚本会一并关闭前后端子进程
 *   npm run dev:all    —— 实际调用本脚本
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'server');
const IS_WIN = process.platform === 'win32';

const RESET = '\x1b[0m';
const dim = (s) => `\x1b[2m${s}${RESET}`;
const tag = (label, color) => `[${color}${label}${RESET}]`;

const children = new Set();

function start(label, color, cwd) {
  const child = spawn('npm', ['run', 'dev'], {
    cwd,
    shell: IS_WIN,             // Windows 下 npm 需通过 shell 解析
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);

  const prefix = `${tag(label, color)} `;
  const readable = ['stdout', 'stderr'];
  for (const stream of readable) {
    let buf = '';
    child[stream].setEncoding('utf8');
    child[stream].on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        process.stdout.write(prefix + buf.slice(0, i + 1));
        buf = buf.slice(i + 1);
      }
    });
  }

  child.on('error', (err) => {
    process.stdout.write(`${prefix}启动失败: ${err.message}\n`);
  });

  child.on('exit', (code) => {
    children.delete(child);
    process.stdout.write(`${prefix}已退出 (${code ?? '信号'})\n`);
    if (children.size === 0) {
      process.stdout.write('\n所有服务均已停止。\n');
      shutdown(0);
    }
  });
  return child;
}

function shutdown(code) {
  for (const child of children) {
    try {
      if (IS_WIN) {
        // Windows 使用 taskkill 连带关闭整个子进程树
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      /* 忽略已关闭进程 */
    }
  }
  // 稍等子进程退出后结束自身，避免残留终端进程
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(130));  // Ctrl+C
process.on('SIGTERM', () => shutdown(143));

// —— 启动 ——
process.stdout.write('\n');
process.stdout.write(dim('┌──────────────────────────────────────────────┐\n'));
process.stdout.write(dim('│ ') + ' Liquid SSH Dashboard — 一键启动' + dim('              │\n'));
process.stdout.write(dim('└──────────────────────────────────────────────┘\n'));
process.stdout.write('\n');

start('api', '36', SERVER);   // 后端 (ssh2 + WebSocket + SFTP)
start('web', '33', ROOT);     // 前端 (Vite)

process.stdout.write('\n');
process.stdout.write('打开浏览器访问前端地址（见上方 ' + tag('web', '33') + ' 日志中的 local URL）。\n');
process.stdout.write(`停止全部服务：在此终端按 ${dim('Ctrl+C')}。\n\n`);