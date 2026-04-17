import os
from dotenv import load_dotenv

load_dotenv()

def _int_list(val: str) -> list[int]:
    return [int(x.strip()) for x in val.split(",") if x.strip().isdigit()]

BOT_TOKEN: str = os.environ["BOT_TOKEN"]
BOT_WEBHOOK_SECRET: str = os.environ["BOT_WEBHOOK_SECRET"]

# asyncpg wants postgresql:// — strip Prisma-specific params
_raw_url = os.environ["DATABASE_URL"]
DATABASE_URL: str = _raw_url.split("?")[0].replace("postgresql://", "postgresql://")

API_URL: str = os.environ.get("API_URL", "https://api.yumoff.site")
MINI_APP_URL: str = os.environ.get("MINI_APP_URL", "https://miniy.yumoff.site")
ADMIN_IDS: list[int] = _int_list(os.environ.get("ADMIN_IDS", ""))
STARS_RATE_KOPEKS: int = int(os.environ.get("STARS_RATE_KOPEKS", "200"))
REFERRAL_PERCENT: int = int(os.environ.get("REFERRAL_PERCENT", "40"))
