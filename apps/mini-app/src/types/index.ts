export interface User {
  id: number;
  telegramId?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  balanceKopeks: number;
  referralCode: string;
  isAdmin: boolean;
  trialActivated: boolean;
  createdAt: string;
}

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'DISABLED'
  | 'LIMITED'
  | 'TRIAL';

export interface Subscription {
  id: number;
  status: SubscriptionStatus;
  isTrial: boolean;
  planName: string | null;
  trafficLimitGb: number;
  trafficUsedGb: number;
  trafficUsedPercent: number;
  deviceLimit: number;
  startDate: string | null;
  endDate: string | null;
  daysLeft: number;
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  durationDays: number;
  trafficGb: number;
  deviceLimit: number;
  priceKopeks: number;
}

export interface Transaction {
  id: number;
  type: string;
  amountKopeks: number;
  paymentMethod: string | null;
  starsAmount: number | null;
  status: string;
  description: string | null;
  createdAt: string;
}

export interface Device {
  hwid: string;
  platform?: string;
  browser?: string;
  firstSeen: string;
  lastSeen: string;
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string | null;
  referralsCount: number;
  totalRewardKopeks: number;
  rewardPercent: number;
  balanceKopeks: number;
  telegramId: string | null;
  referrals: { id: number; name: string; joinedAt: string }[];
}

export interface TopupStarsPayload {
  transactionId: number;
  starsAmount: number;
  amountKopeks: number;
  title: string;
  description: string;
  payload: string;
}
