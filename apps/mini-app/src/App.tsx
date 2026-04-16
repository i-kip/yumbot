import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useAuthStore } from './store/auth';
import { authTelegram } from './api/endpoints';
import { BottomNav } from './components/BottomNav';
import { Profile } from './pages/Profile';
import { Referral } from './pages/Referral';
import { Devices } from './pages/Devices';
import { Traffic } from './pages/Traffic';
import { Spinner } from './components/ui';

type Tab = 'profile' | 'referral' | 'devices' | 'traffic';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initData: string;
        themeParams: Record<string, string>;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export const App: FC = () => {
  const [tab, setTab] = useState<Tab>('profile');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const { isAuthenticated, setTokens } = useAuthStore();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#080e1a');
      tg.setBackgroundColor('#080e1a');
    }

    const initData = tg?.initData;

    if (!initData) {
      // Dev mode: try with stored token
      if (isAuthenticated) {
        setAuthLoading(false);
        return;
      }
      setAuthError('Открой приложение через Telegram');
      setAuthLoading(false);
      return;
    }

    if (isAuthenticated) {
      setAuthLoading(false);
      return;
    }

    authTelegram(initData)
      .then(({ data }) => {
        setTokens(data.access_token, data.refresh_token);
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthError('Ошибка авторизации. Попробуй перезапустить.');
        setAuthLoading(false);
      });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue flex items-center justify-center mx-auto">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 2c3.86 0 7 3.14 7 7a6.96 6.96 0 01-1.24 3.99L8.01 6.24A6.96 6.96 0 0112 5zm0 14c-3.86 0-7-3.14-7-7a6.96 6.96 0 011.24-3.99l9.75 9.75A6.96 6.96 0 0112 19z" fill="white" />
            </svg>
          </div>
          <Spinner />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-5">
        <div className="text-center space-y-3">
          <p className="text-4xl">⚠️</p>
          <p className="text-text-primary font-semibold">{authError}</p>
          <button
            className="text-accent-blue-light text-sm underline"
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <main className="max-w-lg mx-auto px-3 pt-3">
        {tab === 'profile' && <Profile />}
        {tab === 'referral' && <Referral />}
        {tab === 'devices' && <Devices />}
        {tab === 'traffic' && <Traffic />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
};
