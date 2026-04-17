import asyncio
from aiogram import Router, Bot
from aiogram.filters import Command
from aiogram.types import Message
import db
import config as cfg

router = Router()


def _is_admin(user_id: int) -> bool:
    return user_id in cfg.ADMIN_IDS


@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    if not message.from_user or not _is_admin(message.from_user.id):
        return

    s = await db.get_stats()
    await message.answer(
        f"📊 <b>Статистика YumOff VPN</b>\n\n"
        f"👥 Пользователей: <b>{s['users']}</b>\n"
        f"✅ Активных подписок: <b>{s['active_subs']}</b>\n"
        f"💰 Доход сегодня: <b>{s['today_revenue'] / 100:.2f} ₽</b>\n"
        f"💎 Всего доходов: <b>{s['total_revenue'] / 100:.2f} ₽</b>",
        parse_mode="HTML",
    )


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, bot: Bot) -> None:
    if not message.from_user or not _is_admin(message.from_user.id):
        return

    text = message.text or ""
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Использование: /broadcast <текст>")
        return

    broadcast_text = parts[1]
    tg_ids = await db.get_all_active_telegram_ids()

    sent = failed = 0
    for tg_id in tg_ids:
        try:
            await bot.send_message(tg_id, broadcast_text, parse_mode="HTML")
            sent += 1
        except Exception:
            failed += 1
        await asyncio.sleep(0.05)  # ~20 msg/sec to avoid Telegram limits

    await message.answer(
        f"📨 Рассылка завершена\n✅ Отправлено: {sent}\n❌ Ошибок: {failed}"
    )
