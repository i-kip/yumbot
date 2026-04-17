"""
YumOff VPN — Telegram bot (Python / aiogram 3)
Webhook server on port 8080, nginx proxies /webhook/bot here.
"""
import asyncio
import logging
from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

import config as cfg
import db
from handlers import start, payments, admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

WEBHOOK_PATH = "/webhook/bot"
WEBHOOK_HOST = "0.0.0.0"
WEBHOOK_PORT = 8080


async def on_startup(bot: Bot) -> None:
    await db.create_pool()
    webhook_url = f"{cfg.API_URL}{WEBHOOK_PATH}"
    await bot.set_webhook(
        url=webhook_url,
        secret_token=cfg.BOT_WEBHOOK_SECRET,
        allowed_updates=["message", "callback_query", "pre_checkout_query"],
    )
    log.info("✅ Webhook set → %s", webhook_url)


async def on_shutdown(bot: Bot) -> None:
    await db.close_pool()
    await bot.delete_webhook()


def main() -> None:
    bot = Bot(
        token=cfg.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher()

    # Register routers
    dp.include_router(start.router)
    dp.include_router(payments.router)
    dp.include_router(admin.router)

    # Lifecycle hooks
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    # aiohttp web app for webhook
    app = web.Application()

    SimpleRequestHandler(
        dispatcher=dp,
        bot=bot,
        secret_token=cfg.BOT_WEBHOOK_SECRET,
    ).register(app, path=WEBHOOK_PATH)

    setup_application(app, dp, bot=bot)

    web.run_app(app, host=WEBHOOK_HOST, port=WEBHOOK_PORT)


if __name__ == "__main__":
    main()
