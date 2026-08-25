import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Loader2, Plus, RefreshCw, Search, Server as ServerIcon } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { useServerStore } from '../store/useServerStore';
import { useTerminalStore } from '../store/useTerminalStore';
import { useServerReachability } from '../hooks/useServerReachability';
import { useServerLoads } from '../hooks/useServerLoads';
import { usePrefsStore } from '../store/usePrefsStore';
import { getApiBase, type ServerLoad } from '../api/client';
import { cn } from '../utils/cn';
import { formatBytes } from '../utils/format';

export default function Dashboard() {
  const { servers, loading } = useServerStore();
  const autoRefreshSec = usePrefsStore((s) => s.autoRefreshSec);
  const refreshMs = autoRefreshSec * 1000;
  const reach = useServerReachability(servers, refreshMs);
  const { loads, refresh: refreshLoads } = useServerLoads(servers, refreshMs);
  const openTab = useTerminalStore((s) => s.openTab);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const online = useMemo(
    () => servers.filter((s) => reach.map[s.id]?.reachable).length,
    [servers, reach.map]
  );
  const offline = servers.length - online;

  const avgCpu = useMemo(() => {
    const list = servers.map((s) => loads[s.id]).filter((l): l is ServerLoad => Boolean(l));
    if (!list.length) return 0;
    return Math.round(list.reduce((a, b) => a + b.cpu, 0) / list.length);
  }, [servers, loads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.host.toLowerCase().includes(q)
    );
  }, [servers, query]);

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              仪表盘
            </h1>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              Overview
            </span>
          </div>
          <p className="mt-1 text-sm text-white/45">真实后端数据 · 自动连通性探测</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reach.refresh}
            disabled={reach.refreshing}
            className="glass-btn text-white/70"
            title="刷新探测"
          >
            <RefreshCw className={cn('h-4 w-4', reach.refreshing && 'animate-spin')} />
          </button>
          <Link to="/servers" className="glass-btn !bg-white/10 font-medium text-white">
            <Plus className="h-4 w-4" /> 管理服务器
          </Link>
        </div>
      </div>

      {loading ? (
        <GlassCard spotlight={false} className="flex items-center justify-center gap-3 py-24 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" /> 正在加载…
        </GlassCard>
      ) : (
        <>
          {/* 统计行 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="在线"
              value={String(online)}
              sub={`${servers.length} 台已配置`}
              accent="emerald"
              delay={0}
            />
            <StatCard
              label="离线 / 不可达"
              value={String(offline)}
              sub={reach.refreshing ? '探测中…' : '本次探测结果'}
              accent="rose"
              delay={0.05}
            />
            <StatCard
              label="平均 CPU"
              value={avgCpu ? `${avgCpu}%` : '—'}
              sub="已连服务器负载 (loadavg)"
              accent="violet"
              delay={0.1}
            />
            <StatCard
              label="后端 API"
              value={reach.backendOk ? '在线' : '离线'}
              sub={getApiBase() || '未配置地址'}
              accent="sky"
              delay={0.15}
            />
          </div>

          {/* 服务器 Bento */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <GlassCard spotlight={false} className="overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <ServerIcon className="h-4 w-4 text-white/50" />
                  <h2 className="text-sm font-semibold text-white">服务器</h2>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-white/45">
                    {servers.length}
                  </span>
                </div>
                <div className="glass ml-auto flex w-56 items-center gap-2 rounded-lg px-2.5 py-1.5">
                  <Search className="h-3.5 w-3.5 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="筛选服务器…"
                    className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <ServerIcon className="h-8 w-8 text-white/25" />
                    <p className="text-sm text-white/45">
                      {servers.length === 0
                        ? '尚未配置任何服务器'
                        : '没有匹配的服务器'}
                    </p>
                    <Link to="/servers" className="glass-btn">
                      <Plus className="h-4 w-4" /> 添加服务器
                    </Link>
                  </div>
                ) : (
                  filtered.map((s, i) => (
                    <ServerRow
                      key={s.id}
                      name={s.name}
                      endpoint={`${s.username}@${s.host}:${s.port}`}
                      reachable={reach.map[s.id]?.reachable ?? false}
                      latency={reach.map[s.id]?.latencyMs ?? null}
                      checking={!reach.map[s.id]}
                      load={loads[s.id]}
                      onOpen={() => {
                        openTab(s.id, s.name);
                        navigate('/terminal');
                      }}
                      delay={i * 0.03}
                    />
                  ))
                )}
              </div>
            </GlassCard>

            {/* 后端 / 说明 */}
            <GlassCard spotlight={false} className="flex flex-col p-5">
              <h3 className="text-sm font-semibold text-white">连接端点</h3>
              <div className="mt-4 space-y-3">
                <Endpoint
                  label="后端 API"
                  value={getApiBase() || '未配置'}
                  state={reach.backendOk ? 'ok' : 'down'}
                />
                <Endpoint
                  label="SSH 通道"
                  value={`${(getApiBase() || '').replace(/^http/, 'ws')}/ws/ssh` || '—'}
                  state={reach.backendOk ? 'ok' : 'down'}
                />
              </div>
              <div className="mt-auto pt-5 text-xs text-white/35">
                连通性由后端对每个主机:端口做真实 TCP 探测，每 30s 刷新一次。
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'rose' | 'violet' | 'sky';
  delay: number;
}) {
  const dot = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    violet: 'bg-violet-400',
    sky: 'bg-sky-400',
  }[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard spotlight={false} className="p-5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/45">
            {label}
          </span>
        </div>
        <div className="mt-3 font-mono text-3xl font-semibold tracking-tight text-white">
          {value}
        </div>
        <div className="mt-1 truncate font-mono text-xs text-white/40">{sub}</div>
      </GlassCard>
    </motion.div>
  );
}

