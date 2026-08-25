import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Loader2, Plus, TerminalSquare, Wifi, WifiOff, X } from 'lucide-react';
import { RealTerminal } from '../components/RealTerminal';
import { GlassCard } from '../components/GlassCard';
import { useServerStore } from '../store/useServerStore';
import { useTerminalStore } from '../store/useTerminalStore';
import { useT } from '../i18n/useT';
import { cn } from '../utils/cn';

export default function TerminalPage() {
  const { t } = useT();
  const { servers, loading } = useServerStore();
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useTerminalStore();

  const [pickerOpen, setPickerOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeServer = activeTab
    ? (servers.find((s) => s.id === activeTab.serverId) ?? null)
    : null;

  const connect = (serverId: string) => {
    const srv = servers.find((s) => s.id === serverId);
    if (!srv) return;
    openTab(srv.id, srv.name);
    setPickerOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* 头部 */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t('terminal.title')}
          </h1>
          <p className="mt-1 text-sm text-white/45">{t('terminal.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 后端状态 */}
          <span className="flex items-center gap-1.5 text-xs text-white/45">
            {loading || (servers.length === 0 && !loading) ? (
              servers.length === 0 ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-white/40" />
                  {t('terminal.noServerYet')}
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  {t('terminal.serverCount', { n: servers.length })}
                </>
              )
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
          </span>

          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              disabled={servers.length === 0}
              className="glass-btn !bg-white/10 font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> {t('terminal.newConnect')}
              <ChevronDown className="h-4 w-4 text-white/50" />
            </button>

            <AnimatePresence>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -6 }}
                    className="glass glass-strong absolute right-0 top-12 z-20 w-72 overflow-hidden rounded-2xl p-1.5"
                  >
                    <p className="px-3 py-2 text-xs uppercase tracking-wider text-white/40">
                      {t('terminal.pickServer')}
                    </p>
                    {servers.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-white/40">
                        {t('terminal.noTabHintEmpty')}
                      </p>
                    ) : (
                      servers.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => connect(s.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white/90">{s.name}</span>
                            <span className="block truncate font-mono text-xs text-white/40">
                              {s.username}@{s.host}:{s.port}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 终端主体 */}
      {tabs.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <TerminalSquare className="h-7 w-7 text-white/40" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t('terminal.noTab')}</h3>
            <p className="mt-1 text-sm text-white/45">
              {servers.length === 0 ? t('terminal.noTabHintEmpty') : t('terminal.noTabHintReady')}
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard strong className="overflow-hidden !rounded-2xl">
          {/* 标签栏 */}
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-white/10 px-2 pt-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'group flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2 text-sm transition-colors',
                  t.id === activeTabId
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {t.title}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.id);
                  }}
                  className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>

          {/* 终端区域 */}
          <div className="terminal-glass relative h-[72vh] min-h-[480px]">
            {activeServer ? (
              <RealTerminal key={activeServer.id} server={activeServer} />
            ) : activeTab ? (
              <div className="grid h-full place-items-center text-sm text-white/40">
                {t('terminal.serverNotFound')}
              </div>
            ) : null}
          </div>

          {/* 底部状态条 */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/40">
            <span className="font-mono">
              {activeServer &&
                `${activeServer.username}@${activeServer.host}:${activeServer.port}`}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {t('terminal.sshReal')}
            </span>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
