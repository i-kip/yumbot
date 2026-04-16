import { Bot, webhookCallback, InlineKeyboard } from 'grammy';
import { config, adminIds } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { ensureRemnaUser } from '../services/user.js';
import { creditBalance, rubleToStars, starsToCopeks } from '../services/payment.js';
import type { FastifyInstance } from 'fastify';

export const bot = new Bot(config.BOT_TOKEN);

// ====== Commands ======

bot.command('start', async (ctx) => {
  const tgUser = ctx.from;
  if (!tgUser) return;

  const startParam = ctx.match;

  let user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });

  if (!user) {
    let referredById: number | undefined;
    if (startParam) {
      const ref = await prisma.user.findUnique({ where: { referralCode: startParam } });
      if (ref && ref.telegramId !== BigInt(tgUser.id)) referredById = ref.id;
    }

    user = await prisma.user.create({
      data: {
        telegramId: BigInt(tgUser.id),
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        languageCode: tgUser.language_code,
        isAdmin: adminIds.includes(tgUser.id),
        referredById,
      },
    });
  }

  await ensureRemnaUser(user).catch(() => {});

  const keyboard = new InlineKeyboard().webApp(
    '🚀 Открыть YumOff VPN',
    config.MINI_APP_URL
  );

  await ctx.reply(
    `👋 Привет, <b>${tgUser.first_name}</b>!\n\n` +
      `🔒 <b>YumOff VPN</b> — быстрый и безопасный VPN.\n\n` +
      `Нажми кнопку ниже, чтобы управлять подпиской:`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

bot.command('profile', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('📱 Мой профиль', config.MINI_APP_URL);
  await ctx.reply('Открой личный кабинет:', { reply_markup: keyboard });
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '🆘 <b>Помощь</b>\n\n' +
      '/start — Главное меню\n' +
      '/profile — Личный кабинет\n' +
      '/help — Помощь\n\n' +
      'По вопросам: @yumoff_support',
    { parse_mode: 'HTML' }
  );
});

// ====== Payments (Telegram Stars) ======

bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('message:successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  if (!payment) return;

  const payload = payment.invoice_payload;
  // payload format: topup_<txId>_<userId>
  const match = payload.match(/^topup_(\d+)_(\d+)$/);
  if (!match) return;

  const txId = parseInt(match[1]!, 10);
  const userId = parseInt(match[2]!, 10);
  const stars = payment.total_amount;
  const kopeks = starsToCopeks(stars);

  const tx = await prisma.transaction.findFirst({
    where: { id: txId, userId, status: 'PENDING' },
  });

  if (!tx) return;

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: 'COMPLETED',
        paymentId: payment.telegram_payment_charge_id,
        starsAmount: stars,
        amountKopeks: kopeks,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balanceKopeks: { increment: kopeks } },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId } });

  await ctx.reply(
    `✅ Баланс пополнен!\n\n` +
      `Начислено: <b>${kopeks / 100} ₽</b>\n` +
      `Текущий баланс: <b>${((user?.balanceKopeks ?? 0) / 100).toFixed(2)} ₽</b>`,
    { parse_mode: 'HTML' }
  );
});

// ====== Admin commands ======

bot.command('stats', async (ctx) => {
  if (!ctx.from || !adminIds.includes(ctx.from.id)) return;

  const [users, activeSubsCount, todayDeposits] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { amountKopeks: true },
    }),
  ]);

  await ctx.reply(
    `📊 <b>Статистика</b>\n\n` +
      `👥 Пользователей: <b>${users}</b>\n` +
      `✅ Активных подписок: <b>${activeSubsCount}</b>\n` +
      `💰 Доход сегодня: <b>${((todayDeposits._sum.amountKopeks ?? 0) / 100).toFixed(2)} ₽</b>`,
    { parse_mode: 'HTML' }
  );
});

// ====== Webhook setup ======

export function registerBotWebhook(app: FastifyInstance) {
  app.post('/webhook/bot', {
    config: { rawBody: true },
    handler: webhookCallback(bot, 'fastify'),
  });
}

export async function setupWebhook(): Promise<void> {
  const webhookUrl = `${config.API_URL}/webhook/bot`;
  await bot.api.setWebhook(webhookUrl, {
    secret_token: config.BOT_WEBHOOK_SECRET,
    allowed_updates: [
      'message',
      'callback_query',
      'pre_checkout_query',
      'inline_query',
    ],
  });
  console.log(`Webhook set to ${webhookUrl}`);
}
