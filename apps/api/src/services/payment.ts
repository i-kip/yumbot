import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { activateSubscription } from './subscription.js';
import type { User, Plan } from '@prisma/client';

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
  user: User,
  plan: Plan
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

  await activateSubscription(user, plan);

  // Pay referral reward
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
