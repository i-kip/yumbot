import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export const Login: FC = () => {
  const nav = useNavigate();
  const { setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/email/login', { email: email.toLowerCase(), password });
      setTokens(data.access_token, data.refresh_token);
      nav('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Ошибка входа');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue flex items-center justify-center mx-auto mb-4">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 2c3.86 0 7 3.14 7 7a6.96 6.96 0 01-1.24 3.99L8.01 6.24A6.96 6.96 0 0112 5zm0 14c-3.86 0-7-3.14-7-7a6.96 6.96 0 011.24-3.99l9.75 9.75A6.96 6.96 0 0112 19z" fill="white" />
            </svg>
          </div>
          <h1 className="text-text-primary font-bold text-2xl">yumoff.</h1>
          <p className="text-text-secondary text-sm mt-1">Личный кабинет</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-bg-card border border-bg-border rounded-btn px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Пароль</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-card border border-bg-border rounded-btn px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors"
            />
          </div>

          {error && (
            <div className="bg-status-inactive-bg border border-status-inactive/20 rounded-btn px-3 py-2 text-status-inactive text-sm">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-accent-blue hover:bg-accent-blue-light text-white font-semibold rounded-btn py-3 transition-colors disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-4">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-accent-blue-light font-medium">Зарегистрироваться</Link>
        </p>

        <div className="mt-6 border-t border-bg-border pt-5 text-center">
          <p className="text-text-muted text-xs mb-3">Или войдите через Telegram</p>
          <a
            href={`https://t.me/yumoff_bot?start=web_login`}
            className="inline-flex items-center gap-2 bg-[#229ED9] text-white text-sm font-medium px-5 py-2.5 rounded-btn hover:bg-[#1a85b8] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.93 13.57l-2.98-.924c-.647-.203-.66-.647.136-.956l11.57-4.46c.537-.194 1.006.131.837.99z" />
            </svg>
            Войти через Telegram
          </a>
        </div>
      </div>
    </div>
  );
};
