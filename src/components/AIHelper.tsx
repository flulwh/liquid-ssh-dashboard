import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Cpu, ScrollText, Send, Sparkles, TerminalSquare, Wand2 } from 'lucide-react';
import type { AIMessage } from '../types';
import { GlassCard } from './GlassCard';
import { useServerStore } from '../store/useServerStore';
import { uid } from '../utils/cn';

const SUGGESTIONS = [
  { label: '分析服务器状态', icon: Cpu },
  { label: '检测日志异常', icon: ScrollText },
  { label: '生成清理命令', icon: TerminalSquare },
  { label: '性能优化建议', icon: Wand2 },
];

function buildReply(input: string, summary: { online: number; total: number }): AIMessage {
  const base: AIMessage = { id: uid('msg'), role: 'assistant', content: '', timestamp: Date.now() };
  const t = input;

  if (/(分析|状态|overview)/.test(t)) {
    base.content = `当前共 ${summary.total} 台服务器（全部来自真实后端配置）。${
      summary.total === 0
        ? '还没有配置任何服务器，可以到「服务器」页面添加。'
        : '可对任意服务器发起真实 SSH 会话，或到「服务器」页面增删改配置。'
    }`;
    base.kind = 'text';
  } else if (/(日志|异常|error|log)/.test(t)) {
    base.kind = 'alert';
    base.content = '当前控制台不采集日志与指标，因此无法给出异常扫描结果。建议直接在「终端」中登录服务器查看日志。';
  } else if (/(清理|释放|空间|clean|disk)/.test(t)) {
    base.kind = 'command';
    base.content = 'du -sh /var/log/* | sort -rh | head -n 10\njournalctl --vacuum-size=200M\ndocker system prune -af --volumes';
  } else if (/(优化|性能|performance|调优)/.test(t)) {
    base.content = '性能优化建议：\n1. 数据库主机可调整 PostgreSQL `shared_buffers` 至内存的 25%\n2. 边缘节点可开启 HTTP/2 与 Brotli 压缩\n3. 定时器任务错峰调度，避免同一时刻 CPU 峰值';
    base.kind = 'suggestion';
  } else if (/(命令|command|生成)/.test(t)) {
    base.kind = 'command';
    base.content = 'uptime && free -h && df -h\ntop -bn1 | head -n 20';
  } else {
    base.content = '我可以帮你分析服务器状态、检测日志异常、生成运维命令并给出性能优化建议。试试下方的快捷指令，或直接描述你的需求。';
  }
  return base;
}

/** AI 运维助手：Apple Intelligence 风格对话卡片 */
export function AIHelper({ delay = 0 }: { delay?: number }) {
  const servers = useServerStore((s) => s.servers);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好，我是 Liquid AI 运维助手。我可以实时分析集群状态，生成可执行的 Shell 命令，并给出优化建议。',
      kind: 'text',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const summary = {
    online: servers.length,
    total: servers.length,
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { id: uid('msg'), role: 'user', content: text, timestamp: Date.now() }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, buildReply(text, summary)]);
      setThinking(false);
    }, 700 + Math.random() * 500);
  };

  return (
    <GlassCard
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* 头部 */}
      <div className="relative flex items-center gap-3 border-b border-white/10 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--md-primary-container)]">
          <Sparkles className="h-5 w-5 text-[var(--md-on-primary-container)]" />
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
            AI 运维助手
            <span className="rounded-full bg-aurora-violet/20 px-2 py-0.5 text-[10px] font-medium text-aurora-blue">
              Apple Intelligence
            </span>
          </h3>
          <p className="text-xs text-white/40">实时分析 · 命令生成 · 异常检测</p>
        </div>
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                    : 'rounded-bl-md bg-white/[0.06] text-white/85 ring-1 ring-white/[0.08]'
                }`}
              >
                {m.kind === 'alert' && (
                  <div className="mb-1.5 flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> 检测结果
                  </div>
                )}
                {m.kind === 'command' ? (
                  <div className="rounded-lg bg-black/40 p-3 font-mono text-[12px] text-emerald-300">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-white/30">建议命令</div>
                    {m.content}
                  </div>
                ) : (
                  <>{m.content}</>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-1 text-white/40">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-aurora-blue"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </span>
            <span className="text-xs">正在分析…</span>
          </motion.div>
        )}
      </div>

      {/* 快捷指令 */}
      <div className="flex flex-wrap gap-2 px-5 pb-3">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => send(s.label)} className="glass-btn !py-1.5 text-xs">
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="p-5 pt-0">
        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="向 AI 助手提问…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button onClick={() => send(input)} className="glass-btn !p-2" aria-label="发送">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}