export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED';
export type TrafficStrategy = 'NO_RESET' | 'DAY' | 'WEEK' | 'MONTH' | 'MONTH_ROLLING';

export interface RemnawaveUser {
  uuid: string;
  username: string;
  shortUuid: string;
  subscriptionUrl: string;
  status: UserStatus;
  telegramId?: number | null;
  email?: string | null;
  description?: string;
  trafficLimitBytes: number;
  usedTrafficBytes: number;
  trafficLimitStrategy: TrafficStrategy;
  deviceLimit: number;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
  lastTrafficResetAt?: string | null;
  activeUserInbounds: RemnawaveInbound[];
  onlineAt?: string | null;
  subLastUserAgent?: string | null;
  subUpdatedAt?: string | null;
}

export interface RemnawaveInbound {
  uuid: string;
  tag: string;
  type: string;
}

export interface RemnawaveNode {
  uuid: string;
  name: string;
  address: string;
  port: number;
  isTrafficTrackingActive: boolean;
  isConnected: boolean;
  isEnabled: boolean;
  isNodeOnline: boolean;
  consumptionMultiplier: number;
  trafficLimitBytes?: number;
  trafficUsedBytes: number;
  createdAt: string;
  updatedAt: string;
  countryCode?: string;
  viewPosition: number;
}

export interface RemnawaveDevice {
  hwid: string;
  platform?: string;
  browser?: string;
  firstSeen: string;
  lastSeen: string;
  userUuid: string;
}

export interface RemnawaveSubscriptionInfo {
  links: string[];
  configs: SubscriptionConfig[];
}

export interface SubscriptionConfig {
  protocol: string;
  config: string;
}

export interface RemnawaveSystemStats {
  onlineUsersCount: number;
  totalTrafficBytes: number;
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  expiredUsers: number;
  limitedUsers: number;
  nodesCount: number;
  nodesOnline: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

export interface CreateUserPayload {
  username: string;
  trafficLimitBytes: number;
  trafficLimitStrategy: TrafficStrategy;
  activeUserInbounds: { uuid: string }[];
  expireAt: string;
  telegramId?: number;
  email?: string;
  description?: string;
  status?: UserStatus;
  deviceLimit?: number;
  activeInternalSquads?: { uuid: string }[];
}

export interface UpdateUserPayload {
  trafficLimitBytes?: number;
  trafficLimitStrategy?: TrafficStrategy;
  activeUserInbounds?: { uuid: string }[];
  expireAt?: string;
  status?: UserStatus;
  deviceLimit?: number;
  description?: string;
  activeInternalSquads?: { uuid: string }[];
}

export interface RemnawaveInboundFull {
  uuid: string;
  tag: string;
  type: string;
  network?: string;
  security?: string;
  port: number;
}

export interface PaginatedResponse<T> {
  users?: T[];
  items?: T[];
  total: number;
  page: number;
  perPage: number;
}
