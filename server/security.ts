export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, number[]>();

  check(
    key: string,
    limit: number,
    windowMs = 60_000,
    now = Date.now(),
  ): RateLimitResult {
    const hits = (this.buckets.get(key) ?? []).filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (hits.length >= limit) {
      const oldest = hits[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((windowMs - (now - oldest)) / 1000),
        ),
      };
    }

    hits.push(now);
    this.buckets.set(key, hits);
    if (this.buckets.size > 5_000) this.prune(now, windowMs);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset(): void {
    this.buckets.clear();
  }

  private prune(now: number, windowMs: number): void {
    for (const [key, hits] of this.buckets) {
      if (hits.every((timestamp) => now - timestamp >= windowMs)) {
        this.buckets.delete(key);
      }
    }
  }
}

export const defaultLimiter = new RateLimiter();

export function checkOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function getClientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unknown';
}
