import { create } from 'zustand';
import { hasToken, logout as clientLogout } from '../api/client';

interface AuthState {
  authed: boolean;
  setAuthed: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: hasToken(),
  setAuthed: (v) => set({ authed: v }),
  logout: () => {
    clientLogout();
    set({ authed: false });
  },
}));