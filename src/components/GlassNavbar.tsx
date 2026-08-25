import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  Check,
  FolderOpen,
  Info,
  Languages,
  LayoutGrid,
  Monitor,
  Search,
  Server as ServerIcon,
  Settings,
  TerminalSquare,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useServerStore } from '../store/useServerStore';
import { useT, setLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n/useT';
import { cn } from '../utils/cn';

const LANGS: Array<{ code: SupportedLanguage; label: string; short: string }> = [
  { code: 'zh', label: '中文', short: '中' },
  { code: 'en', label: 'English', short: 'EN' },
];

export function GlassNavbar() {
  const openPalette = useUIStore((s) => s.openCommandPalette);
  const servers = useServerStore((s) => s.servers);
  const count = servers.length;
  const { t } = useT();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = getCurrentLanguage();

  const navItems = [
    { key: 'dashboard', path: '/', icon: LayoutGrid },
    { key: 'servers', path: '/servers', icon: ServerIcon },
    { key: 'terminal', path: '/terminal', icon: TerminalSquare },
    { key: 'files', path: '/files', icon: FolderOpen },
    { key: 'monitoring', path: '/monitoring', icon: Activity },
    { key: 'settings', path: '/settings', icon: Settings },
    { key: 'about', path: '/about', icon: Info },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="glass glass-strong flex w-full max-w-6xl items-center gap-2 rounded-[22px] px-3 py-2 sm:gap-3 sm:px-4">
        {/* Logo + product name */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 pr-1">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[var(--md-primary-container)]">
            <TerminalSquare className="h-4 w-4 text-[var(--md-on-primary-container)]" strokeWidth={2.2} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" />
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Liquid <span className="text-gradient">SSH</span>
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              {t('login.title')}
            </span>
          </div>
        </Link>

        {/* Nav */}
        <div className="no-scrollbar mx-auto flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const labelKey = item.key as
              | 'dashboard'
              | 'servers'
              | 'terminal'
              | 'files'
              | 'monitoring'
              | 'settings'
              | 'about';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10" />
                    )}
                    <item.icon className="relative h-4 w-4" />
                    <span className="relative hidden md:inline">{t(`nav.${labelKey}`)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Server count */}
        <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 ring-1 ring-white/10 lg:flex">
          <span className="dot-online h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-white/70">
            {count}<span className="text-white/40"> {t('nav.configured')}</span>
          </span>
          <Monitor className="h-3.5 w-3.5 text-white/40" />
        </div>

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="glass-btn !px-2.5 !py-1.5 text-white/70"
            aria-label={t('nav.language')}
            title={t('nav.language')}
          >
            <Languages className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">
              {LANGS.find((l) => l.code === currentLang)?.short}
            </span>
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-32 overflow-hidden rounded-xl border border-white/10 bg-[var(--md-surface-container-high)] p-1 shadow-2xl">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                      l.code === currentLang
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : 'text-white/80 hover:bg-white/5'
                    )}
                  >
                    <span>{l.label}</span>
                    {l.code === currentLang && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <button
          onClick={openPalette}
          className="glass-btn hidden h-9 w-44 items-center justify-between !py-0 text-white/50 sm:flex"
          aria-label={t('common.openCommandPalette')}
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            {t('nav.search')}
          </span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={openPalette}
          className="glass-btn !p-2 sm:hidden"
          aria-label={t('nav.search')}
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <Link
          to="/settings"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--md-primary-container)] text-sm font-semibold text-[var(--md-on-primary-container)]"
        >
          L
        </Link>
      </nav>
    </header>
  );
}