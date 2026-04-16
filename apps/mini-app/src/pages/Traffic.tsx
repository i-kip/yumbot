import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { Subscription } from '../types';
import { getSubscription, refreshTraffic, getConnectionLink } from '../api/endpoints';
import { Card, LogoHeader, SectionTitle, ProgressBar, Button, Spinner } from '../components/ui';

export const Traffic: FC = () => {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [connUrl, setConnUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    const [sRes, cRes] = await Promise.all([getSubscription(), getConnectionLink()]);
    setSub(sRes.data.subscription);
    setConnUrl(cRes.data.url);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await refreshTraffic();
      await load();
      setMsg({ type: 'ok', text: 'Трафик обновлён' });
    } catch {
      setMsg({ type: 'err', text: 'Ошибка обновления' });
    } finally {
      setSyncing(false);
    }
  };

  const copyUrl = async () => {
    if (!connUrl) return;
    try {
      await navigator.clipboard.writeText(connUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = connUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading)
    return <div className="flex-1 flex items-center justify-center min-h-screen"><Spinner /></div>;

  const limitGb = sub?.trafficLimitGb ?? 0;
  const usedGb = sub?.trafficUsedGb ?? 0;
  const pct = sub?.trafficUsedPercent ?? 0;
  const leftGb = Math.max(0, limitGb - usedGb);

  return (
    <div className="space-y-3 pb-24">
      <LogoHeader />

      {/* Traffic stats */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Трафик</SectionTitle>
          <span className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-full font-semibold">
            {limitGb} GB
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-text-secondary">Лимит</span>
              <span className="text-text-primary font-medium">{limitGb.toFixed(2)} GB</span>
            </div>
            <div className="bg-bg-elevated rounded-btn px-3 py-2 text-text-primary font-mono text-sm">
              {limitGb.toFixed(2)} GB
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-text-secondary">Использовано</span>
              <span className="text-text-primary font-medium">{usedGb.toFixed(2)} GB</span>
            </div>
            <div className="bg-bg-elevated rounded-btn px-3 py-2 text-text-primary font-mono text-sm">
              {usedGb.toFixed(2)} GB
            </div>
          </div>

          <ProgressBar percent={pct} />

          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{pct.toFixed(1)}% использовано</span>
            <span>Осталось: {leftGb.toFixed(2)} GB</span>
          </div>
        </div>

        <div className="mt-4">
          <Button variant="secondary" size="lg" loading={syncing} onClick={handleSync}>
            🔄 Обновить трафик
          </Button>
        </div>
      </Card>

      {/* Connection link */}
      {connUrl && (
        <Card>
          <SectionTitle>Ссылка подключения</SectionTitle>
          <p className="text-text-secondary text-sm mb-3">
            Используйте эту ссылку для подключения в приложении VPN.
          </p>
          <div className="bg-bg-elevated rounded-btn px-3 py-2.5 text-text-muted text-xs font-mono break-all mb-3">
            {connUrl}
          </div>
          <Button variant={copied ? 'secondary' : 'primary'} size="lg" onClick={copyUrl}>
            {copied ? '✓ Скопировано!' : 'Копировать ссылку'}
          </Button>
        </Card>
      )}

      {/* Auto-refill */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Автодокупка трафика</SectionTitle>
          <span className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-full">НЕТ</span>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed">
          Сохранённый способ оплаты появится после оплаты картой или через СБП.
        </p>
        <p className="text-text-secondary text-sm leading-relaxed mt-2">
          После этого можно будет выбрать порог остатка и пакет для автоматической покупки.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">Порог остатка трафика</span>
              <span className="font-semibold text-text-primary bg-bg-elevated px-2 py-0.5 rounded">
                10 GB
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              defaultValue={10}
              className="w-full accent-accent-blue"
              disabled
            />
          </div>
        </div>

        <div className="mt-3 bg-bg-elevated rounded-card p-3 text-center">
          <p className="text-text-muted text-xs">
            Функция будет доступна после оплаты через карту или СБП (YooMoney — скоро)
          </p>
        </div>
      </Card>

      {/* No subscription fallback */}
      {!sub && (
        <Card className="text-center py-6">
          <p className="text-4xl mb-2">📡</p>
          <p className="text-text-primary font-semibold mb-1">Нет активной подписки</p>
          <p className="text-text-secondary text-sm">Перейдите на вкладку «Профиль» для покупки</p>
        </Card>
      )}

      {msg && (
        <div
          className={`fixed bottom-24 left-4 right-4 z-50 rounded-card p-3 text-sm font-medium text-center shadow-lg
            ${msg.type === 'ok' ? 'bg-status-active-bg text-status-active border border-status-active/20' : 'bg-status-inactive-bg text-status-inactive border border-status-inactive/20'}`}
          onClick={() => setMsg(null)}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
};