function ServerRow({
  name,
  endpoint,
  reachable,
  latency,
  checking,
  load,
  onOpen,
  delay,
}: {
  name: string;
  endpoint: string;
  reachable: boolean;
  latency: number | null;
  checking: boolean;
  load?: ServerLoad;
  onOpen: () => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
    >
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          checking ? 'animate-pulse bg-white/30' : reachable ? 'bg-emerald-400' : 'bg-rose-400'
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white/90">{name}</div>
            <div className="truncate font-mono text-xs text-white/40">{endpoint}</div>
          </div>
          {load && (
            <div className="hidden min-w-0 flex-1 grid-cols-3 gap-3 sm:grid">
              <MetricBar label="CPU" value={Math.round(load.cpu)} />
              <MetricBar label="内存" value={load.mem.percent} />
              <MetricBar label="磁盘" value={load.disk.percent} />
            </div>
          )}
        </div>
        {load ? (
          <div className="mt-2 grid grid-cols-3 gap-3 sm:hidden">
            <MetricBar label="CPU" value={Math.round(load.cpu)} />
            <MetricBar label="内存" value={load.mem.percent} />
            <MetricBar label="磁盘" value={load.disk.percent} />
          </div>
        ) : reachable && !checking ? (
          <div className="mt-1 text-xs text-white/30">未配置连接凭据，无法采集负载</div>
        ) : null}
      </div>
      <span className="hidden font-mono text-xs text-white/40 sm:block">
        {checking ? '探测中' : reachable ? `${latency}ms` : '不可达'}
      </span>
      <button
        onClick={onOpen}
        className="glass-btn !px-2.5 !py-1.5 text-white/70 group-hover:text-white"
      >
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color = value > 90 ? 'bg-rose-400' : value > 75 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>{label}</span>
        <span className="tabular-nums text-white/60">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function Endpoint({ label, value, state }: { label: string; value: string; state: 'ok' | 'down' }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            state === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
          )}
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/45">
          {label}
        </span>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-white/70">{value}</div>
    </div>
  );
}