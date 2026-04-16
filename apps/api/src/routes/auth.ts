import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateTelegramInitData } from '../lib/telegram.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken, verifyJwt } from '../lib/jwt.js';
import { ensureRemnaUser } from '../services/user.js';
import { config } from '../config.js';
import { adminIds } from '../config.js';

const REFRESH_EXPIRES_MS = 30 * 24 * 3600 * 1000;

async function issueTokens(userId: number) {
  const access = generateAccessToken(userId);
  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      token: refresh,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });
  return { access_token: access, refresh_token: refresh };
}

export async function authRoutes(app: FastifyInstance) {
  // === Telegram Mini App auth ===
  app.post('/auth/telegram', async (req, reply) => {
    const schema = z.object({ initData: z.string().min(1) });
    const { initData } = schema.parse(req.body);

    let tgUser;
    try {
      tgUser = validateTelegramInitData(initData);
    } catch {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    let user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });

    if (!user) {
      // Check referral from startParam
      let referredById: number | undefined;
      try {
        const params = new URLSearchParams(initData);
        const startParam = params.get('start_param');
        if (startParam) {
          const ref = await prisma.user.findUnique({ where: { referralCode: startParam } });
          if (ref) referredById = ref.id;
        }
      } catch {}

      user = await prisma.user.create({
        data: {
          telegramId: BigInt(tgUser.id),
          username: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          photoUrl: tgUser.photo_url,
          languageCode: tgUser.language_code,
          isAdmin: adminIds.includes(tgUser.id),
          referredById,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: tgUser.username ?? user.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name ?? user.lastName,
          photoUrl: tgUser.photo_url ?? user.photoUrl,
        },
      });
    }

    if (user.status === 'BLOCKED') {
      return reply.status(403).send({ error: 'Account blocked' });
    }

    // Ensure Remnawave user exists
    await ensureRemnaUser(user).catch(() => {});

    const tokens = await issueTokens(user.id);
    return { ...tokens, token_type: 'bearer' };
  });

  // === Email registration ===
  app.post('/auth/email/register', async (req, reply) => {
    const schema = z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(8).max(72),
      referralCode: z.string().optional(),
    });

    const { email, password, referralCode } = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.status(409).send({ error: 'Email already registered' });

    let referredById: number | undefined;
    if (referralCode) {
      const ref = await prisma.user.findUnique({ where: { referralCode } });
      if (ref) referredById = ref.id;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, referredById },
    });

    await ensureRemnaUser(user).catch(() => {});

    const tokens = await issueTokens(user.id);
    return { ...tokens, token_type: 'bearer' };
  });

  // === Email login ===
  app.post('/auth/email/login', async (req, reply) => {
    const schema = z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(1),
    });

    const { email, password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return reply.status(401).send({ error: 'Invalid credentials' });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    if (user.status === 'BLOCKED') return reply.status(403).send({ error: 'Account blocked' });

    const tokens = await issueTokens(user.id);
    return { ...tokens, token_type: 'bearer' };
  });

  // === Refresh token ===
  app.post('/auth/refresh', async (req, reply) => {
    const schema = z.object({ refresh_token: z.string().min(1) });
    const { refresh_token } = schema.parse(req.body);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refresh_token } });
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await issueTokens(stored.userId);
    return { ...tokens, token_type: 'bearer' };
  });

  // === Logout ===
  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({ refresh_token: z.string().min(1) });
    const { refresh_token } = schema.parse(req.body);
    await prisma.refreshToken.deleteMany({ where: { token: refresh_token } });
    return reply.status(204).send();
  });

  // === Link Telegram to email account ===
  app.post('/auth/link-telegram', { preHandler: [app.authenticate] }, async (req, reply) => {
    const schema = z.object({ initData: z.string().min(1) });
    const { initData } = schema.parse(req.body);

    let tgUser;
    try {
      tgUser = validateTelegramInitData(initData);
    } catch {
      return reply.status(401).send({ error: 'Invalid Telegram data' });
    }

    const existing = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
    if (existing && existing.id !== req.userId) {
      return reply.status(409).send({ error: 'Telegram account already linked to another user' });
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        telegramId: BigInt(tgUser.id),
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        photoUrl: tgUser.photo_url,
      },
    });

    return { ok: true };
  });
}
