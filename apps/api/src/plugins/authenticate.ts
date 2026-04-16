import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyJwt } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: number;
  }
}

export default fp(async function (app: FastifyInstance) {
  app.decorate(
    'authenticate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      try {
        const payload = verifyJwt(auth.slice(7));
        if (payload.type !== 'access') throw new Error('Not an access token');
        req.userId = payload.sub;
      } catch {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { status: true },
      });
      if (!user || user.status === 'BLOCKED') {
        return reply.status(403).send({ error: 'Account blocked' });
      }
    }
  );
});
