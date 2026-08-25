import { useEffect, useRef, useState } from 'react';
import {
  ClipboardCopy,
  File as FileIcon,
  Folder,
  FolderPlus,
  FolderUp,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  Download,
} from 'lucide-react';
import type { RemoteFileEntry } from '../api/client';
import {
  downloadRemoteFile,
  listRemoteFiles,
  mkRemoteDir,
  removeRemoteEntry,
  renameRemoteFile,
  uploadRemoteFile,
} from '../api/client';
import type { Server } from '../types';
import { GlassCard } from './GlassCard';
import { cn } from '../utils/cn';
import { formatBytes } from '../utils/format';
import { useT } from '../i18n/useT';

interface FileManagerProps {
  servers: Server[];
}

interface ContextMenu {
  x: number;
  y: number;
  entry: RemoteFileEntry | null;
}

/** SFTP 文件管理器：右键菜单（下载/重命名/删除/复制路径）+ 新建目录 + 上传 */
export function FileManager({ servers }: FileManagerProps) {
  const { t } = useT();
  const [serverId, setServerId] = useState(servers[0]?.id ?? '');
  const [path, setPath] = useState('~');
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (servers[0] && !serverId) setServerId(servers[0].id);
  }, [servers, serverId]);

  const load = async (dir: string, id = serverId) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const normalized = dir === '~' ? '.' : dir;
      const res = await listRemoteFiles(id, normalized);
      setEntries(res.entries);
      setPath(res.path === '.' ? '~' : res.path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serverId) load('.', serverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const goUp = () => load(parentOf(path), serverId);
  const parentOf = (p: string) => {
    if (p === '~' || p === '/' || p === '.') return '.';
    const parts = p.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? '/' + parts.join('/') : '.';
  };

  const enterDir = (e: RemoteFileEntry) => {
    if (e.type === 'd') load(joinPath(path, e.name), serverId);
  };
  const joinPath = (base: string, name: string) => {
    if (base === '~' || base === '.') return name;
    return `${base.replace(/\/$/, '')}/${name}`;
  };
  const fullPath = (name: string) => (path === '~' ? `~/${name}` : `${path}/${name}`);

  const onUpload = async (file: File) => {
    if (!serverId || !file) return;
    setBusy(true);
    setError('');
    setMenu(null);
    try {
      await uploadRemoteFile(serverId, path === '~' ? '.' : path, file);
      await load(path, serverId);
    } catch (err) {
      setError(t('files.uploadFailed') + (err as Error).message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDownload = async (e: RemoteFileEntry) => {
    if (!serverId || e.type === 'd') return;
    setBusy(true);
    setError('');
    setMenu(null);
    try {
      const blob = await downloadRemoteFile(serverId, joinPath(path, e.name));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = e.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(t('files.downloadFailed') + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRename = async (entry: RemoteFileEntry, newName: string) => {
    if (!serverId || !newName || newName === entry.name) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await renameRemoteFile(serverId, fullPath(entry.name), fullPath(newName));
      await load(path, serverId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setRenaming(null);
    }
  };

  const onDelete = async (entry: RemoteFileEntry) => {
    if (!serverId) return;
    if (!window.confirm(t('files.confirmDelete', { name: entry.name }))) return;
    setBusy(true);
    setError('');
    try {
      await removeRemoteEntry(serverId, fullPath(entry.name), entry.type === 'd');
      setMenu(null);
      await load(path, serverId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onCopyPath = (entry: RemoteFileEntry) => {
    const p = fullPath(entry.name).replace(/^~/, '~');
    navigator.clipboard?.writeText(p).catch(() => {});
    setMenu(null);
  };

  const onMkdir = async () => {
    const name = window.prompt(t('files.newFolderPrompt'));
    if (!name || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await mkRemoteDir(serverId, joinPath(path, name.trim()));
      setMenu(null);
      await load(path, serverId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onContext = (ev: React.MouseEvent, entry: RemoteFileEntry | null) => {
    ev.preventDefault();
    setMenu({ x: ev.clientX, y: ev.clientY, entry });
  };

  return (
    <GlassCard className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-4">
        <h3 className="mr-auto text-[15px] font-semibold text-white">{t('files.remoteDir')}</h3>

        <select
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white ring-1 ring-white/10 focus:outline-none [&>option]:text-ink-900"
          aria-label={t('files.pickServer')}
        >
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button onClick={onMkdir} className="glass-btn !p-2" disabled={busy || !serverId} title={t('files.newFolder')}>
          <FolderPlus className="h-4 w-4" />
        </button>
        <button onClick={() => load(path)} className="glass-btn !p-2" title={t('common.refresh')}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <button onClick={goUp} className="glass-btn !p-2" title={t('files.back')}>
          <FolderUp className="h-4 w-4" />
        </button>
      </div>

      {/* Path bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <FolderUp className="h-4 w-4 text-white/40" />
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(path)}
          placeholder="~"
          className="w-full bg-transparent font-mono text-xs text-white/80 placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {/* File list */}
      <div
        className="max-h-[420px] overflow-y-auto p-2"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) onContext(e, null);
        }}
      >
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div className="py-8 text-center text-sm text-white/40">
            {t('files.empty')}
          </div>
        )}

        {!loading &&
          entries.map((e) =>
            renaming === e.name ? (
              <div key={e.name} className="flex items-center gap-2 rounded-lg px-3 py-1.5">
                <input
                  autoFocus
                  defaultValue={e.name}
                  onFocus={(ev) => ev.currentTarget.select()}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') onRename(e, ev.currentTarget.value.trim());
                    if (ev.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={(ev) => {
                    if (renaming) onRename(e, ev.currentTarget.value.trim());
                  }}
                  className="w-full rounded bg-white/5 px-2 py-1 font-mono text-sm text-white ring-1 ring-violet-400/50 focus:outline-none"
                />
              </div>
            ) : (
              <div
                key={e.name}
                onClick={() => enterDir(e)}
                onContextMenu={(ev) => onContext(ev, e)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5',
                  e.type === 'd' ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {e.type === 'd' ? (
                  <Folder className="h-4 w-4 shrink-0 text-aurora-blue" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-white/40" />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-white/85">
                  {e.name}
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-xs text-white/40 tabular-nums">
                  {e.type === 'd' ? '—' : formatBytes(e.size)}
                </span>
                <span className="hidden w-28 shrink-0 text-right font-mono text-xs text-white/30 sm:block">
                  {e.mtime ? new Date(e.mtime).toLocaleString() : ''}
                </span>
              </div>
            )
          )}
      </div>

      {/* Upload */}
      <div className="border-t border-white/10 p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || !serverId}
          title={t('files.uploadTitle')}
          className="glass-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {t('files.upload')}
        </button>
      </div>

      {error && <div className="px-4 pb-3 text-xs text-rose-300">{error}</div>}

      {/* Context menu */}
      {menu && (
        <div
          className="glass glass-strong fixed z-50 w-44 overflow-hidden rounded-xl p-1 text-sm"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menu.entry ? (
            <>
              {menu.entry.type === 'd' && (
                <MenuItem icon={Folder} label={t('files.menu.open')} onClick={() => menu.entry && enterDir(menu.entry)} />
              )}
              <MenuItem
                icon={Download}
                label={t('files.menu.download')}
                disabled={menu.entry.type === 'd'}
                onClick={() => menu.entry && onDownload(menu.entry)}
              />
              <MenuItem
                icon={ClipboardCopy}
                label={t('files.menu.copyPath')}
                onClick={() => menu.entry && onCopyPath(menu.entry)}
              />
              <div className="my-1 h-px bg-white/10" />
              <MenuItem
                icon={Pencil}
                label={t('files.menu.rename')}
                onClick={() => {
                  setMenu(null);
                  setRenaming(menu.entry!.name);
                }}
              />
              <MenuItem icon={Trash2} label={t('files.menu.delete')} danger onClick={() => menu.entry && onDelete(menu.entry)} />
            </>
          ) : (
            <MenuItem icon={FolderPlus} label={t('files.newFolder')} onClick={onMkdir} />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left disabled:opacity-35',
        danger ? 'text-rose-300 hover:bg-rose-400/10' : 'text-white/85 hover:bg-white/10'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}