import { useEffect, useState } from 'react';
import type { Server } from '../types';
import { fetchServerLoad, type ServerLoad } from '../api/client';

/** 真实采集每台服务器的负载（SSH 命令），间隔轮询；离线/未配凭据的服务器自动跳过 */
export function useServerLoads(servers: Server[], intervalMs = 10_000) {
  const [loads, setLoads] = useState<Record<string, ServerLoad>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (!servers.length) return;
      const results = await Promise.all(
        servers.map((s) =>
          fetchServerLoad(s.id)
            .then((l) => [s.id, l] as const)
            .catch(() => null)
        )
      );
      if (cancelled) return;
      setLoads((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r) next[r[0]] = r[1];
        }
        // 移除已删除服务器的缓存
        const ids = new Set(servers.map((s) => s.id));
        for (const k of Object.keys(next)) if (!ids.has(k)) delete next[k];
        return next;
      });
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        await run();
        schedule();
      }, intervalMs);
    };

    run();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [servers, intervalMs, tick]);

  return { loads, refresh: () => setTick((t) => t + 1) };
}