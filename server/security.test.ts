import { describe, expect, it } from 'vitest';
import { checkOrigin, getClientIp, RateLimiter } from './security';

describe('RateLimiter', () => {
  it('permite hasta el límite y luego bloquea', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('ip', 2, 60_000, 1_000).allowed).toBe(true);
    expect(limiter.check('ip', 2, 60_000, 2_000).allowed).toBe(true);
    const blocked = limiter.check('ip', 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('se reinicia al pasar la ventana', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('ip', 1, 10_000, 1_000).allowed).toBe(true);
    expect(limiter.check('ip', 1, 10_000, 2_000).allowed).toBe(false);
    expect(limiter.check('ip', 1, 10_000, 12_000).allowed).toBe(true);
  });

  it('separa claves y se puede vaciar', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('a', 1).allowed).toBe(true);
    expect(limiter.check('b', 1).allowed).toBe(true);
    limiter.reset();
    expect(limiter.check('a', 1).allowed).toBe(true);
  });
});

describe('checkOrigin', () => {
  it('acepta sin Origin y el mismo host', () => {
    expect(checkOrigin(null, 'cope.app')).toBe(true);
    expect(checkOrigin('https://cope.app', 'cope.app')).toBe(true);
    expect(checkOrigin('http://localhost:5173', 'localhost:5173')).toBe(true);
  });

  it('rechaza orígenes distintos, inválidos o sin host', () => {
    expect(checkOrigin('https://otro.app', 'cope.app')).toBe(false);
    expect(checkOrigin('no-es-url', 'cope.app')).toBe(false);
    expect(checkOrigin('https://cope.app', null)).toBe(false);
  });
});

describe('getClientIp', () => {
  it('prioriza x-real-ip y usa el primer x-forwarded-for', () => {
    expect(
      getClientIp(
        new Headers({
          'x-real-ip': '203.0.113.7',
          'x-forwarded-for': '198.51.100.1, 10.0.0.1',
        }),
      ),
    ).toBe('203.0.113.7');
    expect(
      getClientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })),
    ).toBe('198.51.100.1');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
