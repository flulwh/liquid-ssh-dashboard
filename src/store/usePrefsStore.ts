import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 用户偏好（真实生效并持久化到 localStorage） */
export type FontOption = 'JetBrains Mono' | 'Monaco' | 'Menlo';

interface PrefsState {
  notifications: boolean; // 告警通知（持久化偏好）
  autoRefreshSec: number; // 指标/负载刷新间隔
  motion: boolean; // 高级动效（reduced motion）
  terminalFontSize: number; // 终端字号
  terminalFont: FontOption; // 终端字体
  setNotifications: (v: boolean) => void;
  setAutoRefreshSec: (v: number) => void;
  setMotion: (v: boolean) => void;
  setTerminalFontSize: (v: number) => void;
  setTerminalFont: (v: FontOption) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      notifications: true,
      autoRefreshSec: 10,
      motion: true,
      terminalFontSize: 13,
      terminalFont: 'JetBrains Mono',
      setNotifications: (v) => set({ notifications: v }),
      setAutoRefreshSec: (v) => set({ autoRefreshSec: v }),
      setMotion: (v) => set({ motion: v }),
      setTerminalFontSize: (v) => set({ terminalFontSize: v }),
      setTerminalFont: (v) => set({ terminalFont: v }),
    }),
    { name: 'lsd_prefs' }
  )
);