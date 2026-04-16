import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

type Tab = 'profile' | 'referral' | 'devices' | 'traffic';

// Re-use the same logic as mini-app but adapted for web layout
// Importing pages from mini-app would be ideal in a real monorepo,
// but here we render a unified dashboard for simplicity

export const Dashboard: FC = () => {
  const nav = useNavigate();
  const { logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [referral, setReferral] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkTgMode, setLinkTgMode] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [msg, setMsg] = useState('');

  const notify = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  useEffect(() => {
    Promise.all([
      api.get('/user/me'),
      api.get('/subscription'),
      api.get('/balance/transactions?limit=5'),
      api.get('/referral'),
      api.get('/subscription/devices'),
    ]).then(([u, s, t, r, d]) => {
      setUser(u.data); setSub(s.data.subscription);
      setTxs(t.data.transactions); setReferral(r.data);
      setDevices(d.data.devices);
    }).catch(() => { logout(); nav('/login'); })
      .finally(() => setLoading(false));
  }, []);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    notify('Скопировано!');
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: 'АКТИВНА', EXPIRED: 'ИСТЕКЛА', DISABLED: 'НЕАКТИВНА',
    LIMITED: 'ЛИМИТ', PENDING: 'ОЖИДАНИЕ', TRIAL: 'ПРОБНАЯ',
  };
  const fmtKopeks = (k: number) => (k / 100).toFixed(2) + ' ₽';
  const fmtDate = (s: string) => s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'profile' as Tab, label: '👤 Профиль' },
    { id: 'referral' as Tab, label: '👥 Рефералка' },
    { id: 'devices' as Tab, label: '📱 Устройства' },
    { id: 'traffic' as Tab, label: '📡 Трафик' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Top bar */}
      <header className="bg-bg-card border-b border-bg-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            <span className="text-text-primary font-bold">yumoff.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm hidden sm:block">{user?.email ?? user?.username ?? 'Пользователь'}</span>
            <button onClick={() => { logout(); nav('/login'); }}
              className="text-text-muted hover:text-text-primary text-sm transition-colors">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-bg-card rounded-card p-1 mb-5 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-btn text-sm font-medium whitespace-nowrap transition-colors
                ${tab === t.id ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-card p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex items-center justify-center text-2xl font-bold text-accent-blue-light flex-shrink-0">
                {(user?.firstName ?? user?.email ?? 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-text-primary font-bold text-lg">{user?.firstName ?? ''} {user?.lastName ?? ''}</p>
                {user?.email && <p className="text-text-secondary text-sm">{user.email}</p>}
                {user?.username && <p className="text-text-secondary text-sm">@{user.username}</p>}
                <p className="text-text-muted text-xs mt-1">ID: {user?.telegramId ?? user?.id}</p>
              </div>
            </div>

            {/* Link Telegram */}
            {!user?.telegramId && (
              <div className="bg-bg-card rounded-card p-4 border border-accent-blue/20">
                <p className="text-text-primary font-semibold mb-1">Привязать Telegram</p>
                <p className="text-text-secondary text-sm mb-3">
                  Привяжите Telegram-аккаунт для единой подписки с ботом
                </p>
                {!linkTgMode ? (
                  <button onClick={() => setLinkTgMode(true)}
                    className="bg-[#229ED9] text-white text-sm font-medium px-4 py-2.5 rounded-btn w-full hover:bg-[#1a85b8] transition-colors">
                    🔗 Привязать Telegram
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-text-muted text-xs">
                      1. Перейдите в бота @yumoff_bot и нажмите /start<br />
                      2. В боте выберите «Привязать аккаунт» и скопируйте код<br />
                      3. Вставьте код ниже
                    </p>
                    <input value={linkCode} onChange={(e) => setLinkCode(e.target.value)}
                      placeholder="Код из бота"
                      className="w-full bg-bg-elevated border border-bg-border rounded-btn px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue" />
                    <button className="w-full bg-accent-blue text-white text-sm font-medium px-4 py-2.5 rounded-btn" onClick={() => notify('Функция в разработке')}>
                      Привязать
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Subscription */}
            <div className={`bg-bg-card rounded-card p-4 border ${sub?.status === 'ACTIVE' ? 'border-status-active/20' : 'border-status-inactive/20'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-text-primary font-bold">Статус подписки</p>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-badge ${sub?.status === 'ACTIVE' ? 'bg-status-active-bg text-status-active' : 'bg-status-inactive-bg text-status-inactive'}`}>
                  {statusLabel[sub?.status ?? 'DISABLED'] ?? 'НЕАКТИВНА'}
                </span>
              </div>
              {sub?.status === 'ACTIVE' && (
                <div className="space-y-1.5 text-sm mb-3">
                  {sub.planName && <div className="flex justify-between"><span className="text-text-secondary">Тариф</span><span className="text-text-primary">{sub.planName}</span></div>}
                  <div className="flex justify-between"><span className="text-text-secondary">Истекает</span><span className="text-text-primary">{fmtDate(sub.endDate)}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Осталось</span><span className="text-status-active font-bold">{sub.daysLeft} дней</span></div>
                </div>
              )}
              <a href="https://t.me/yumoff_bot" target="_blank" rel="noreferrer"
                className="block text-center bg-accent-blue text-white text-sm font-semibold rounded-btn py-2.5 hover:bg-accent-blue-light transition-colors">
                {sub?.status === 'ACTIVE' ? 'Продлить в боте' : 'Подключить в боте'}
              </a>
            </div>

            {/* Transactions */}
            {txs.length > 0 && (
              <div className="bg-bg-card rounded-card p-4">
                <p className="text-text-primary font-bold mb-3">История платежей</p>
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="text-text-primary">{tx.description ?? tx.type}</p>
                        <p className="text-text-muted text-xs">{fmtDate(tx.createdAt)}</p>
                      </div>
                      <span className={`font-semibold ${tx.amountKopeks > 0 ? 'text-status-active' : 'text-text-secondary'}`}>
                        {tx.amountKopeks > 0 ? '+' : ''}{fmtKopeks(tx.amountKopeks)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Referral tab */}
        {tab === 'referral' && referral && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-card p-4">
              <p className="text-text-primary font-bold mb-1">Реферальная программа</p>
              <p className="text-text-secondary text-sm mb-4">
                Получайте <b className="text-text-primary">{referral.rewardPercent}%</b> со всех покупок рефералов
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-bg-elevated rounded-btn p-3 text-center">
                  <p className="text-text-primary font-bold text-xl">{referral.referralsCount}</p>
                  <p className="text-text-secondary text-xs">Рефералов</p>
                </div>
                <div className="bg-bg-elevated rounded-btn p-3 text-center">
                  <p className="text-text-primary font-bold text-xl">{fmtKopeks(referral.totalRewardKopeks)}</p>
                  <p className="text-text-secondary text-xs">Заработано</p>
                </div>
              </div>
              {referral.referralLink && (
                <div>
                  <p className="text-text-secondary text-xs mb-1">Ваша ссылка</p>
                  <div className="bg-bg-elevated rounded-btn px-3 py-2 text-text-muted text-xs font-mono break-all mb-2">{referral.referralLink}</div>
                  <button onClick={() => copy(referral.referralLink)}
                    className="w-full bg-accent-blue text-white text-sm font-semibold rounded-btn py-2.5 hover:bg-accent-blue-light transition-colors">
                    Копировать
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Devices tab */}
        {tab === 'devices' && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-text-primary font-bold">Устройства</p>
                <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">{devices.length} / {sub?.deviceLimit ?? 5}</span>
              </div>
              {devices.length === 0 ? (
                <div className="border border-dashed border-bg-border rounded-btn p-6 text-center text-text-muted text-sm">
                  Нет активных устройств
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((d) => (
                    <div key={d.hwid} className="flex items-center justify-between bg-bg-elevated rounded-btn p-3">
                      <div>
                        <p className="text-text-primary text-sm">{d.platform ?? 'Устройство'}</p>
                        <p className="text-text-muted text-xs">{fmtDate(d.lastSeen)}</p>
                      </div>
                      <button onClick={async () => { await api.delete(`/subscription/devices/${encodeURIComponent(d.hwid)}`); setDevices((prev) => prev.filter((x) => x.hwid !== d.hwid)); notify('Устройство удалено'); }}
                        className="text-status-inactive text-xs px-2 py-1 bg-status-inactive-bg rounded">Удалить</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Traffic tab */}
        {tab === 'traffic' && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-card p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-text-primary font-bold">Трафик</p>
                <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">{sub?.trafficLimitGb ?? 0} GB</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Лимит</span><span className="text-text-primary font-medium">{(sub?.trafficLimitGb ?? 0).toFixed(2)} GB</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Использовано</span><span className="text-text-primary font-medium">{(sub?.trafficUsedGb ?? 0).toFixed(2)} GB</span></div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${Math.min(100, sub?.trafficUsedPercent ?? 0)}%` }} />
                </div>
                <p className="text-text-muted text-xs text-center">{(sub?.trafficUsedPercent ?? 0).toFixed(1)}% использовано</p>
              </div>
              <button onClick={async () => { await api.post('/subscription/refresh-traffic'); notify('Трафик обновлён'); }}
                className="mt-4 w-full bg-bg-elevated border border-bg-border text-text-primary text-sm font-medium rounded-btn py-2.5 hover:bg-bg-elevated/80 transition-colors">
                🔄 Обновить трафик
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="fixed bottom-5 left-4 right-4 max-w-sm mx-auto bg-status-active-bg border border-status-active/20 rounded-card p-3 text-status-active text-sm font-medium text-center z-50">
          {msg}
        </div>
      )}
    </div>
  );
};
