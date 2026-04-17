import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { remnawave } from '../lib/remnawave.js';
import { syncSubscriptionFromRemna, ensureRemnaUser } from '../services/user.js';
import { purchaseSubscriptionFromBalance, purchaseExtraDevice } from '../services/payment.js';
import { getConnectionUrl, activateSubscription } from '../services/subscription.js';

const DEVICE_SLOT_PRICE_KOPEKS = 10_000; // 100 rub

export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /subscription
  app.get('/subscription', { preHandler: [app.authenticate] }, async (req) => {
    await syncSubscriptionFromRemna(req.userId).catch(() => {});

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) return { subscription: null };

    const trafficLimitGb = Number(sub.trafficLimitBytes) / 1024 ** 3;
    const trafficUsedGb  = Number(sub.trafficUsedBytes)  / 1024 ** 3;
    const trafficUsedPercent = trafficLimitGb > 0 ? (trafficUsedGb / trafficLimitGb) * 100 : 0;
    const daysLeft = sub.endDate
      ? Math.max(0, Math.ceil((sub.endDate.getTime() - Date.now()) / 86400000))
      : 0;

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        isTrial: sub.isTrial,
        planName: sub.plan?.name ?? null,
        trafficLimitGb:     Math.round(trafficLimitGb * 100) / 100,
        trafficUsedGb:      Math.round(trafficUsedGb  * 100) / 100,
        trafficUsedPercent: Math.round(trafficUsedPercent * 10) / 10,
        deviceLimit: sub.deviceLimit,
        startDate: sub.startDate,
        endDate:   sub.endDate,
        daysLeft,
      },
    };
  });

  // GET /subscription/plans
  app.get('/subscription/plans', { preHandler: [app.authenticate] }, async () => {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { plans };
  });

  // POST /subscription/purchase
  app.post('/subscription/purchase', { preHandler: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({ planId: z.number().int().positive() });
    const { planId } = schema.parse(req.body);

    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId } }),
      prisma.plan.findUnique({ where: { id: planId, isActive: true } }),
    ]);

    if (!user) return reply.status(404).send({ error: 'User not found' });
    if (!plan) return reply.status(404).send({ error: 'Plan not found' });
    if (user.balanceKopeks < plan.priceKopeks)
      return reply.status(402).send({ error: 'Insufficient balance' });

    await purchaseSubscriptionFromBalance(user, plan);
    return { ok: true };
  });

  // GET /subscription/connection-link
  app.get('/subscription/connection-link', { preHandler: [app.authenticate] }, async (req) => {
    const url = await getConnectionUrl(req.userId);
    return { url };
  });

  // GET /subscription/devices
  app.get('/subscription/devices', { preHandler: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.remnaUuid) return { devices: [] };
    const devices = await remnawave.getUserDevices(user.remnaUuid);
    return { devices };
  });

  // DELETE /subscription/devices/:hwid
  app.delete('/subscription/devices/:hwid', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { hwid } = req.params as { hwid: string };
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.remnaUuid) return reply.status(404).send({ error: 'No VPN account' });
    await remnawave.removeUserDevice(user.remnaUuid, hwid);
    return { ok: true };
  });

  // POST /subscription/devices/purchase
  app.post('/subscription/devices/purchase', { preHandler: [app.authenticate] }, async (req, reply) => {
    try {
      await purchaseExtraDevice(req.userId, DEVICE_SLOT_PRICE_KOPEKS);
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.message === 'Insufficient balance')
        return reply.status(402).send({ error: 'Insufficient balance' });
      throw e;
    }
  });

  // POST /subscription/trial  — one-time 3-day free trial
  app.post('/subscription/trial', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    if (user.trialActivated) return reply.status(409).send({ error: 'Trial already used' });

    // Ensure Remnawave account exists (returns void, updates DB)
    try {
      await ensureRemnaUser({ id: user.id, telegramId: user.telegramId, remnaUuid: user.remnaUuid });
    } catch (e) {
      req.log.error(e, 'ensureRemnaUser failed in trial');
      return reply.status(500).send({ error: 'Failed to create VPN account' });
    }

    // Re-fetch to get updated remnaUuid
    const fresh = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!fresh?.remnaUuid) return reply.status(500).send({ error: 'Failed to create VPN account — no remnaUuid' });

    const TRIAL_DAYS = 3;
    const TRIAL_TRAFFIC_GB = 20;
    const TRIAL_DEVICES = 1;

    try {
      await activateSubscription(
        { id: fresh.id, remnaUuid: fresh.remnaUuid, remnaShortUuid: fresh.remnaShortUuid ?? null },
        { id: 0, name: 'Пробный', durationDays: TRIAL_DAYS, trafficGb: TRIAL_TRAFFIC_GB, deviceLimit: TRIAL_DEVICES, priceKopeks: 0 },
      );
    } catch (e) {
      req.log.error(e, 'activateSubscription failed in trial');
      return reply.status(500).send({ error: 'Failed to activate trial in VPN panel' });
    }

    // Mark trial as used
    await prisma.user.update({ where: { id: user.id }, data: { trialActivated: true } });

    return { ok: true };
  });

  // POST /subscription/refresh-traffic
  app.post('/subscription/refresh-traffic', { preHandler: [app.authenticate] }, async (req) => {
    await syncSubscriptionFromRemna(req.userId);
    return { ok: true };
  });
}
