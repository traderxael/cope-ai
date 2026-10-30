import { describe, expect, it } from 'vitest';
import {
  AppError,
  abortError,
  describeError,
  isAbortError,
  providerStatusError,
} from './errors';

describe('providerStatusError', () => {
  it('traduce estados del proveedor sin filtrar detalles', () => {
    expect(providerStatusError(401, false).code).toBe('provider_auth');
    expect(providerStatusError(404, false).code).toBe('provider_model');
    expect(providerStatusError(400, true).code).toBe('vision_unsupported');
    expect(providerStatusError(422, true).code).toBe('vision_unsupported');
    expect(providerStatusError(400, false).code).toBe('provider_rejected');
    expect(providerStatusError(422, false).status).toBe(422);
    expect(providerStatusError(429, false).status).toBe(429);
    expect(providerStatusError(500, false).code).toBe('provider_error');
    expect(providerStatusError(402, false)).toMatchObject({
      status: 429,
      code: 'free_ai_limit',
    });
    expect(providerStatusError(402, false, 26).message).toContain('26 s');
  });

  it('no incluye cuerpos ni claves en los mensajes', () => {
    const error = providerStatusError(401, false);
    expect(error.message).not.toContain('Bearer');
    expect(error.message).not.toContain('sk-');
  });
});

describe('describeError', () => {
  it('respeta AppError y detecta abortos', () => {
    expect(describeError(new AppError(413, 'too_big', 'Grande'))).toEqual({
      status: 413,
      code: 'too_big',
      message: 'Grande',
    });
    expect(describeError(abortError()).code).toBe('request_aborted');
    expect(isAbortError(abortError())).toBe(true);
  });

  it('oculta detalles de errores desconocidos', () => {
    const description = describeError(
      new Error('La clave sk-secreta falló en https://api.example'),
    );
    expect(description).toEqual({
      status: 500,
      code: 'internal_error',
      message: 'Algo salió mal. Probá de nuevo.',
    });
    expect(JSON.stringify(description)).not.toContain('sk-secreta');
  });
});
