import { prisma } from '../lib/prisma.js';
import { remnawave } from '../lib/remnawave.js';
import { config } from '../config.js';
import type { User, Plan } from '@prisma/client';

const GB = 1024 ** 3;

export async function activateSubscription(user: User, plan: Plan): Promise<void> {
  if (!user.remnaUuid) throw new Error('User has no Remnawave account');

  const expireAt = new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000).toISOString();
  const trafficBytes = plan.trafficGb === 0 ? 1_000_000 * GB : plan.trafficGb * GB;

  const inbounds = await getDefaultInbounds();

  await remnawave.updateUser(user.remnaUuid, {
    trafficLimitBytes: trafficBytes,
    trafficLimitStrategy: 'MONTH',
    activeUserInbounds: inbounds,
    expireAt,
    deviceLimit: plan.deviceLimit,
  });

  await remnawave.enableUser(user.remnaUuid);

  // Upsert subscription in DB
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id },
  });

  const now = new Date();

  if (existing) {
    const newEndDate =
      existing.endDate && existing.endDate > now
        ? new Date(existing.endDate.getTime() + plan.durationDays * 24 * 3600 * 1000)
        : new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        trafficLimitBytes: BigInt(trafficBytes),
        trafficUsedBytes: BigInt(0),
        deviceLimit: plan.deviceLimit,
        startDate: existing.startDate ?? now,
        endDate: newEndDate,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        remnaUuid: user.remnaUuid,
        shortUuid: user.remnaShortUuid ?? undefined,
        status: 'ACTIVE',
        trafficLimitBytes: BigInt(trafficBytes),
        deviceLimit: plan.deviceLimit,
        startDate: now,
        endDate: new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000),
      },
    });
  }
}

export async function getConnectionUrl(user: User): Promise<string | null> {
  if (!user.remnaShortUuid) return null;
  const remnaUrl = config.REMNAWAVE_URL.replace(/\/$/, '');
  return `${remnaUrl}/api/sub/${user.remnaShortUuid}`;
}

export async function purchaseExtraDevice(user: User, priceKopeks: number): Promise<void> {
  if (!user.remnaUuid) throw new Error('User has no Remnawave account');
  if (user.balanceKopeks < priceKopeks) throw new Error('Insufficient balance');

  const remnaUser = await remnawave.getUserByUuid(user.remnaUuid);
  if (!remnaUser) throw new Error('Remnawave user not found');

  const newLimit = remnaUser.deviceLimit + 1;

  await remnawave.updateUser(user.remnaUuid, { deviceLimit: newLimit });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balanceKopeks: { decrement: priceKopeks } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DEVICE_PURCHASE',
        amountKopeks: -priceKopeks,
        status: 'COMPLETED',
        description: '+1 device slot',
      },
    }),
    prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { deviceLimit: newLimit },
    }),
  ]);
}

async function getDefaultInbounds(): Promise<{ uuid: string }[]> {
  try {
    const inbounds = await remnawave.getInbounds();
    return inbounds.slice(0, 3).map((i) => ({ uuid: i.uuid }));
  } catch {
    return [];
  }
}
