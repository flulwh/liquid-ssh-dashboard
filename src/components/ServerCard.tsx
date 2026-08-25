import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Edit3,
  MoreHorizontal,
  Play,
  Server as ServerIcon,
  Trash2,
} from 'lucide-react';
import type { Server } from '../types';
import { GlassCard } from './GlassCard';
import { useTerminalStore } from '../store/useTerminalStore';

interface ServerCardProps {
  server: Server;
  delay?: number;
  onEdit?: (server: Server) => void;
  onDelete?: (id: string) => void;
}

/** 服务器卡片：名称 / 地址 / 用户 / 端口 + 真实 SSH 连接 */
export function ServerCard({ server, delay = 0, onEdit, onDelete }: ServerCardProps) {
  const navigate = useNavigate();
  const openTab = useTerminalStore((s) => s.openTab);
  const [menuOpen, setMenuOpen] = useState(false);

  const connect = () => {
    openTab(server.id, server.name);
    navigate('/terminal');
  };

  return (
    <GlassCard
      hover
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden p-5"
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
            <ServerIcon className="h-5 w-5 text-white/80" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-white">{server.name}</h3>
            <p className="truncate font-mono text-xs text-white/45">
              {server.username}@{server.host}:{server.port}
            </p>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="glass-btn !p-2"
              aria-label="更多操作"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="glass glass-strong absolute right-0 top-12 z-20 w-40 overflow-hidden rounded-xl p-1"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.(server);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    <Edit3 className="h-4 w-4" /> 编辑
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(server.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-4 w-4" /> 删除
                  </button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 操作 */}
      <div className="relative mt-5 flex items-center gap-2">
        <button
          onClick={connect}
          className="glass-btn flex-1 !bg-white/10 font-semibold text-white"
        >
          <Play className="h-4 w-4 fill-current" />
          SSH 连接
        </button>
      </div>
    </GlassCard>
  );
}