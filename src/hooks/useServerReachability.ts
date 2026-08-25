import { useEffect, useState } from 'react';
import type { Server } from '../types';
import { probeServer, isBackendReachable, type ProbeResult } from '../api/client';

interface Reachability {
  map: Record<string, ProbeResult>;
  backendOk: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/** 真实探测每台服务器的 SSH 端口连通性 + 后端健康，间隔刷新 */
export function useServerReachability(servers: Server[], intervalMs = 30_000): Reachability {
  const [map, setMap] = useState<Record<string, ProbeResult>>({});
  const [backendOk, setBackendOk] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      setRefreshing(true);
      try {
        const ok = await isBackendReachable();
        if (!cancelled) setBackendOk(ok);
        if (ok && servers.length) {
          const results = await Promise.all(
            servers.map((s) => probeServer(s.host, s.port).catch(() => ({
              reachable: false,
              latencyMs: null,
            })))
          );
          if (!cancelled) {
            const next: Record<string, ProbeResult> = {};
            servers.forEach((s, i) => (next[s.id] = results[i]));
            setMap(next);
          }
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        await run();
        schedule();
      }, intervalMs);
    };

    run();
    if (intervalMs > 0) schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [servers, intervalMs, tick]);

  return { map, backendOk, refreshing, refresh: () => setTick((t) => t + 1) };
}