import { create } from 'zustand';
import type { TerminalTab } from '../types';
import { uid } from '../utils/cn';

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  openTab: (serverId: string, title: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  closeAll: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (serverId, title) => {
    const existing = get().tabs.find((t) => t.serverId === serverId);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }
    const id = uid('tab');
    set((s) => ({
      tabs: [...s.tabs, { id, serverId, title }],
      activeTabId: id,
    }));
    return id;
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? (tabs.length ? tabs[tabs.length - 1].id : null) : s.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  closeAll: () => set({ tabs: [], activeTabId: null }),
}));