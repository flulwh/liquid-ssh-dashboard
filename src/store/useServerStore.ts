import { create } from 'zustand';
import type { Server } from '../types';
import {
  fetchRemoteServers,
  createRemoteServer,
  updateRemoteServer,
  deleteRemoteServer,
  type ServerPayload,
} from '../api/client';

interface ServerState {
  servers: Server[];
  loading: boolean;
  error: string;
  load: () => Promise<void>;
  addServer: (payload: ServerPayload) => Promise<void>;
  updateServer: (id: string, payload: ServerPayload) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  loading: false,
  error: '',

  load: async () => {
    set({ loading: true, error: '' });
    try {
      const list = await fetchRemoteServers();
      set({ servers: list, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  addServer: async (payload) => {
    const srv = await createRemoteServer(payload);
    set((s) => ({ servers: [...s.servers, srv] }));
  },

  updateServer: async (id, payload) => {
    const srv = await updateRemoteServer(id, payload);
    set((s) => ({ servers: s.servers.map((x) => (x.id === id ? srv : x)) }));
  },

  removeServer: async (id) => {
    await deleteRemoteServer(id);
    set((s) => ({ servers: s.servers.filter((x) => x.id !== id) }));
  },
}));