import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Code2,
  ExternalLink,
  GitFork,
  Info,
  Loader2,
  Scale,
  Star,
  CircleDot,
  FolderGit2,
  User,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { cn } from '../utils/cn';

const REPO_URL = 'https://github.com/flulwh/liquid-ssh-dashboard';
const OWNER_URL = 'https://github.com/flulwh';

interface RepoData {
  full_name: string;
  description: string;
  html_url: string;
  homepage?: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language?: string;
  license?: { spdx_id: string } | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  topics: string[];
  owner?: { avatar_url: string };
}

interface UserData {
  login: string;
  name?: string;
  bio?: string;
  location?: string;
  followers: number;
  public_repos: number;
  avatar_url: string;
}

const FALLBACK_REPO: RepoData = {
  full_name: 'flulwh/liquid-ssh-dashboard',
  description: '采用 Material Design 3 深色主题的现代 Web SSH 管理平台',
  html_url: REPO_URL,
  homepage: REPO_URL,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  language: 'TypeScript',
  license: { spdx_id: 'MIT' },
  default_branch: 'main',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  topics: ['ssh', 'web-terminal', 'react', 'typescript', 'sftp'],
};

export default function About() {
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [r, u] = await Promise.all([
          fetch('https://api.github.com/repos/flulwh/liquid-ssh-dashboard').then((x) => x.json()),
          fetch('https://api.github.com/users/flulwh').then((x) => x.json()),
        ]);
        if (!alive) return;
        // GitHub API 限流/404 时返回的是对象（message），用 fallback 兜底
        setRepo(r.full_name ? (r as RepoData) : FALLBACK_REPO);
        setUser(u.login ? (u as UserData) : null);
        setOffline(!r.full_name);
      } catch {
        if (!alive) return;
        setRepo(FALLBACK_REPO);
        setUser(null);
        setOffline(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          关<span className="text-[var(--md-primary)]">于</span>
        </h1>
        <p className="mt-1 text-sm text-white/45">
          Liquid SSH Dashboard · 开源信息与作者
        </p>
      </div>

      {loading ? (
        <GlassCard className="flex items-center justify-center gap-2 py-20 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在从 GitHub 获取信息…
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 仓库主卡 */}
          <GlassCard className="p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--md-primary-container)]">
                  <FolderGit2 className="h-6 w-6 text-[var(--md-on-primary-container)]" />
                </div>
                <div>
                  <div className="font-mono text-sm font-semibold text-white">{repo?.full_name}</div>
                  <div className="text-xs text-white/45">
                    {repo?.default_branch}, {lang(repo?.language)}
                    {repo?.license?.spdx_id ? ` · ${repo.license.spdx_id}` : ''}
                  </div>
                </div>
              </div>
              <a
                href={repo?.html_url || REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="glass-btn !bg-white/10 font-semibold text-white"
              >
                <ExternalLink className="h-4 w-4" /> GitHub
              </a>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-white/70">{repo?.description}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(repo?.topics?.length ? repo.topics : ['ssh', 'web-terminal', 'react', 'typescript', 'sftp']).map((t) => (
                <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50 ring-1 ring-white/10">
                  #{t}
                </span>
              ))}
            </div>

            {/* 统计网格 */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Star} label="Stars" value={repo?.stargazers_count ?? 0} />
              <Stat icon={GitFork} label="Forks" value={repo?.forks_count ?? 0} />
              <Stat icon={CircleDot} label="Issues" value={repo?.open_issues_count ?? 0} />
              <Stat icon={Clock} label="更新时间" date={repo?.updated_at} />
            </div>
          </GlassCard>

          {/* 作者卡 */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="h-14 w-14 rounded-2xl ring-1 ring-white/10" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--md-primary-container)]">
                  <User className="h-7 w-7 text-[var(--md-on-primary-container)]" />
                </div>
              )}
              <div>
                <div className="font-semibold text-white">{user?.name ?? 'Liquid Dev'}</div>
                <a
                  href={OWNER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-sm text-[var(--md-primary)] hover:underline"
                >
                  @{user?.login ?? 'flulwh'} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {user?.bio && <p className="mt-3 text-sm leading-relaxed text-white/60">{user.bio}</p>}

            <div className="mt-4 space-y-2 text-sm">
              <Row icon={User} label="仓库数" value={user ? String(user.public_repos) : '—'} />
              <Row icon={Star} label="关注者" value={user ? String(user.followers) : '—'} />
              <Row icon={Scale} label="开源协议" value={repo?.license?.spdx_id ?? 'MIT'} />
            </div>
          </GlassCard>
        </div>
      )}

      {offline && (
        <GlassCard className="flex items-center gap-3 p-4 text-xs text-white/45">
          <Info className="h-4 w-4 shrink-0" />
          暂无法连接 GitHub API，以下为本地兜底信息（仓库地址与作者主页为文档快照）。
        </GlassCard>
      )}
    </motion.div>
  );
}

function lang(l?: string) {
  return l ?? 'TypeScript';
}

function Stat({
  icon: Icon,
  label,
  value,
  date,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  date?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
      <div className="flex items-center gap-1.5 text-white/45">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      {date ? (
        <div className="mt-1 text-sm font-semibold tabular-nums text-white/90">
          {new Date(date).toLocaleDateString('zh-CN')}
        </div>
      ) : (
        <AnimatedNumber value={value ?? 0} className="mt-1 text-lg font-semibold tabular-nums text-white" />
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-white/45">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={cn('font-medium text-white/80')}>{value}</span>
    </div>
  );
}