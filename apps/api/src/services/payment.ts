import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { activateSubscription } from './subscription.js';

// Prisma types via inline — avoids @prisma/client export issues before generate
type UserRow = { id: number; remnaUuid: string | null; balanceKopeks: number; referredById: number | null };
type PlanRow = { id: number; name: string; priceKopeks: number; durationDays: number; trafficGb: number; deviceLimit: number };

export function rubleToStars(kopeks: number): number {
  return Math.ceil(kopeks / config.STARS_RATE_KOPEKS);
}

export function starsToCopeks(stars: number): number {
  return stars * config.STARS_RATE_KOPEKS;
}

export async function creditBalance(
  userId: number,
  amountKopeks: number,
  description: string,
  paymentMethod: string,
  paymentId?: string,
  starsAmount?: number
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balanceKopeks: { increment: amountKopeks } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amountKopeks,
        paymentMethod,
        paymentId,
        starsAmount,
        status: 'COMPLETED',
        description,
      },
    }),
  ]);
}

export async function purchaseSubscriptionFromBalance(
  user: UserRow,
  plan: PlanRow
): Promise<void> {
  if (user.balanceKopeks < plan.priceKopeks) {
    throw new Error('Insufficient balance');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { balanceKopeks: { decrement: plan.priceKopeks } },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'SUBSCRIPTION_PAYMENT',
        amountKopeks: -plan.priceKopeks,
        status: 'COMPLETED',
        description: `Plan: ${plan.name}`,
      },
    });
  });

  // Need full user object for activateSubscription
  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const fullPlan = await prisma.plan.findUniqueOrThrow({ where: { id: plan.id } });
  await activateSubscription(fullUser, fullPlan);

  // Referral reward
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (freshUser?.referredById) {
    const reward = Math.floor((plan.priceKopeks * config.REFERRAL_PERCENT) / 100);
    if (reward > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: freshUser.referredById },
          data: { balanceKopeks: { increment: reward } },
        }),
        prisma.transaction.create({
          data: {
            userId: freshUser.referredById,
            type: 'REFERRAL_BONUS',
            amountKopeks: reward,
            status: 'COMPLETED',
            description: `Referral reward from user #${user.id}`,
          },
        }),
        prisma.referralReward.create({
          data: {
            referrerId: freshUser.referredById,
            referredUserId: user.id,
            rewardKopeks: reward,
          },
        }),
      ]);
    }
  }
}

export async function purchaseExtraDevice(
  userId: number,
  priceKopeks: number
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.remnaUuid) throw new Error('User has no Remnawave account');
  if (user.balanceKopeks < priceKopeks) throw new Error('Insufficient balance');

  const { remnawave } = await import('../lib/remnawave.js');
  const remnaUser = await remnawave.getUserByUuid(user.remnaUuid);
  if (!remnaUser) throw new Error('Remnawave user not found');

  const newLimit = remnaUser.deviceLimit + 1;
  await remnawave.updateUser(user.remnaUuid, { deviceLimit: newLimit });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balanceKopeks: { decrement: priceKopeks } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: 'DEVICE_PURCHASE',
        amountKopeks: -priceKopeks,
        status: 'COMPLETED',
        description: '+1 device slot',
      },
    }),
    prisma.subscription.updateMany({
      where: { userId },
      data: { deviceLimit: newLimit },
    }),
  ]);
}
