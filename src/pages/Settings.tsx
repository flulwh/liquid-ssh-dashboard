import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  DoorOpen,
  Info,
  MessageSquare,
  Palette,
  Save,
  ServerCog,
  TextCursorInput,
  User,
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { useAuthStore } from '../store/useAuthStore';
import { getApiBase, getUsername, setApiBase } from '../api/client';
import { usePrefsStore, type FontOption } from '../store/usePrefsStore';
import { useT } from '../i18n/useT';
import { cn } from '../utils/cn';
import { useNavigate } from 'react-router-dom';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300',
        on ? 'bg-[var(--md-primary)]' : 'bg-white/10'
      )}
      role="switch"
      aria-checked={on}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'left-6' : 'left-1')}
      />
    </button>
  );
}

const REFRESH_OPTIONS = [3, 5, 10, 30];
const FONT_OPTIONS: FontOption[] = ['JetBrains Mono', 'Monaco', 'Menlo'];
const FONT_SIZES = [12, 13, 14, 15, 16, 18];

export default function Settings() {
  const { t } = useT();
  const username = getUsername() || t('settings.usernameFallback');
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [apiBase, setApiBaseInput] = useState(getApiBase());
  const [saved, setSaved] = useState(false);

  const prefs = usePrefsStore();

  const saveApiBase = () => {
    setApiBase(apiBase);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-white/45">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 账号 */}
        <GlassCard className="p-6">
          <SectionTitle icon={User} title={t('settings.account')} />
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--md-primary-container)] text-2xl font-semibold text-[var(--md-on-primary-container)]">
              {username.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{username}</div>
              <div className="text-sm text-white/45">{t('settings.backendJwt')}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('settings.jwtVerified')}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 偏好设置（真实生效 + 持久化） */}
        <GlassCard className="p-6">
          <SectionTitle icon={Palette} title={t('settings.prefs')} />
          <p className="mt-1 text-xs text-white/45">{t('settings.prefsDesc')}</p>
          <div className="mt-2 divide-y divide-white/5">
            <SettingRow title={t('settings.alertNotify')} desc={t('settings.alertDesc')}>
              <Toggle on={prefs.notifications} onChange={prefs.setNotifications} />
            </SettingRow>
            <SettingRow
              title={t('settings.autoRefresh')}
              desc={t('settings.autoRefreshDesc')}
            >
              <Segmented value={prefs.autoRefreshSec} onChange={prefs.setAutoRefreshSec} options={REFRESH_OPTIONS} />
            </SettingRow>
            <SettingRow title={t('settings.advancedMotion')} desc={t('settings.advancedMotionDesc')} last>
              <Toggle on={prefs.motion} onChange={prefs.setMotion} />
            </SettingRow>
          </div>
        </GlassCard>

        {/* 终端 */}
        <GlassCard className="p-6">
          <SectionTitle icon={TextCursorInput} title={t('settings.terminal')} />
          <p className="mt-1 text-xs text-white/45">{t('settings.terminalDesc')}</p>
          <div className="mt-2 divide-y divide-white/5">
            <SettingRow title={t('settings.terminalFont')} desc={t('settings.terminalFontDesc')}>
              <Segmented value={prefs.terminalFont} onChange={prefs.setTerminalFont} options={FONT_OPTIONS} />
            </SettingRow>
            <SettingRow title={t('settings.terminalSize')} desc={t('settings.terminalSizeCurrent', { n: prefs.terminalFontSize })} last>
              <Segmented value={prefs.terminalFontSize} onChange={prefs.setTerminalFontSize} options={FONT_SIZES} />
            </SettingRow>
          </div>
        </GlassCard>

        {/* 关于 */}
        <GlassCard className="flex flex-col justify-between p-6">
          <div>
            <SectionTitle icon={Info} title={t('settings.aboutCard')} />
            <div className="mt-4 space-y-2 text-sm text-white/60">
              <p className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--md-primary)]" /> {t('settings.projectVersion')}
              </p>
              <p className="text-xs leading-relaxed text-white/40">
                {t('settings.aboutDesc')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/35">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> {t('settings.allOk')}
          </div>
        </GlassCard>

        {/* 后端连接 */}
        <GlassCard className="flex flex-col justify-between p-6 lg:col-span-2">
          <div>
            <SectionTitle icon={ServerCog} title={t('settings.backend')} />
            <p className="mt-2 text-xs text-white/45">
              {t('settings.backendDesc')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                value={apiBase}
                onChange={(e) => setApiBaseInput(e.target.value)}
                placeholder={t('settings.apiPlaceholder')}
                className="w-full max-w-md rounded-xl bg-white/[0.05] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-white/25"
              />
              <button onClick={saveApiBase} className="glass-btn !bg-white/10 font-semibold text-white">
                <Save className="h-4 w-4" />
                {saved ? t('settings.saveSuccess') : t('settings.saveAddress')}
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4">
            <button onClick={onLogout} className="glass-btn text-rose-300">
              <DoorOpen className="h-4 w-4" /> {t('settings.logoutFull')}
            </button>
            <p className="mt-2 text-xs text-white/35">
              {t('settings.logoutDesc')}
            </p>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--md-primary-container)] ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-[var(--md-on-primary-container)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  children,
  last,
}: {
  title: string;
  desc: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 py-3.5', last && 'pb-0')}>
      <div>
        <div className="text-sm font-medium text-white/90">{title}</div>
        <div className="mt-0.5 text-xs text-white/45">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-1">
      {options.map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs tabular-nums transition-colors',
            value === opt ? 'bg-[var(--md-primary)] font-medium text-white' : 'text-white/50 hover:text-white'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
