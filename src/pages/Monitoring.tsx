import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Server as ServerIcon,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { useServerStore } from '../store/useServerStore';
import { usePrefsStore } from '../store/usePrefsStore';
import { fetchServerLoad } from '../api/client';
import { useT } from '../i18n/useT';
import { cn } from '../utils/cn';

interface SeriesPoint {
  t: number;
  cpu: number;
  mem: number;
  disk: number;
}

interface ServerTrend {
  serverId: string;
  series: SeriesPoint[];
  latest?: SeriesPoint;
  error?: string;
}

const MAX_POINTS = 60; // 约 10 分钟

/** 监控：每台服务器的实时负载 + 历史趋势曲线（真实 SSH 命令轮询） */
export default function Monitoring() {
  const { t, i18n } = useT();
  const { servers } = useServerStore();
  const autoRefreshSec = usePrefsStore((s) => s.autoRefreshSec);
  const POLL_MS = autoRefreshSec * 1000;
  const [trends, setTrends] = useState<Record<string, ServerTrend>>({});
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const lastTickRef = useRef(0);
  const timeLocale = i18n.language?.startsWith('en') ? 'en-US' : 'zh-CN';

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const collect = async () => {
      const results = await Promise.all(
        servers.map(async (s) => {
          try {
            const l = await fetchServerLoad(s.id);
            return { serverId: s.id, load: l } as const;
          } catch (e) {
            return { serverId: s.id, error: (e as Error).message } as const;
          }
        })
      );
      if (cancelled) return;
      setTrends((prev) => {
        const next: Record<string, ServerTrend> = {};
        const ids = new Set(servers.map((s) => s.id));
        // 保留仍在列表的服务器历史
        for (const id of Object.keys(prev)) if (ids.has(id)) next[id] = prev[id];
        for (const r of results) {
          const pt: SeriesPoint = {
            t: Date.now(),
            cpu: Math.round(r.load?.cpu ?? NaN),
            mem: r.load?.mem.percent ?? -1,
            disk: r.load?.disk.percent ?? -1,
          };
          const prevEntry = next[r.serverId];
          if ('load' in r && r.load) {
            const series = prevEntry
              ? [...prevEntry.series, pt].slice(-MAX_POINTS)
              : [pt];
            next[r.serverId] = {
              serverId: r.serverId,
              series,
              latest: pt,
              error: undefined,
            };
          } else {
            next[r.serverId] = {
              serverId: r.serverId,
              series: prevEntry?.series ?? [],
              error: ('error' in r ? r.error : undefined),
            };
          }
        }
        return next;
      });
    };

    const minGap = Math.max(POLL_MS - (Date.now() - lastTickRef.current), 0);
    const first = setTimeout(collect, minGap);
    timer = setTimeout(async () => {
      await collect();
      setRefreshing(false);
    }, Math.max(POLL_MS, minGap));

    return () => {
      cancelled = true;
      clearTimeout(first);
      if (timer) clearTimeout(timer);
    };
  }, [servers, tick, autoRefreshSec]);

  const list = useMemo(() => {
    const ids = new Set(servers.map((s) => s.id));
    return Object.values(trends)
      .filter((t) => ids.has(t.serverId))
      .sort((a, b) => a.serverId.localeCompare(b.serverId));
  }, [trends, servers]);

  const withLoad = list.filter((t) => t.latest);
  const noData = list.filter((t) => !t.latest);

  const refresh = () => {
    setRefreshing(true);
    lastTickRef.current = Date.now();
    setTick((t) => t + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 头部 */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{t('monitoring.title')}</h1>
            <span className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', withLoad.length ? 'bg-emerald-400' : 'bg-white/30')} />
              <span className="text-xs text-white/40">{t('monitoring.realtime', { n: POLL_MS / 1000 })}</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-white/45">{t('monitoring.subtitle')}</p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="glass-btn !p-2" title={t('monitoring.refresh')}>
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {servers.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-16 text-center">
          <ServerIcon className="h-8 w-8 text-white/25" />
          <p className="text-sm text-white/45">{t('monitoring.noServers')}</p>
        </GlassCard>
      ) : list.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-16 text-center">
          <Activity className="h-8 w-8 text-white/25" />
          <p className="text-sm text-white/45">{t('monitoring.noDataCard')}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {list.map((tr, i) => {
            const srv = servers.find((s) => s.id === tr.serverId);
            return (
              <TrendCard
                key={tr.serverId}
                title={srv?.name ?? tr.serverId}
                endpoint={srv ? `${srv.username}@${srv.host}:${srv.port}` : ''}
                trend={tr}
                delay={i * 0.05}
                timeLocale={timeLocale}
              />
            );
          })}
        </div>
      )}

      {noData.length > 0 && (
        <GlassCard className="flex items-start gap-3 p-4 text-sm">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
          <div className="text-white/50">
            <p className="mb-1 font-medium text-white/80">{t('monitoring.cannotCollectTitle')}</p>
            <ul className="space-y-1 text-xs text-white/40">
              {noData.map((tr) => {
                const srv = servers.find((s) => s.id === tr.serverId);
                return (
                  <li key={tr.serverId}>
                    {srv?.name ?? tr.serverId}
                    {tr.error ? ` — ${t('monitoring.cannotCollectPrefix')}${tr.error}` : ` — ${t('monitoring.cannotCollectNoCreds')}`}
                  </li>
                );
              })}
            </ul>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

function TrendCard({
  title,
  endpoint,
  trend,
  delay,
  timeLocale,
}: {
  title: string;
  endpoint: string;
  trend: ServerTrend;
  delay: number;
  timeLocale: string;
}) {
  const { t } = useT();
  const latest = trend.latest;
  const data = trend.series.map((p) => ({
    time: new Date(p.t).toLocaleTimeString(timeLocale, { hour12: false }),
    cpu: p.cpu,
    mem: p.mem,
    disk: p.disk,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <GlassCard className="space-y-4 p-5">
        {/* 标题 */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-white">{title}</h3>
            <p className="truncate font-mono text-xs text-white/40">{endpoint}</p>
          </div>
          {latest ? (
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums text-white">
                {Number.isFinite(latest.cpu) ? `${Math.round(latest.cpu)}%` : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">{t('monitoring.cpu')}</div>
            </div>
          ) : null}
        </div>

        {latest ? (
          <>
            {/* 三指标条 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricTiles cpu={latest.cpu} memPercent={latest.mem} diskPercent={latest.disk} />
            </div>

            {/* 趋势图 */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(data.length / 4)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,20,32,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  />
                  <Area type="monotone" dataKey="cpu" name={t('monitoring.cpu')} stroke="#a78bfa" strokeWidth={1.6} fill="url(#cpuGrad)" />
                  <Area type="monotone" dataKey="mem" name={t('monitoring.mem')} stroke="#34d399" strokeWidth={1.6} fill="url(#memGrad)" />
                  <Area type="monotone" dataKey="disk" name={t('monitoring.disk')} stroke="#38bdf8" strokeWidth={1.6} fill="url(#diskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-xs text-white/40">
            {trend.error ? `${t('monitoring.cannotCollectPrefix')}${trend.error}` : t('monitoring.waitingFirst')}
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

/** 三张当前指标瓦片：CPU / 内存 / 磁盘 */
function MetricTiles({
  cpu,
  memPercent,
  diskPercent,
}: {
  cpu: number;
  memPercent: number;
  diskPercent: number;
}) {
  const { t } = useT();
  return (
    <>
      <Tile icon={Cpu} label={t('monitoring.cpu')} percent={cpu} />
      <Tile icon={MemoryStick} label={t('monitoring.mem')} percent={memPercent} />
      <Tile icon={HardDrive} label={t('monitoring.disk')} percent={diskPercent} />
    </>
  );
}

function Tile({ icon: Icon, label, percent, detail }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  percent: number;
  detail?: string;
}) {
  const color = percent > 90 ? 'bg-rose-400' : percent > 75 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between text-white/50">
        <span className="flex items-center gap-1.5 text-xs">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-white/90">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {detail ? <div className="truncate text-[10px] tabular-nums text-white/35">{detail}</div> : null}
    </div>
  );
}
