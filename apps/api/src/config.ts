import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  BOT_TOKEN: z.string().min(1),
  BOT_WEBHOOK_SECRET: z.string().min(16),
  MINI_APP_URL: z.string().url().default('https://miniy.yumoff.site'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  REMNAWAVE_URL: z.string().url(),
  REMNAWAVE_TOKEN: z.string().min(1),
  REMNAWAVE_DEFAULT_TRAFFIC_GB: z.coerce.number().default(100),
  REMNAWAVE_DEFAULT_DAYS: z.coerce.number().default(30),
  REMNAWAVE_DEFAULT_DEVICE_LIMIT: z.coerce.number().default(5),
  REMNAWAVE_SQUAD_UUID: z.string().optional(),

  STARS_RATE_KOPEKS: z.coerce.number().default(200),

  API_URL: z.string().url().default('https://api.yumoff.site'),
  MINI_APP_DOMAIN: z.string().default('miniy.yumoff.site'),
  WEB_DOMAIN: z.string().default('lk.yumoff.site'),

  ADMIN_IDS: z.string().default(''),

  REFERRAL_PERCENT: z.coerce.number().default(40),
});

type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const [key, errors] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${(errors as string[]).join(', ')}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

export const adminIds = config.ADMIN_IDS.split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));
