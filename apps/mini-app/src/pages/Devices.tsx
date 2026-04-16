import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { Device } from '../types';
import { getDevices, getSubscription, removeDevice, purchaseDeviceSlot, getBalance } from '../api/endpoints';
import { Card, LogoHeader, Button, SectionTitle, Spinner } from '../components/ui';

function fmtDate(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const Devices: FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceLimit, setDeviceLimit] = useState(5);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [removingHwid, setRemovingHwid] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const DEVICE_PRICE_RUB = 100;
  const PER_PAGE = 5;
  const pageCount = Math.ceil(devices.length / PER_PAGE) || 1;
  const pageDevices = devices.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const load = async () => {
    const [dRes, sRes, bRes] = await Promise.all([
      getDevices(),
      getSubscription(),
      getBalance(),
    ]);
    setDevices(dRes.data.devices);
    setDeviceLimit(sRes.data.subscription?.deviceLimit ?? 5);
    setBalance(bRes.data.balanceKopeks);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRemove = async (hwid: string) => {
    setRemovingHwid(hwid);
    try {
      await removeDevice(hwid);
      setDevices((d) => d.filter((x) => x.hwid !== hwid));
      setMsg({ type: 'ok', text: 'Устройство отвязано' });
    } catch {
      setMsg({ type: 'err', text: 'Ошибка при отвязке' });
    } finally {
      setRemovingHwid(null);
    }
  };

  const handleRemoveAll = async () => {
    if (!window.confirm('Отвязать все устройства?')) return;
    for (const d of devices) {
      try { await removeDevice(d.hwid); } catch {}
    }
    setDevices([]);
    setMsg({ type: 'ok', text: 'Все устройства отвязаны' });
  };

  const handleBuySlot = async () => {
    if (balance < DEVICE_PRICE_RUB * 100) {
      setMsg({ type: 'err', text: 'Недостаточно баланса' });
      return;
    }
    setBuying(true);
    try {
      await purchaseDeviceSlot();
      await load();
      setMsg({ type: 'ok', text: '+1 слот устройства куплен' });
    } catch {
      setMsg({ type: 'err', text: 'Ошибка покупки' });
    } finally {
      setBuying(false);
    }
  };

  const platformIcon = (platform?: string) => {
    const p = (platform ?? '').toLowerCase();
    if (p.includes('windows')) return '🖥️';
    if (p.includes('mac') || p.includes('ios') || p.includes('iphone')) return '🍎';
    if (p.includes('android')) return '📱';
    if (p.includes('linux')) return '🐧';
    return '📱';
  };

  if (loading)
    return <div className="flex-1 flex items-center justify-center min-h-screen"><Spinner /></div>;

  return (
    <div className="space-y-3 pb-24">
      <LogoHeader />

      {/* Device list */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Устройства</SectionTitle>
          <span className="text-xs bg-bg-elevated text-text-secondary px-2.5 py-1 rounded-full font-semibold">
            {devices.length} / {deviceLimit}
          </span>
        </div>

        {pageDevices.length === 0 ? (
          <div className="border border-dashed border-bg-border rounded-btn px-4 py-6 text-center">
            <p className="text-text-muted text-sm">Активных устройств нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageDevices.map((d) => (
              <div key={d.hwid} className="flex items-center gap-3 bg-bg-elevated rounded-btn p-3">
                <span className="text-2xl">{platformIcon(d.platform)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary text-sm font-medium truncate">
                    {d.platform ?? 'Неизвестное устройство'}
                    {d.browser ? ` · ${d.browser}` : ''}
                  </p>
                  <p className="text-text-muted text-xs">
                    Последний вход: {fmtDate(d.lastSeen)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(d.hwid)}
                  disabled={removingHwid === d.hwid}
                  className="text-status-inactive text-xs font-medium px-2 py-1 rounded bg-status-inactive-bg disabled:opacity-50"
                >
                  {removingHwid === d.hwid ? '...' : 'Удалить'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between mt-3">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <span className="text-text-secondary text-sm">{page + 1} / {pageCount}</span>
            <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              Вперёд
            </Button>
          </div>
        )}

        {/* Remove all */}
        {devices.length > 0 && (
          <div className="mt-3">
            <Button variant="secondary" size="lg" onClick={handleRemoveAll}>
              Отвязать все устройства
            </Button>
          </div>
        )}
      </Card>

      {/* Buy extra device */}
      <Card>
        <p className="text-text-secondary text-sm mb-3">
          Можно увеличить лимит устройств на{' '}
          <span className="text-text-primary font-semibold">+1</span> за{' '}
          <span className="text-text-primary font-semibold">{DEVICE_PRICE_RUB} ₽</span>.
        </p>

        <div className="space-y-2 mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Текущий баланс</span>
            <span className="text-text-primary font-medium">{(balance / 100).toFixed(2)} ₽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Стоимость</span>
            <span className="text-text-primary font-medium">{DEVICE_PRICE_RUB} ₽</span>
          </div>
        </div>

        <div className="bg-bg-elevated rounded-card p-3 border border-bg-border mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">+1 устройство</span>
            <span className="text-text-primary font-bold">{DEVICE_PRICE_RUB} ₽</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          loading={buying}
          disabled={balance < DEVICE_PRICE_RUB * 100}
          onClick={handleBuySlot}
        >
          {balance < DEVICE_PRICE_RUB * 100 ? 'Недостаточно баланса' : 'Купить'}
        </Button>
      </Card>

      {/* Message toast */}
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
