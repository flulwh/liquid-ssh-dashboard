import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CornerDownLeft,
  LayoutGrid,
  Search,
  Server as ServerIcon,
  Settings,
  TerminalSquare,
  Zap,
  FolderOpen,
  Info,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useServerStore } from '../store/useServerStore';
import { useTerminalStore } from '../store/useTerminalStore';
import { useT } from '../i18n/useT';
import { cn } from '../utils/cn';

interface CommandItem {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  keywords: string;
  run: () => void;
}

/** 命令面板（⌘K）：全局搜索服务器与快捷操作 */
export function CommandPalette() {
  const { t } = useT();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const toggle = useUIStore((s) => s.toggleCommandPalette);

  const servers = useServerStore((s) => s.servers);
  const openTab = useTerminalStore((s) => s.openTab);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dash', label: t('nav.dashboard'), subtitle: t('commandPalette.sections.nav'), icon: LayoutGrid, keywords: 'dashboard home', run: () => navigate('/') },
      { id: 'nav-servers', label: t('nav.servers'), subtitle: t('commandPalette.sections.nav'), icon: ServerIcon, keywords: 'servers list', run: () => navigate('/servers') },
      { id: 'nav-term', label: t('nav.terminal'), subtitle: t('commandPalette.sections.nav'), icon: TerminalSquare, keywords: 'terminal ssh', run: () => navigate('/terminal') },
      { id: 'nav-files', label: t('nav.files'), subtitle: t('commandPalette.sections.nav'), icon: FolderOpen, keywords: 'files sftp', run: () => navigate('/files') },
      { id: 'nav-mon', label: t('nav.monitoring'), subtitle: t('commandPalette.sections.nav'), icon: Activity, keywords: 'monitoring cpu mem', run: () => navigate('/monitoring') },
      { id: 'nav-set', label: t('nav.settings'), subtitle: t('commandPalette.sections.nav'), icon: Settings, keywords: 'settings', run: () => navigate('/settings') },
      { id: 'nav-about', label: t('nav.about'), subtitle: t('commandPalette.sections.nav'), icon: Info, keywords: 'about github', run: () => navigate('/about') },
    ];
    const srv: CommandItem[] = servers.map((s) => ({
      id: `srv-${s.id}`,
      label: `${t('servers.connect')} ${s.name}`,
      subtitle: `${s.username}@${s.host}:${s.port}`,
      icon: Zap,
      keywords: `${s.name} ${s.host} ${s.username} ssh`,
      run: () => {
        openTab(s.id, s.name);
        navigate('/terminal');
      },
    }));
    return [...nav, ...srv];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servers, navigate, openTab, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        i.keywords.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const run = (item: CommandItem) => {
    close();
    item.run();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[index]) {
      run(filtered[index]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            className="glass glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl shadow-glass-lg"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-white/50" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('commandPalette.placeholder')}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <kbd className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                ESC
              </kbd>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-white/40">
                  {t('commandPalette.empty')}
                </div>
              )}
              {filtered.map((item, i) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => run(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    i === index ? 'bg-white/10' : 'hover:bg-white/5'
                  )}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] ring-1 ring-white/10">
                    <item.icon className="h-4 w-4 text-white/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white/90">{item.label}</div>
                    <div className="truncate text-xs text-white/45">{item.subtitle}</div>
                  </div>
                  {i === index && (
                    <CornerDownLeft className="h-4 w-4 shrink-0 text-white/40" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-[11px] text-white/35">
              <span>↑↓ {t('common.search')}</span>
              <span>↵ {t('common.confirm')}</span>
              <span>esc {t('common.close')}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}