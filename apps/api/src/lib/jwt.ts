import { createHmac, randomBytes } from 'crypto';
import { config } from '../config.js';

export interface JwtPayload {
  sub: number;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function base64url(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function parseBase64url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${s}`);
  const n = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (multipliers[unit] ?? 1);
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + parseDuration(expiresIn) };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(full));
  const sig = createHmac('sha256', config.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, sig] = parts as [string, string, string];
  const expected = createHmac('sha256', config.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (sig !== expected) throw new Error('Invalid signature');
  const payload: JwtPayload = JSON.parse(parseBase64url(body));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export function generateAccessToken(userId: number): string {
  return signJwt({ sub: userId, type: 'access' }, config.JWT_ACCESS_EXPIRES);
}
