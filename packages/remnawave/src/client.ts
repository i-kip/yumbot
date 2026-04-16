import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  RemnawaveUser,
  RemnawaveNode,
  RemnawaveDevice,
  RemnawaveSystemStats,
  RemnawaveInboundFull,
  CreateUserPayload,
  UpdateUserPayload,
} from './types.js';

export class RemnawaveError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'RemnawaveError';
  }
}

export class RemnawaveClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, token: string) {
    this.http = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.http.interceptors.response.use(
      (r) => r,
      (err: AxiosError) => {
        const status = err.response?.status;
        const data = err.response?.data as Record<string, unknown> | undefined;
        const msg = (data?.message as string) || err.message || 'Remnawave API error';
        throw new RemnawaveError(msg, status, data);
      }
    );
  }

  // ===== USERS =====

  async createUser(payload: CreateUserPayload): Promise<RemnawaveUser> {
    const { data } = await this.http.post<RemnawaveUser>('/api/users', payload);
    return data;
  }

  async getUserByUuid(uuid: string): Promise<RemnawaveUser | null> {
    try {
      const { data } = await this.http.get<RemnawaveUser>(`/api/users/${uuid}`);
      return data;
    } catch (e) {
      if (e instanceof RemnawaveError && e.statusCode === 404) return null;
      throw e;
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<RemnawaveUser | null> {
    try {
      const { data } = await this.http.get<RemnawaveUser>(
        `/api/users/get-by-telegram-id/${telegramId}`
      );
      return data;
    } catch (e) {
      if (e instanceof RemnawaveError && e.statusCode === 404) return null;
      throw e;
    }
  }

  async updateUser(uuid: string, payload: UpdateUserPayload): Promise<RemnawaveUser> {
    const { data } = await this.http.put<RemnawaveUser>(`/api/users/${uuid}`, payload);
    return data;
  }

  async enableUser(uuid: string): Promise<RemnawaveUser> {
    const { data } = await this.http.put<RemnawaveUser>(`/api/users/enable/${uuid}`);
    return data;
  }

  async disableUser(uuid: string): Promise<RemnawaveUser> {
    const { data } = await this.http.put<RemnawaveUser>(`/api/users/disable/${uuid}`);
    return data;
  }

  async resetUserTraffic(uuid: string): Promise<RemnawaveUser> {
    const { data } = await this.http.patch<RemnawaveUser>(`/api/users/${uuid}/reset-traffic`);
    return data;
  }

  async revokeUserSubscription(uuid: string): Promise<RemnawaveUser> {
    const { data } = await this.http.patch<RemnawaveUser>(`/api/users/${uuid}/revoke-sub`);
    return data;
  }

  async getUserDevices(uuid: string): Promise<RemnawaveDevice[]> {
    try {
      const { data } = await this.http.get<RemnawaveDevice[]>(`/api/users/${uuid}/devices`);
      return data;
    } catch {
      return [];
    }
  }

  async removeUserDevice(uuid: string, hwid: string): Promise<void> {
    await this.http.delete(`/api/users/${uuid}/devices/${hwid}`);
  }

  // ===== NODES =====

  async getNodes(): Promise<RemnawaveNode[]> {
    const { data } = await this.http.get<RemnawaveNode[]>('/api/nodes');
    return data;
  }

  async getNodeByUuid(uuid: string): Promise<RemnawaveNode | null> {
    try {
      const { data } = await this.http.get<RemnawaveNode>(`/api/nodes/${uuid}`);
      return data;
    } catch (e) {
      if (e instanceof RemnawaveError && e.statusCode === 404) return null;
      throw e;
    }
  }

  // ===== INBOUNDS =====

  async getInbounds(): Promise<RemnawaveInboundFull[]> {
    const { data } = await this.http.get<RemnawaveInboundFull[]>('/api/inbounds');
    return data;
  }

  // ===== SYSTEM =====

  async getSystemStats(): Promise<RemnawaveSystemStats> {
    const { data } = await this.http.get<RemnawaveSystemStats>('/api/system/stats');
    return data;
  }

  // ===== SUBSCRIPTION =====

  async getSubscriptionLinks(shortUuid: string): Promise<string[]> {
    try {
      const { data } = await this.http.get<{ links: string[] }>(
        `/api/sub/${shortUuid}/links`
      );
      return data.links ?? [];
    } catch {
      return [];
    }
  }
}
