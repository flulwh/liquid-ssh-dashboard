import { FolderOpen } from 'lucide-react';
import { FileManager } from '../components/FileManager';
import { GlassCard } from '../components/GlassCard';
import { useServerStore } from '../store/useServerStore';

/** 文件管理：远程 SFTP 目录浏览 + 上传 + 下载（独立页面） */
export default function Files() {
  const servers = useServerStore((s) => s.servers);

  return (
    <div className="space-y-6">
      <div className="px-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">文件</h1>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            SFTP
          </span>
        </div>
        <p className="mt-1 text-sm text-white/45">远程文件浏览 · 上传 · 下载</p>
      </div>

      {servers.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-16 text-center">
          <FolderOpen className="h-8 w-8 text-white/25" />
          <p className="text-sm text-white/45">
            尚未配置服务器，请先在服务器页面添加并保存连接凭据
          </p>
        </GlassCard>
      ) : (
        <FileManager servers={servers} />
      )}
    </div>
  );
}