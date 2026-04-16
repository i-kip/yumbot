import { prisma } from '../lib/prisma.js';
import { remnawave } from '../lib/remnawave.js';
import { config } from '../config.js';

type UserRow = { id: number; telegramId: bigint | null; remnaUuid: string | null };

async function getDefaultInbounds(): Promise<{ uuid: string }[]> {
  try {
    const inbounds = await remnawave.getInbounds();
    return inbounds.slice(0, 3).map((i) => ({ uuid: i.uuid }));
  } catch {
    return [];
  }
}

export async function ensureRemnaUser(user: UserRow): Promise<void> {
  if (user.remnaUuid) return;

  const tgId = user.telegramId ? Number(user.telegramId) : undefined;

  // Check if user already exists in Remnawave panel
  if (tgId) {
    const existing = await remnawave.getUserByTelegramId(tgId);
    if (existing) {
      await prisma.user.update({
        where: { id: user.id },
        data: { remnaUuid: existing.uuid, remnaShortUuid: existing.shortUuid },
      });
      return;
    }
  }

  const expireAt = new Date(
    Date.now() + config.REMNAWAVE_DEFAULT_DAYS * 24 * 3600 * 1000
  ).toISOString();

  const inbounds = await getDefaultInbounds();

  const remnaUser = await remnawave.createUser({
    username: tgId ? `yumoff_${tgId}` : `yumoff_email_${user.id}`,
    trafficLimitBytes: config.REMNAWAVE_DEFAULT_TRAFFIC_GB * 1024 ** 3,
    trafficLimitStrategy: 'MONTH',
    activeUserInbounds: inbounds,
    expireAt,
    telegramId: tgId,
    description: `yumbot user #${user.id}`,
    status: 'DISABLED',
    deviceLimit: config.REMNAWAVE_DEFAULT_DEVICE_LIMIT,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { remnaUuid: remnaUser.uuid, remnaShortUuid: remnaUser.shortUuid },
  });
}

export async function syncSubscriptionFromRemna(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.remnaUuid) return;

  const remnaUser = await remnawave.getUserByUuid(user.remnaUuid);
  if (!remnaUser) return;

  const statusMap: Record<string, 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED'> = {
    ACTIVE: 'ACTIVE',
    DISABLED: 'DISABLED',
    LIMITED: 'LIMITED',
    EXPIRED: 'EXPIRED',
  };

  const subStatus = statusMap[remnaUser.status] ?? 'DISABLED';

  const data = {
    trafficLimitBytes: BigInt(remnaUser.trafficLimitBytes),
    trafficUsedBytes:  BigInt(remnaUser.usedTrafficBytes),
    deviceLimit:       remnaUser.deviceLimit,
    endDate:           remnaUser.expireAt ? new Date(remnaUser.expireAt) : undefined,
    shortUuid:         remnaUser.shortUuid,
    status:            subStatus as 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED',
  };

  const sub = await prisma.subscription.findFirst({
    where: { userId, remnaUuid: remnaUser.uuid },
  });

  if (sub) {
    await prisma.subscription.update({ where: { id: sub.id }, data });
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        remnaUuid: remnaUser.uuid,
        startDate: new Date(remnaUser.createdAt),
        ...data,
      },
    });
  }
}
