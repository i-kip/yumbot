from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import db
import config as cfg

router = Router()


def _build_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🌐  Открыть приложение",
            web_app=WebAppInfo(url=cfg.MINI_APP_URL),
        )
    ]])


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    tg = message.from_user
    if not tg:
        return

    start_param: str = message.text.split(maxsplit=1)[1] if message.text and " " in message.text else ""

    # Find or create user
    user = await db.get_user_by_telegram_id(tg.id)

    if not user:
        referred_by_id = None
        if start_param:
            ref = await db.get_user_by_referral_code(start_param)
            if ref and ref["telegramId"] != tg.id:
                referred_by_id = ref["id"]

        user = await db.create_user(
            tg_id=tg.id,
            username=tg.username,
            first_name=tg.first_name,
            last_name=tg.last_name,
            language_code=tg.language_code,
            is_admin=tg.id in cfg.ADMIN_IDS,
            referred_by_id=referred_by_id,
        )
    else:
        await db.update_user_names(
            user_id=user["id"],
            username=tg.username,
            first_name=tg.first_name,
            last_name=tg.last_name,
        )

    caption = (
        "<b>Добро пожаловать в 💧 yumoff.</b>\n\n"
        "Мы обеспечиваем стабильный, безопасный и свободный доступ к интернет‑ресурсам.\n"
        "Готовы начать?"
    )

    keyboard = _build_keyboard()

    # Try to send with banner image, fall back to text
    banner_url = cfg.MINI_APP_URL.rstrip("/") + "/banner.png"
    try:
        await message.answer_photo(
            photo=banner_url,
            caption=caption,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    except Exception:
        await message.answer(caption, parse_mode="HTML", reply_markup=keyboard)


@router.message(lambda m: m.text and m.text.startswith("/profile"))
async def cmd_profile(message: Message) -> None:
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="📱  Открыть кабинет",
            web_app=WebAppInfo(url=cfg.MINI_APP_URL),
        )
    ]])
    await message.answer("Открой личный кабинет:", reply_markup=keyboard)


@router.message(lambda m: m.text and m.text.startswith("/help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "🆘 <b>Помощь</b>\n\n"
        "/start — Главное меню\n"
        "/profile — Личный кабинет\n"
        "/help — Помощь\n\n"
        "📞 Поддержка: @yumoff_support",
        parse_mode="HTML",
    )
