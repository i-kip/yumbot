import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ReferralInfo } from '../types';
import { getReferral } from '../api/endpoints';
import { Card, LogoHeader, Button, Field, SectionTitle, Spinner } from '../components/ui';

export const Referral: FC = () => {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferral()
      .then((r) => setInfo(r.data))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = async () => {
    if (!info?.referralLink) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = info.referralLink;
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

  return (
    <div className="space-y-3 pb-24">
      <LogoHeader />

      {/* Referral program info */}
      <Card>
        <SectionTitle>Реферальная программа</SectionTitle>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          Получайте <span className="text-text-primary font-semibold">{info?.rewardPercent ?? 40}%</span> со
          всех покупок ваших рефералов, а они получают{' '}
          <span className="text-text-primary font-semibold">3 дня подписки</span>.
        </p>

        <div className="space-y-3">
          <Field label="Баланс" value={`${((info?.balanceKopeks ?? 0) / 100).toFixed(2)} ₽`} />
          <Field label="Рефералов" value={String(info?.referralsCount ?? 0)} />
          {info?.telegramId && (
            <Field label="Telegram ID" value={info.telegramId} />
          )}
        </div>
      </Card>

      {/* Referral link */}
      {info?.referralLink && (
        <Card>
          <SectionTitle>Ваша реферальная ссылка</SectionTitle>
          <div className="bg-bg-elevated rounded-btn px-3 py-2.5 text-text-secondary text-xs font-mono break-all mb-3">
            {info.referralLink}
          </div>
          <div className="space-y-2">
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="lg"
              onClick={copyLink}
            >
              {copied ? '✓ Скопировано!' : 'Копировать ссылку'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                if (!info?.referralLink) return;
                const text = encodeURIComponent('Попробуй YumOff VPN — быстрый и безопасный!\n' + info.referralLink);
                window.Telegram?.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${text}`);
              }}
            >
              📤 Поделиться в Telegram
            </Button>
          </div>
        </Card>
      )}

      {/* Referrals list */}
      {info && info.referrals.length > 0 && (
        <Card>
          <SectionTitle badge={String(info.referrals.length)}>Ваши рефералы</SectionTitle>
          <div className="space-y-2">
            {info.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
                    <span className="text-sm font-bold text-accent-blue-light">
                      {r.name[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <span className="text-text-primary text-sm">{r.name}</span>
                </div>
                <span className="text-text-muted text-xs">
                  {new Date(r.joinedAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {info?.referralsCount === 0 && (
        <Card className="text-center py-6">
          <p className="text-4xl mb-2">👥</p>
          <p className="text-text-primary font-semibold mb-1">Пока нет рефералов</p>
          <p className="text-text-secondary text-sm">
            Поделитесь ссылкой с друзьями и получайте{' '}
            <span className="text-accent-blue-light font-semibold">
              {info?.rewardPercent ?? 40}%
            </span>{' '}
            с их покупок
          </p>
        </Card>
      )}
    </div>
  );
};
