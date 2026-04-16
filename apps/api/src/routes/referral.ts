import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

export async function referralRoutes(app: FastifyInstance) {
  // GET /referral
  app.get('/referral', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        telegramId: true,
        referralCode: true,
        balanceKopeks: true,
        referrals: { select: { id: true, createdAt: true, firstName: true, username: true } },
      },
    });

    if (!user) return null;

    const rewards = await prisma.referralReward.findMany({
      where: { referrerId: user.id },
    });

    const totalRewardKopeks = rewards.reduce((sum, r) => sum + r.rewardKopeks, 0);

    const referralLink = user.telegramId
      ? `https://t.me/yumoff_bot?start=${user.referralCode}`
      : null;

    return {
      referralCode: user.referralCode,
      referralLink,
      referralsCount: user.referrals.length,
      totalRewardKopeks,
      rewardPercent: config.REFERRAL_PERCENT,
      balanceKopeks: user.balanceKopeks,
      telegramId: user.telegramId?.toString() ?? null,
      referrals: user.referrals.map((r) => ({
        id: r.id,
        name: r.firstName ?? r.username ?? `User #${r.id}`,
        joinedAt: r.createdAt,
      })),
    };
  });
}
