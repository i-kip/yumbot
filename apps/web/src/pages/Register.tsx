import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export const Register: FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { setTokens } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    if (password.length < 8) { setError('Пароль минимум 8 символов'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/email/register', {
        email: email.toLowerCase(), password,
        referralCode: params.get('ref') ?? undefined,
      });
      setTokens(data.access_token, data.refresh_token);
      nav('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Ошибка регистрации';
      setError(msg === 'Email already registered' ? 'Email уже зарегистрирован' : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue flex items-center justify-center mx-auto mb-4">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 2c3.86 0 7 3.14 7 7a6.96 6.96 0 01-1.24 3.99L8.01 6.24A6.96 6.96 0 0112 5zm0 14c-3.86 0-7-3.14-7-7a6.96 6.96 0 011.24-3.99l9.75 9.75A6.96 6.96 0 0112 19z" fill="white" />
            </svg>
          </div>
          <h1 className="text-text-primary font-bold text-2xl">yumoff.</h1>
          <p className="text-text-secondary text-sm mt-1">Регистрация</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-bg-card border border-bg-border rounded-btn px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Пароль</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              className="w-full bg-bg-card border border-bg-border rounded-btn px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Повторите пароль</label>
            <input type="password" required value={password2} onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-card border border-bg-border rounded-btn px-4 py-3 text-text-primary text-sm outline-none focus:border-accent-blue transition-colors" />
          </div>

          {error && (
            <div className="bg-status-inactive-bg border border-status-inactive/20 rounded-btn px-3 py-2 text-status-inactive text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-accent-blue hover:bg-accent-blue-light text-white font-semibold rounded-btn py-3 transition-colors disabled:opacity-50">
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-accent-blue-light font-medium">Войти</Link>
        </p>
      </div>
    </div>
  );
};
