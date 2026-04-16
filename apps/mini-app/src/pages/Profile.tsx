import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { User, Subscription, Transaction, Plan } from '../types';
import {
  getMe, getSubscription, getTransactions,
  getPlans, getBalance, createStarsTopup, purchaseSubscription, activateTrial,
} from '../api/endpoints';
import {
  Card, LogoHeader, StatusBadge, Button,
  Field, Divider, Spinner, SectionTitle, ProgressBar,
} from '../components/ui';
// Window.Telegram types are declared in src/telegram.d.ts

const statusLabel: Record<string, string> = {
  ACTIVE: 'АКТИВНА', EXPIRED: 'ИСТЕКЛА', DISABLED: 'НЕАКТИВНА',
  LIMITED: 'ЛИМИТ', PENDING: 'ОЖИДАНИЕ', TRIAL: 'ПРОБНАЯ',
};
const statusVariant: Record<string, 'active' | 'inactive' | 'warning' | 'pending'> = {
  ACTIVE: 'active', EXPIRED: 'inactive', DISABLED: 'inactive',
  LIMITED: 'warning', PENDING: 'pending', TRIAL: 'warning',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtKopeks(k: number) { return (k / 100).toFixed(2) + ' ₽'; }

export const Profile: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [topupAmount, setTopupAmount] = useState(299);
  const [buyingPlan, setBuyingPlan] = useState<number | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getMe(), getSubscription(), getTransactions(1, 5), getBalance()])
      .then(([uRes, sRes, tRes, bRes]) => {
        setUser(uRes.data);
        setSub(sRes.data.subscription);
        setTxs(tRes.data.transactions);
        setBalance(bRes.data.balanceKopeks);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTopup = async () => {
    setTopupLoading(true);
    try {
      const { data } = await createStarsTopup(topupAmount * 100);
      const tgInvoiceUrl = `https://t.me/yumoff_bot?start=invoice_${data.payload}`;
      window.Telegram?.WebApp.openInvoice(tgInvoiceUrl, (status) => {
        if (status === 'paid') {
          setBalance((b) => b + data.amountKopeks);
          setMsg({ type: 'ok', text: `Баланс пополнен на ${topupAmount} ₽` });
          setShowTopup(false);
        }
      });
    } catch {
      setMsg({ type: 'err', text: 'Ошибка при создании платежа' });
    } finally {
      setTopupLoading(false);
    }
  };

  const handleTrial = async () => {
    setTrialLoading(true);
    try {
      await activateTrial();
      const [sRes] = await Promise.all([getSubscription()]);
      setSub(sRes.data.subscription);
      setMsg({ type: 'ok', text: '🎉 Пробная подписка на 3 дня активирована!' });
    } catch (e: any) {
      const code = e?.response?.status;
      setMsg({ type: 'err', text: code === 409 ? 'Пробный период уже использован' : 'Ошибка активации' });
    } finally {
      setTrialLoading(false);
    }
  };

  const handleBuyPlan = async (planId: number) => {
    setBuyingPlan(planId);
    try {
      await purchaseSubscription(planId);
      const [sRes, bRes] = await Promise.all([getSubscription(), getBalance()]);
      setSub(sRes.data.subscription);
      setBalance(bRes.data.balanceKopeks);
      setMsg({ type: 'ok', text: 'Подписка активирована!' });
      setShowPlans(false);
    } catch (e: any) {
      const code = e?.response?.status;
      setMsg({ type: 'err', text: code === 402 ? 'Недостаточно баланса' : 'Ошибка покупки' });
    } finally {
      setBuyingPlan(null);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen"><Spinner /></div>;

  const txTypeLabel: Record<string, string> = {
    DEPOSIT: 'Пополнение', SUBSCRIPTION_PAYMENT: 'Подписка',
    DEVICE_PURCHASE: 'Устройство', TRAFFIC_PURCHASE: 'Трафик',
    REFERRAL_BONUS: 'Реферал', REFUND: 'Возврат', ADMIN_ADJUSTMENT: 'Корректировка',
  };

  return (
    <div className="space-y-3 pb-24">
      <LogoHeader />

      {/* User card */}
      <Card className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
          {user?.photoUrl
            ? <img src={user.photoUrl} className="w-full h-full object-cover" alt="" />
            : <span className="text-2xl font-bold text-accent-blue-light">
                {(user?.firstName ?? 'U')[0].toUpperCase()}
              </span>}
        </div>
        <div className="min-w-0">
          <p className="text-text-primary font-bold text-base truncate">
            {user?.firstName ?? ''} {user?.lastName ?? ''}
          </p>
          {user?.username && (
            <p className="text-text-secondary text-sm">@{user.username}</p>
          )}
          <p className="text-text-muted text-xs mt-0.5">
            ID: {user?.telegramId ?? user?.id}
          </p>
        </div>
      </Card>

      {/* Balance + topup */}
      <Card>
        <SectionTitle>Баланс</SectionTitle>
        <div className="bg-bg-elevated rounded-btn px-4 py-3 text-text-primary font-bold text-lg mb-3">
          {fmtKopeks(balance)}
        </div>
        <Button variant="primary" size="lg" onClick={() => setShowTopup(true)}>
          Пополнить
        </Button>
      </Card>

      {/* Subscription status */}
      <Card className={`${!sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') ? 'border border-status-inactive/20' : 'border border-status-active/20'}`}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Статус подписки</SectionTitle>
          <StatusBadge
            variant={statusVariant[sub?.status ?? 'DISABLED'] ?? 'inactive'}
            label={statusLabel[sub?.status ?? 'DISABLED'] ?? 'НЕАКТИВНА'}
          />
        </div>

        {(sub?.status === 'ACTIVE' || sub?.status === 'TRIAL') && (
          <div className="space-y-2 mb-3">
            {sub.isTrial && (
              <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-btn px-3 py-2 text-xs text-accent-blue-light font-medium">
                🎁 Пробный период — после окончания выберите тариф
              </div>
            )}
            {sub.planName && !sub.isTrial && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Тариф</span>
                <span className="text-text-primary font-medium">{sub.planName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Истекает</span>
              <span className="text-text-primary font-medium">{fmtDate(sub.endDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Осталось дней</span>
              <span className="text-status-active font-bold">{sub.daysLeft}</span>
            </div>
          </div>
        )}

        {/* Trial CTA — show only if no subscription and trial not used */}
        {!sub && !user?.trialActivated && (
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              loading={trialLoading}
              onClick={handleTrial}
            >
              🎁 Подключить бесплатно (3 дня)
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={async () => {
                const { data } = await getPlans();
                setPlans(data.plans);
                setShowPlans(true);
              }}
            >
              Выбрать тариф
            </Button>
          </div>
        )}

        {/* No trial left — show plans button */}
        {!sub && user?.trialActivated && (
          <Button
            variant="primary"
            size="lg"
            onClick={async () => {
              const { data } = await getPlans();
              setPlans(data.plans);
              setShowPlans(true);
            }}
          >
            Подключить
          </Button>
        )}

        {/* Has subscription — show renew */}
        {sub && (
          <Button
            variant={sub.status === 'ACTIVE' ? 'secondary' : 'primary'}
            size="lg"
            onClick={async () => {
              const { data } = await getPlans();
              setPlans(data.plans);
              setShowPlans(true);
            }}
          >
            {sub.status === 'ACTIVE' && !sub.isTrial ? 'Продлить' : 'Выбрать тариф'}
          </Button>
        )}
      </Card>

      {/* Payment history */}
      {txs.length > 0 && (
        <Card>
          <SectionTitle badge={String(txs.length)}>История платежей</SectionTitle>
          <div className="space-y-2">
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-medium">
                    {tx.description ?? txTypeLabel[tx.type] ?? tx.type}
                  </p>
                  <p className="text-text-muted text-xs">{fmtDate(tx.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-semibold text-sm ${tx.amountKopeks > 0 ? 'text-status-active' : 'text-text-secondary'}`}>
                    {tx.amountKopeks > 0 ? '+' : ''}{fmtKopeks(tx.amountKopeks)}
                  </span>
                  {tx.status === 'COMPLETED'
                    ? <span className="w-5 h-5 rounded-full bg-status-active-bg flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    : <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-text-muted" />
                      </span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Support */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Поддержка</SectionTitle>
          <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">24/7</span>
        </div>
        <p className="text-text-secondary text-sm mb-3">
          Если нужна помощь с подключением, оплатой или устройствами — напишите нам.
        </p>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => window.Telegram?.WebApp.openTelegramLink('https://t.me/yumoff_support')}
        >
          Открыть поддержку
        </Button>
      </Card>

      {/* Topup modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShowTopup(false)}>
          <div className="bg-bg-card w-full rounded-t-3xl p-5 pb-10 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-bg-border rounded-full mx-auto mb-2" />
            <h3 className="text-text-primary font-bold text-lg">Пополнить баланс</h3>
            <p className="text-text-secondary text-sm">Оплата через Telegram Stars</p>
            <div className="grid grid-cols-3 gap-2">
              {[99, 199, 299, 499, 990, 1990].map((v) => (
                <button
                  key={v}
                  onClick={() => setTopupAmount(v)}
                  className={`py-2.5 rounded-btn text-sm font-semibold transition-colors border ${
                    topupAmount === v
                      ? 'bg-accent-blue border-accent-blue text-white'
                      : 'bg-bg-elevated border-bg-border text-text-primary'
                  }`}
                >
                  {v} ₽
                </button>
              ))}
            </div>
            <p className="text-text-muted text-xs text-center">
              ≈ {Math.ceil(topupAmount * 100 / 200)} ⭐ Stars
            </p>
            <Button variant="primary" size="lg" loading={topupLoading} onClick={handleTopup}>
              Пополнить {topupAmount} ₽
            </Button>
          </div>
        </div>
      )}

      {/* Plans modal */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShowPlans(false)}>
          <div className="bg-bg-card w-full rounded-t-3xl p-5 pb-10 space-y-3 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-bg-border rounded-full mx-auto mb-2" />
            <h3 className="text-text-primary font-bold text-lg">Выбрать тариф</h3>
            <p className="text-text-secondary text-xs">Баланс: <b className="text-text-primary">{fmtKopeks(balance)}</b></p>
            {plans.map((plan) => (
              <div key={plan.id} className="bg-bg-elevated rounded-card p-4 border border-bg-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-primary font-bold">{plan.name}</span>
                  <span className="text-accent-blue-light font-bold">{fmtKopeks(plan.priceKopeks)}</span>
                </div>
                <p className="text-text-secondary text-xs mb-3">{plan.description}</p>
                <Button
                  variant="primary"
                  size="lg"
                  loading={buyingPlan === plan.id}
                  disabled={balance < plan.priceKopeks}
                  onClick={() => handleBuyPlan(plan.id)}
                >
                  {balance < plan.priceKopeks ? 'Недостаточно средств' : 'Купить'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification */}
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
