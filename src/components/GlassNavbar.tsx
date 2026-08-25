import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  FolderOpen,
  LayoutGrid,
  Monitor,
  Search,
  Server as ServerIcon,
  Settings,
  TerminalSquare,
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useServerStore } from '../store/useServerStore';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { label: '仪表盘', path: '/', icon: LayoutGrid },
  { label: '服务器', path: '/servers', icon: ServerIcon },
  { label: '终端', path: '/terminal', icon: TerminalSquare },
  { label: '文件', path: '/files', icon: FolderOpen },
  { label: '监控', path: '/monitoring', icon: Activity },
  { label: '设置', path: '/settings', icon: Settings },
];

/** 顶部导航栏：Apple 风格悬浮玻璃栏 */
export function GlassNavbar() {
  const openPalette = useUIStore((s) => s.openCommandPalette);
  const servers = useServerStore((s) => s.servers);
  const count = servers.length;

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="glass glass-strong flex w-full max-w-6xl items-center gap-2 rounded-[22px] px-3 py-2 sm:gap-3 sm:px-4">
        {/* Logo + 产品名 */}
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
              Spatial Ops Console
            </span>
          </div>
        </Link>

        {/* 页面导航 */}
        <div className="no-scrollbar mx-auto flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
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
                  <span className="relative hidden md:inline">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* 服务器状态 */}
        <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 ring-1 ring-white/10 lg:flex">
          <span className="dot-online h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-white/70">
            {count}<span className="text-white/40"> 台已配置</span>
          </span>
          <Monitor className="h-3.5 w-3.5 text-white/40" />
        </div>

        {/* 搜索 */}
        <button
          onClick={openPalette}
          className="glass-btn hidden h-9 w-44 items-center justify-between !py-0 text-white/50 sm:flex"
          aria-label="打开命令面板"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            搜索
          </span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={openPalette}
          className="glass-btn !p-2 sm:hidden"
          aria-label="搜索"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* 头像 */}
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