import { prisma } from '../lib/prisma.js';
import { remnawave } from '../lib/remnawave.js';
import { config } from '../config.js';

const GB = 1024 ** 3;

async function getDefaultInbounds(): Promise<{ uuid: string }[]> {
  try {
    const inbounds = await remnawave.getInbounds();
    return inbounds.slice(0, 3).map((i) => ({ uuid: i.uuid }));
  } catch {
    return [];
  }
}

// Accept plain objects to avoid @prisma/client type import issues before generate
type UserRow = { id: number; remnaUuid: string | null; remnaShortUuid: string | null };
type PlanRow = { id: number; name: string; durationDays: number; trafficGb: number; deviceLimit: number; priceKopeks: number };

export async function activateSubscription(user: UserRow, plan: PlanRow): Promise<void> {
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
    ...(config.REMNAWAVE_SQUAD_UUID ? { activeInternalSquads: [{ uuid: config.REMNAWAVE_SQUAD_UUID }] } : {}),
  });
  await remnawave.enableUser(user.remnaUuid);

  const existing = await prisma.subscription.findFirst({ where: { userId: user.id } });
  const now = new Date();

  const isTrial = plan.id === 0; // id 0 = virtual trial plan

  if (existing) {
    const newEnd =
      existing.endDate && existing.endDate > now
        ? new Date(existing.endDate.getTime() + plan.durationDays * 24 * 3600 * 1000)
        : new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id !== 0 ? plan.id : null,
        status: isTrial ? 'TRIAL' : 'ACTIVE',
        isTrial,
        trafficLimitBytes: BigInt(trafficBytes),
        trafficUsedBytes: BigInt(0),
        deviceLimit: plan.deviceLimit,
        startDate: existing.startDate ?? now,
        endDate: newEnd,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id !== 0 ? plan.id : null,
        remnaUuid: user.remnaUuid,
        shortUuid: user.remnaShortUuid ?? undefined,
        status: isTrial ? 'TRIAL' : 'ACTIVE',
        isTrial,
        trafficLimitBytes: BigInt(trafficBytes),
        deviceLimit: plan.deviceLimit,
        startDate: now,
        endDate: new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000),
      },
    });
  }
}

export async function getConnectionUrl(userId: number): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.remnaShortUuid) return null;
  return `${config.REMNAWAVE_URL.replace(/\/$/, '')}/api/sub/${user.remnaShortUuid}`;
}
