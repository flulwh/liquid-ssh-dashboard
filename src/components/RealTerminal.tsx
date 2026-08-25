import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Server } from '../types';
import { sshUrl } from '../api/client';
import { usePrefsStore } from '../store/usePrefsStore';

type ConnState = 'connecting' | 'ready' | 'closed' | 'error';

interface RealTerminalProps {
  server: Server;
}

/**
 * 真实 SSH 终端：xterm.js + WebSocket 连接到后端（Node.js + ssh2）。
 * 数据流：终端输入 → WS → ssh2 shell；ssh2 输出 → WS → 终端。
 */
export function RealTerminal({ server }: RealTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ConnState>('connecting');
  const [error, setError] = useState('');
  const [sessionKey, setSessionKey] = useState(0);
  const fontSize = usePrefsStore((s) => s.terminalFontSize);
  const fontFamily = usePrefsStore((s) => s.terminalFont);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const { id, host, username } = server;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stateRef: { current: ConnState } = { current: 'connecting' };
    const updateState = (s: ConnState) => {
      stateRef.current = s;
      setState(s);
      if (s === 'error') setError((prev) => prev || '连接失败');
    };
    updateState('connecting');
    setError('');

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      fontFamily: `'${fontFamily}', 'SF Mono', Menlo, monospace`,
      fontSize,
      lineHeight: 1.25,
      letterSpacing: 0.3,
      scrollback: 1000,
      theme: {
        background: '#00000000',
        foreground: '#d7dce6',
        cursor: '#8b5cf6',
        selectionBackground: 'rgba(139, 92, 246, 0.35)',
        green: '#34d399',
        yellow: '#fbbf24',
        cyan: '#22d3ee',
        magenta: '#f472b6',
        blue: '#60a5fa',
        red: '#fb7185',
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    let ws: WebSocket | null = null;
    let disposed = false;

    const connect = async () => {
      try {
        const url = await sshUrl(id, term.cols, term.rows);
        if (disposed) return;
        ws = new WebSocket(url);
      } catch (err) {
        setError((err as Error).message);
        updateState('error');
        return;
      }

      ws.onopen = () => term.write('\x1b[90m▲ 正在建立 SSH 会话…\x1b[0m\r\n');

      ws.onmessage = (ev) => {
        let msg: { type?: string; data?: string; state?: string; message?: string };
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (msg.type === 'output' && msg.data) {
          term.write(msg.data);
        } else if (msg.type === 'status') {
          if (msg.state === 'ready') {
            updateState('ready');
            term.write(`\x1b[32m✓ 已连接 ${username}@${host}\x1b[0m\r\n`);
          } else if (msg.state === 'closed') {
            updateState('closed');
            term.write('\r\n\x1b[33m连接已关闭\x1b[0m\r\n');
          } else if (msg.state === 'error') {
            setError(msg.message ?? '连接失败');
            updateState('error');
          }
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setError('WebSocket 连接错误');
        updateState('error');
      };

      ws.onclose = () => {
        if (disposed) return;
        if (stateRef.current !== 'error' && stateRef.current !== 'closed') {
          updateState('closed');
        }
      };
    };

    connect();

    const inputDisposable = term.onData((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(el);

    return () => {
      disposed = true;
      inputDisposable.dispose();
      resizeObserver.disconnect();
      ws?.close();
      term.dispose();
    };
  }, [id, host, username, sessionKey]);

  // 终端字号 / 字体变化实时应用
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontFamily = `'${fontFamily}', 'SF Mono', Menlo, monospace`;
    term.options.fontSize = fontSize;
    try {
      fitRef.current?.fit();
    } catch {
      /* ignore */
    }
  }, [fontFamily, fontSize]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full px-3 py-2" />

      {/* 状态遮罩 */}
      {state !== 'ready' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/30 backdrop-blur-sm">
          {state === 'connecting' && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在连接 {host}:{server.port}…
            </div>
          )}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="max-w-xs text-sm text-rose-300">连接失败：{error}</span>
              <button onClick={() => setSessionKey((k) => k + 1)} className="glass-btn">
                <RefreshCw className="h-4 w-4" /> 重试
              </button>
            </div>
          )}
          {state === 'closed' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-sm text-white/60">SSH 会话已结束</span>
              <button onClick={() => setSessionKey((k) => k + 1)} className="glass-btn">
                <RefreshCw className="h-4 w-4" /> 重新连接
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}