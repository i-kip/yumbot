import { createHmac, createHash } from 'crypto';
import { config } from '../config.js';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export function validateTelegramInitData(initData: string): TelegramUser {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash');

  params.delete('hash');
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(config.BOT_TOKEN)
    .digest();
  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) throw new Error('Invalid hash');

  const authDate = params.get('auth_date');
  if (!authDate) throw new Error('Missing auth_date');

  // Reject stale data older than 1 hour
  const age = Math.floor(Date.now() / 1000) - parseInt(authDate, 10);
  if (age > 3600) throw new Error('Init data expired');

  const userStr = params.get('user');
  if (!userStr) throw new Error('Missing user data');

  return JSON.parse(userStr) as TelegramUser;
}

export function verifyWebhookSecret(secret: string): boolean {
  const expected = createHash('sha256').update(config.BOT_WEBHOOK_SECRET).digest('hex');
  const actual = createHash('sha256').update(secret).digest('hex');
  return expected === actual;
}
