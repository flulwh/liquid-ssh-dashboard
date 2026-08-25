import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LockKeyhole, ServerCog, TerminalSquare, User, UserPlus } from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';
import { getApiBase, login, register, setApiBase } from '../api/client';
import { useT } from '../i18n/useT';
import { cn } from '../utils/cn';

interface LoginScreenProps {
  onSuccess: () => void;
}

type Mode = 'login' | 'register';

/** 登录 / 创建账户页：后端地址 + 账号 + 密码，全部由用户输入，前端不内置任何默认凭据/地址 */
export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [api, setApi] = useState(getApiBase());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setConfirm('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!api || !username || !password) {
      setError(t('login.errorEmpty'));
      return;
    }
    if (mode === 'register') {
      if (password !== confirm) {
        setError(t('login.errorMismatch'));
        return;
      }
      if (password.length < 6) {
        setError(t('login.errorTooShort'));
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      setApiBase(api);
      if (mode === 'register') {
        await register(username, password);
      } else {
        await login(username, password);
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass glass-strong relative z-10 w-full max-w-md rounded-3xl p-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--md-primary-container)]">
            <TerminalSquare className="h-6 w-6 text-[var(--md-on-primary-container)]" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">
            Liquid <span className="text-gradient">SSH</span>
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {isRegister ? t('login.registerSubtitle') : t('login.subtitle')}
          </p>
        </div>

        {/* 登录 / 注册切换 */}
        <div className="mt-6 flex items-center rounded-xl bg-white/[0.06] p-1 ring-1 ring-white/10">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm transition-colors',
                mode === m ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              {m === 'login' ? t('login.tabLogin') : t('login.tabRegister')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field
            icon={ServerCog}
            value={api}
            onChange={(v) => setApi(v)}
            placeholder={t('login.backendPlaceholder')}
            type="text"
            autoComplete="off"
            label={t('login.backendLabel')}
          />
          <Field
            icon={User}
            value={username}
            onChange={(v) => setUsername(v)}
            placeholder={isRegister ? t('login.usernamePlaceholderRegister') : t('login.usernamePlaceholder')}
            type="text"
            autoComplete="username"
            label={t('login.usernameLabel')}
          />
          <Field
            icon={LockKeyhole}
            value={password}
            onChange={(v) => setPassword(v)}
            placeholder={isRegister ? t('login.passwordPlaceholderRegister') : t('login.passwordPlaceholder')}
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            label={t('login.passwordLabel')}
          />
          {isRegister && (
            <Field
              icon={LockKeyhole}
              value={confirm}
              onChange={(v) => setConfirm(v)}
              placeholder={t('login.confirmPlaceholder')}
              type="password"
              autoComplete="new-password"
              label={t('login.confirmLabel')}
            />
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="glass-btn w-full justify-center !bg-white/10 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRegister ? (
              <UserPlus className="h-4 w-4" />
            ) : null}
            {busy
              ? isRegister
                ? t('login.submittingRegister')
                : t('login.submitting')
              : isRegister
                ? t('login.submitRegister')
                : t('login.submit')}
          </button>

          <p className="text-center text-xs text-white/35">
            {isRegister ? t('login.hintRegister') : t('login.hintLogin')}
          </p>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type,
  autoComplete,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/50">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-white/25">
        <Icon className="h-4 w-4 shrink-0 text-white/40" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>
    </label>
  );
}
