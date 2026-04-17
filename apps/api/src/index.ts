import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import authenticate from './plugins/authenticate.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { subscriptionRoutes } from './routes/subscription.js';
import { balanceRoutes } from './routes/balance.js';
import { referralRoutes } from './routes/referral.js';
// Bot is now a separate Python service (apps/bot)

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  },
  trustProxy: true,
});

// Security
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

await app.register(cors, {
  origin: [
    'https://miniy.yumoff.site',
    'https://lk.yumoff.site',
    'https://api.yumoff.site',
    ...(config.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  skipOnError: true,
});

// Auth plugin
await app.register(authenticate);

// API routes
app.register(async (api) => {
  api.register(authRoutes);
  api.register(userRoutes);
  api.register(subscriptionRoutes);
  api.register(balanceRoutes);
  api.register(referralRoutes);
}, { prefix: '/api/v1' });

// Health check
app.get('/health', async () => ({ ok: true, ts: Date.now() }));

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
try {
  await app.listen({ port: config.PORT, host: config.HOST });
  console.log(`API running on http://${config.HOST}:${config.PORT}`);

  console.log('Bot webhook handled by Python service on port 8080');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
