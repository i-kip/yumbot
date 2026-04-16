import { Bot, webhookCallback, InlineKeyboard } from 'grammy';
import { config, adminIds } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { ensureRemnaUser } from '../services/user.js';
import { creditBalance, starsToCopeks } from '../services/payment.js';
import type { FastifyInstance } from 'fastify';

export const bot = new Bot(config.BOT_TOKEN);

// ── /start ─────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const tgUser = ctx.from;
  if (!tgUser) return;

  const startParam = ctx.match;

  // Upsert user in DB
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgUser.id) },
  });

  if (!user) {
    let referredById: number | undefined;
    if (startParam) {
      const ref = await prisma.user.findUnique({
        where: { referralCode: startParam },
      });
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
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: tgUser.username ?? user.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? user.lastName,
      },
    });
  }

  // Create Remnawave account in background
  ensureRemnaUser(user).catch(() => {});

  // ── Keyboard ──────────────────────────────────────────
  const keyboard = new InlineKeyboard()
    // Row 1 — main CTA: opens Mini App
    .webApp('🚀  Открыть приложение', config.MINI_APP_URL)
    .row()
    // Row 2 — Stars purchase (Telegram Stars store)
    .url('⭐  Дешёвый Premium и звёзды', 'https://t.me/PremiumBot')
    .row()
    // Row 3 — Telegram proxy
    .url('📡  Прокси для Telegram', 'https://t.me/proxy?server=proxy.yumoff.site&port=443&secret=')
    .row()
    // Row 4 — manage autopay inside Mini App
    .webApp('💳  Управление автоплатежом', config.MINI_APP_URL)
    .row()
    // Row 5 — referral (share history for free sub)
    .url('🎁  Подписка за историю', `https://t.me/share/url?url=${encodeURIComponent(`Попробуй YumOff VPN — быстрый и безопасный! https://t.me/yumoff_bot?start=${user.referralCode}`)}&text=${encodeURIComponent('Делюсь своей реферальной ссылкой')}`);

  // ── Caption / welcome text ────────────────────────────
  const caption =
    `<b>Добро пожаловать в 💧 yumoff.</b>\n\n` +
    `Мы обеспечиваем стабильный, безопасный и свободный доступ к интернет‑ресурсам.\n` +
    `Готовы начать?`;

  // ── Try to send with banner photo ─────────────────────
  // Replace BANNER_URL with your actual hosted image URL
  // e.g. https://api.yumoff.site/banner.png (put banner.png in /var/www/mini-app/banner.png)
  // banner.svg is served from mini-app /public/banner.svg
  const BANNER_URL = config.MINI_APP_URL.replace(/\/$/, '') + '/banner.svg';

  try {
    await ctx.replyWithPhoto(BANNER_URL, {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch {
    // Fallback if photo unavailable — send text only
    await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
});

// ── /profile ───────────────────────────────────────────────
bot.command('profile', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('📱  Открыть кабинет', config.MINI_APP_URL);
  await ctx.reply('Открой личный кабинет:', { reply_markup: keyboard });
});

// ── /help ──────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  await ctx.reply(
    '🆘 <b>Помощь</b>\n\n' +
      '/start — Главное меню\n' +
      '/profile — Личный кабинет\n' +
      '/help — Помощь\n\n' +
      '📞 Поддержка: @yumoff_support',
    { parse_mode: 'HTML' }
  );
});

// ── Telegram Stars payments ────────────────────────────────

bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('message:successful_payment', async (ctx) => {
  const payment = ctx.message.successful_payment;
  if (!payment) return;

  // payload: topup_<txId>_<userId>
  const match = payment.invoice_payload.match(/^topup_(\d+)_(\d+)$/);
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

  const keyboard = new InlineKeyboard().webApp(
    '💳  Купить подписку',
    config.MINI_APP_URL
  );

  await ctx.reply(
    `✅ <b>Баланс пополнен!</b>\n\n` +
      `Зачислено: <b>${kopeks / 100} ₽</b>\n` +
      `Баланс: <b>${((user?.balanceKopeks ?? 0) / 100).toFixed(2)} ₽</b>`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
});

// ── Admin: /stats ──────────────────────────────────────────
bot.command('stats', async (ctx) => {
  if (!ctx.from || !adminIds.includes(ctx.from.id)) return;

  const [users, activeSubs, todayDeposits, totalRevenue] = await Promise.all([
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
    prisma.transaction.aggregate({
      where: { type: 'DEPOSIT', status: 'COMPLETED' },
      _sum: { amountKopeks: true },
    }),
  ]);

  await ctx.reply(
    `📊 <b>Статистика YumOff VPN</b>\n\n` +
      `👥 Пользователей: <b>${users}</b>\n` +
      `✅ Активных подписок: <b>${activeSubs}</b>\n` +
      `💰 Доход сегодня: <b>${((todayDeposits._sum.amountKopeks ?? 0) / 100).toFixed(2)} ₽</b>\n` +
      `💎 Всего доходов: <b>${((totalRevenue._sum.amountKopeks ?? 0) / 100).toFixed(2)} ₽</b>`,
    { parse_mode: 'HTML' }
  );
});

// ── Admin: /broadcast ──────────────────────────────────────
bot.command('broadcast', async (ctx) => {
  if (!ctx.from || !adminIds.includes(ctx.from.id)) return;
  const text = ctx.match;
  if (!text) {
    await ctx.reply('Использование: /broadcast <текст>');
    return;
  }

  const users = await prisma.user.findMany({
    where: { telegramId: { not: null }, status: 'ACTIVE' },
    select: { telegramId: true },
  });

  let sent = 0, failed = 0;
  for (const u of users) {
    if (!u.telegramId) continue;
    try {
      await bot.api.sendMessage(Number(u.telegramId), text, { parse_mode: 'HTML' });
      sent++;
      // Small delay to avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      failed++;
    }
  }

  await ctx.reply(`📨 Рассылка завершена\n✅ Отправлено: ${sent}\n❌ Ошибок: ${failed}`);
});

// ── Webhook registration ───────────────────────────────────

export function registerBotWebhook(app: FastifyInstance) {
  app.post('/webhook/bot', {
    handler: webhookCallback(bot, 'fastify'),
  });
}

export async function setupWebhook(): Promise<void> {
  const webhookUrl = `${config.API_URL}/webhook/bot`;
  await bot.api.setWebhook(webhookUrl, {
    secret_token: config.BOT_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
  });
  console.log(`✅ Webhook set → ${webhookUrl}`);
}
