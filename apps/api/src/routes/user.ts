import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { syncSubscriptionFromRemna } from '../services/user.js';

export async function userRoutes(app: FastifyInstance) {
  // GET /user/me
  app.get('/user/me', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        telegramId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        languageCode: true,
        balanceKopeks: true,
        referralCode: true,
        isAdmin: true,
        trialActivated: true,
        createdAt: true,
      },
    });
    if (!user) return null;
    // BigInt cannot be JSON-serialized — convert to string
    return { ...user, telegramId: user.telegramId ? String(user.telegramId) : null };
  });

  // POST /user/sync - sync subscription data from Remnawave
  app.post('/user/sync', { preHandler: [app.authenticate] }, async (req) => {
    await syncSubscriptionFromRemna(req.userId);
    return { ok: true };
  });
}
