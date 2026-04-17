"""
Database helpers — thin asyncpg wrappers.
The Python bot only touches tables it owns; full schema managed by Prisma.
"""
from __future__ import annotations

import asyncpg
import secrets
import config as cfg

_pool: asyncpg.Pool | None = None


async def create_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(cfg.DATABASE_URL, min_size=2, max_size=10)


async def close_pool() -> None:
    if _pool:
        await _pool.close()


def pool() -> asyncpg.Pool:
    assert _pool is not None, "DB pool not initialised"
    return _pool


# ── Users ──────────────────────────────────────────────────

async def get_user_by_telegram_id(tg_id: int) -> asyncpg.Record | None:
    return await pool().fetchrow(
        'SELECT * FROM "User" WHERE "telegramId" = $1', tg_id
    )


async def create_user(
    tg_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
    language_code: str | None,
    is_admin: bool,
    referred_by_id: int | None,
) -> asyncpg.Record:
    referral_code = secrets.token_urlsafe(12)
    now = "NOW()"
    return await pool().fetchrow(
        '''
        INSERT INTO "User" (
            "telegramId", "username", "firstName", "lastName",
            "languageCode", "isAdmin", "referralCode",
            "referredById", "trialActivated", "balanceKopeks",
            "status", "createdAt", "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            false, 0, 'ACTIVE', NOW(), NOW()
        )
        RETURNING *
        ''',
        tg_id, username, first_name, last_name,
        language_code or "ru", is_admin, referral_code, referred_by_id,
    )


async def update_user_names(
    user_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
) -> None:
    await pool().execute(
        '''
        UPDATE "User"
        SET "username"  = COALESCE($2, "username"),
            "firstName" = COALESCE($3, "firstName"),
            "lastName"  = COALESCE($4, "lastName"),
            "updatedAt" = NOW()
        WHERE id = $1
        ''',
        user_id, username, first_name, last_name,
    )


async def get_user_by_referral_code(code: str) -> asyncpg.Record | None:
    return await pool().fetchrow(
        'SELECT * FROM "User" WHERE "referralCode" = $1', code
    )


# ── Stars payments ─────────────────────────────────────────

async def get_pending_transaction(tx_id: int, user_id: int) -> asyncpg.Record | None:
    return await pool().fetchrow(
        'SELECT * FROM "Transaction" WHERE id = $1 AND "userId" = $2 AND status = \'PENDING\'',
        tx_id, user_id,
    )


async def complete_stars_payment(
    tx_id: int,
    user_id: int,
    telegram_charge_id: str,
    stars: int,
    kopeks: int,
) -> None:
    async with pool().acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                '''
                UPDATE "Transaction"
                SET status = 'COMPLETED',
                    "paymentId" = $1,
                    "starsAmount" = $2,
                    "amountKopeks" = $3,
                    "updatedAt" = NOW()
                WHERE id = $4
                ''',
                telegram_charge_id, stars, kopeks, tx_id,
            )
            await conn.execute(
                '''
                UPDATE "User"
                SET "balanceKopeks" = "balanceKopeks" + $1,
                    "updatedAt" = NOW()
                WHERE id = $2
                ''',
                kopeks, user_id,
            )


async def get_user_balance(user_id: int) -> int:
    row = await pool().fetchrow(
        'SELECT "balanceKopeks" FROM "User" WHERE id = $1', user_id
    )
    return row["balanceKopeks"] if row else 0


# ── Admin stats ────────────────────────────────────────────

async def get_stats() -> dict:
    async with pool().acquire() as conn:
        users = await conn.fetchval('SELECT COUNT(*) FROM "User"')
        active_subs = await conn.fetchval(
            'SELECT COUNT(*) FROM "Subscription" WHERE status = \'ACTIVE\''
        )
        today_revenue = await conn.fetchval(
            '''
            SELECT COALESCE(SUM("amountKopeks"), 0) FROM "Transaction"
            WHERE type = 'DEPOSIT' AND status = 'COMPLETED'
              AND "createdAt" >= CURRENT_DATE
            '''
        )
        total_revenue = await conn.fetchval(
            '''
            SELECT COALESCE(SUM("amountKopeks"), 0) FROM "Transaction"
            WHERE type = 'DEPOSIT' AND status = 'COMPLETED'
            '''
        )
    return {
        "users": users,
        "active_subs": active_subs,
        "today_revenue": today_revenue,
        "total_revenue": total_revenue,
    }


async def get_all_active_telegram_ids() -> list[int]:
    rows = await pool().fetch(
        'SELECT "telegramId" FROM "User" WHERE "telegramId" IS NOT NULL AND status = \'ACTIVE\''
    )
    return [int(r["telegramId"]) for r in rows]
