import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      adminId?: number;
      isDriver?: boolean;
    }
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (payload.type !== 'user') return res.status(403).json({ error: 'Forbidden' });
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (payload.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function signUserToken(userId: number): string {
  return jwt.sign({ type: 'user', userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);
}

export function signAdminToken(adminId: number): string {
  return jwt.sign({ type: 'admin', adminId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);
}

export function requireDriver(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (payload.type !== 'driver' && payload.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.isDriver = true;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function signDriverToken(): string {
  return jwt.sign({ type: 'driver' }, env.JWT_SECRET, { expiresIn: '12h' });
}
