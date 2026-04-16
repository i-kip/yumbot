import { api } from './client';
import type {
  User,
  Subscription,
  Plan,
  Transaction,
  Device,
  ReferralInfo,
  TopupStarsPayload,
} from '../types';

// === Auth ===
export const authTelegram = (initData: string) =>
  api.post<{ access_token: string; refresh_token: string }>('/auth/telegram', { initData });

// === User ===
export const getMe = () => api.get<User>('/user/me');
export const syncUser = () => api.post('/user/sync');

// === Subscription ===
export const getSubscription = () =>
  api.get<{ subscription: Subscription | null }>('/subscription');
export const getPlans = () => api.get<{ plans: Plan[] }>('/subscription/plans');
export const purchaseSubscription = (planId: number) =>
  api.post('/subscription/purchase', { planId });
export const getConnectionLink = () =>
  api.get<{ url: string | null }>('/subscription/connection-link');
export const getDevices = () => api.get<{ devices: Device[] }>('/subscription/devices');
export const removeDevice = (hwid: string) =>
  api.delete(`/subscription/devices/${encodeURIComponent(hwid)}`);
export const purchaseDeviceSlot = () => api.post('/subscription/devices/purchase');
export const refreshTraffic = () => api.post('/subscription/refresh-traffic');

// === Balance ===
export const getBalance = () => api.get<{ balanceKopeks: number }>('/balance');
export const getTransactions = (page = 1, limit = 20) =>
  api.get<{ transactions: Transaction[]; total: number }>('/balance/transactions', {
    params: { page, limit },
  });
export const createStarsTopup = (amountKopeks: number) =>
  api.post<TopupStarsPayload>('/balance/topup/stars', { amountKopeks });
export const confirmStarsTopup = (transactionId: number, telegramPaymentChargeId: string) =>
  api.post('/balance/topup/stars/confirm', { transactionId, telegramPaymentChargeId });

// === Referral ===
export const getReferral = () => api.get<ReferralInfo>('/referral');
