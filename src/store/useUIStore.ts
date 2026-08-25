import { create } from 'zustand';

interface UIState {
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  sidebarCollapsed: false,

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));