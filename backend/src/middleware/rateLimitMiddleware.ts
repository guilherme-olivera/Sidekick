import { Request, Response, NextFunction } from "express";

interface RateRecord {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateRecord>();

// Limpeza periódica para evitar crescimento de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of buckets.entries()) {
    if (now > record.resetAt) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const userPart = (req as any).userId || (req.body?.email ? String(req.body.email).toLowerCase().trim() : "");
    const key = `${options.keyPrefix}:${ip}:${userPart}`;
    const now = Date.now();

    const current = buckets.get(key);
    if (!current || now > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (current.count >= options.max) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: options.message || `Muitas tentativas. Aguarde ${retryAfterSec}s e tente novamente.`,
      });
    }

    current.count += 1;
    next();
  };
}

