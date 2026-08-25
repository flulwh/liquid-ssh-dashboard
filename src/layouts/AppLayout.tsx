import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from '../components/AuroraBackground';
import { GlassNavbar } from '../components/GlassNavbar';
import { CommandPalette } from '../components/CommandPalette';
import { useMouseGlow } from '../hooks/useMouseGlow';
import { useServerStore } from '../store/useServerStore';

/** 全局布局：Aurora 背景 + 顶部玻璃导航 + 页面出口 + 命令面板 */
export function AppLayout() {
  useMouseGlow();
  const load = useServerStore((s) => s.load);

  // 进入应用后从真实后端加载服务器列表
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <GlassNavbar />
      <main className="relative z-10 px-4 pb-16 pt-[92px] sm:px-6 sm:pt-[104px]">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}