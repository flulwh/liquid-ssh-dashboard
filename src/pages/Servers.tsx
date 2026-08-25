import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Plus, Search, Server as ServerIcon, X } from 'lucide-react';
import type { Server } from '../types';
import { ServerCard } from '../components/ServerCard';
import { GlassCard } from '../components/GlassCard';
import { useServerStore } from '../store/useServerStore';
import { cn } from '../utils/cn';

interface FormState {
  name: string;
  host: string;
  port: string;
  username: string;
  password?: string;
}

const emptyForm: FormState = {
  name: '',
  host: '',
  port: '22',
  username: 'root',
  password: '',
};

export default function Servers() {
  const { servers, loading, addServer, updateServer, removeServer } = useServerStore();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState<Server | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q)
    );
  }, [servers, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (s: Server) => {
    setEditing(s);
    setForm({
      name: s.name,
      host: s.host,
      port: String(s.port),
      username: s.username,
      password: '',
    });
    setError('');
    setModalOpen(true);
  };

  const submit = async () => {
    const base = {
      name: form.name.trim() || '未命名服务器',
      host: form.host.trim(),
      port: Number(form.port) || 22,
      username: form.username.trim() || 'root',
      ...(form.password?.trim() ? { password: form.password.trim() } : {}),
    };
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updateServer(editing.id, base);
      } else {
        await addServer(base);
      }
      setModalOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setError('');
    try {
      await removeServer(deleting.id);
      setDeleting(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 头部 */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            服务器<span className="text-gradient">管理</span>
          </h1>
          <p className="mt-1 text-sm text-white/45">
            真实后端配置 · 新增 / 编辑 / 删除均持久化到 servers.json
          </p>
        </div>
        <button onClick={openAdd} className="glass-btn !bg-white/10 font-semibold text-white">
          <Plus className="h-4 w-4" /> 添加服务器
        </button>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 px-0.5">
        <div className="glass ml-auto flex w-64 items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称 / IP / 用户…"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
        </div>
      </div>

      {/* 加载态 */}
      {loading ? (
        <GlassCard className="flex items-center justify-center gap-3 py-16 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" /> 正在从后端加载服务器…
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-16 text-center">
          <ServerIcon className="h-8 w-8 text-white/30" />
          <p className="text-white/50">尚未配置任何服务器</p>
          <button onClick={openAdd} className="glass-btn">
            <Plus className="h-4 w-4" /> 添加第一台服务器
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
              >
                <ServerCard
                  server={s}
                  delay={i * 0.04}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleting(servers.find((x) => x.id === id) ?? null)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 新增 / 编辑弹窗 */}
      <AnimatePresence>
        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)}>
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {editing ? '编辑服务器' : '添加服务器'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="glass-btn !p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="名称">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Prod · API Gateway"
                  />
                </Field>
                <Field label="主机 / IP">
                  <input
                    className={inputCls}
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="10.20.0.11"
                  />
                </Field>
                <Field label="端口">
                  <input
                    className={inputCls}
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    placeholder="22"
                  />
                </Field>
                <Field label="用户名">
                  <input
                    className={inputCls}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="root"
                  />
                </Field>
                <Field label="密码（选填）" className="sm:col-span-2">
                  <input
                    type="password"
                    className={inputCls}
                    value={form.password ?? ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editing ? '留空则保持原密码' : '当前仅支持密码认证'}
                  />
                </Field>
              </div>

              {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setModalOpen(false)} className="glass-btn">
                  取消
                </button>
                <button
                  onClick={submit}
                  disabled={busy || !form.host.trim()}
                  className="glass-btn !bg-white/10 font-semibold text-white disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? '保存修改' : '添加服务器'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 删除确认 */}
      <AnimatePresence>
        {deleting && (
          <Modal onClose={() => setDeleting(null)}>
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-400/15">
                <X className="h-6 w-6 text-rose-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">删除服务器？</h3>
              <p className="mt-2 text-sm text-white/50">
                即将从 <span className="font-mono text-white">servers.json</span> 删除{' '}
                <span className="text-white">{deleting.name}</span>（{deleting.host}），该操作不可撤销。
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <button onClick={() => setDeleting(null)} className="glass-btn">
                  取消
                </button>
                <button onClick={confirmDelete} className="glass-btn !bg-rose-500/80 font-semibold text-white">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  确认删除
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const inputCls =
  'w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-white/25 transition-shadow';

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="glass glass-strong relative w-full max-w-lg overflow-hidden rounded-2xl shadow-glass-lg"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  );
}