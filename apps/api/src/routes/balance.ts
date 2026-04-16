import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { creditBalance, rubleToStars } from '../services/payment.js';
import { config } from '../config.js';

export async function balanceRoutes(app: FastifyInstance) {
  // GET /balance
  app.get('/balance', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { balanceKopeks: true },
    });
    return { balanceKopeks: user?.balanceKopeks ?? 0 };
  });

  // GET /balance/transactions
  app.get('/balance/transactions', { preHandler: [app.authenticate] }, async (req) => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    });
    const { page, limit } = schema.parse(req.query);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId: req.userId } }),
    ]);

    return { transactions, total, page, limit };
  });

  // POST /balance/topup/stars - create Telegram Stars invoice
  app.post('/balance/topup/stars', { preHandler: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({
      amountKopeks: z.number().int().min(100).max(100_000_00),
    });
    const { amountKopeks } = schema.parse(req.body);

    const stars = rubleToStars(amountKopeks);
    if (stars < 1) return reply.status(400).send({ error: 'Amount too small' });

    // Create pending transaction
    const tx = await prisma.transaction.create({
      data: {
        userId: req.userId,
        type: 'DEPOSIT',
        amountKopeks,
        paymentMethod: 'stars',
        starsAmount: stars,
        status: 'PENDING',
        description: `Top up ${amountKopeks / 100}₽ via Telegram Stars`,
      },
    });

    return {
      transactionId: tx.id,
      starsAmount: stars,
      amountKopeks,
      title: 'Пополнение баланса YumOff VPN',
      description: `Пополнение на ${amountKopeks / 100} ₽`,
      payload: `topup_${tx.id}_${req.userId}`,
    };
  });

  // POST /balance/topup/stars/confirm - called after successful payment
  app.post(
    '/balance/topup/stars/confirm',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const schema = z.object({
        transactionId: z.number().int().positive(),
        telegramPaymentChargeId: z.string().min(1),
      });
      const { transactionId, telegramPaymentChargeId } = schema.parse(req.body);

      const tx = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: req.userId, status: 'PENDING' },
      });

      if (!tx) return reply.status(404).send({ error: 'Transaction not found' });

      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'COMPLETED', paymentId: telegramPaymentChargeId },
        }),
        prisma.user.update({
          where: { id: req.userId },
          data: { balanceKopeks: { increment: tx.amountKopeks } },
        }),
      ]);

      return { ok: true };
    }
  );
}
