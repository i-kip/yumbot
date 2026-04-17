import re
from aiogram import Router, F
from aiogram.types import PreCheckoutQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import db
import config as cfg

router = Router()


def stars_to_kopeks(stars: int) -> int:
    return stars * cfg.STARS_RATE_KOPEKS


@router.pre_checkout_query()
async def on_pre_checkout(query: PreCheckoutQuery) -> None:
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def on_successful_payment(message: Message) -> None:
    payment = message.successful_payment
    if not payment:
        return

    # payload: topup_<txId>_<userId>
    m = re.match(r"^topup_(\d+)_(\d+)$", payment.invoice_payload)
    if not m:
        return

    tx_id = int(m.group(1))
    user_id = int(m.group(2))
    stars = payment.total_amount
    kopeks = stars_to_kopeks(stars)

    tx = await db.get_pending_transaction(tx_id, user_id)
    if not tx:
        return

    await db.complete_stars_payment(
        tx_id=tx_id,
        user_id=user_id,
        telegram_charge_id=payment.telegram_payment_charge_id,
        stars=stars,
        kopeks=kopeks,
    )

    balance = await db.get_user_balance(user_id)

    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="💳  Купить подписку",
            web_app=WebAppInfo(url=cfg.MINI_APP_URL),
        )
    ]])

    await message.answer(
        f"✅ <b>Баланс пополнен!</b>\n\n"
        f"Зачислено: <b>{kopeks / 100:.2f} ₽</b>\n"
        f"Баланс: <b>{balance / 100:.2f} ₽</b>",
        parse_mode="HTML",
        reply_markup=keyboard,
    )
