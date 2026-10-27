// @vitest-environment node

import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { readJsonBody, requestMeta } from './node';

function makeRequest(
  body: string,
  headers: Record<string, string> = {
    'content-type': 'application/json',
  },
): IncomingMessage {
  const stream = Readable.from([Buffer.from(body, 'utf8')]);
  Object.assign(stream, { headers });
  return stream as unknown as IncomingMessage;
}

describe('readJsonBody', () => {
  it('lee JSON válido', async () => {
    await expect(readJsonBody(makeRequest('{"hola":1}'))).resolves.toEqual({
      hola: 1,
    });
  });

  it('exige content-type JSON', async () => {
    await expect(
      readJsonBody(makeRequest('{}', { 'content-type': 'text/plain' })),
    ).rejects.toMatchObject({ status: 415, code: 'unsupported_media_type' });
  });

  it('rechaza por content-length declarado', async () => {
    await expect(
      readJsonBody(
        makeRequest('{"hola":1}', {
          'content-type': 'application/json',
          'content-length': '9999',
        }),
        10,
      ),
    ).rejects.toMatchObject({ status: 413, code: 'payload_too_large' });
  });

  it('rechaza por bytes reales', async () => {
    await expect(
      readJsonBody(makeRequest('{"hola":"suficientemente largo"}'), 5),
    ).rejects.toMatchObject({ status: 413, code: 'payload_too_large' });
  });

  it('rechaza JSON inválido', async () => {
    await expect(readJsonBody(makeRequest('{ roto }'))).rejects.toMatchObject({
      status: 400,
      code: 'invalid_json',
    });
  });
});

describe('requestMeta', () => {
  it('extrae IP, origen y host', () => {
    const request = makeRequest('', {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.8, 10.0.0.2',
      origin: 'https://cope.app',
      host: 'cope.app',
    });
    expect(requestMeta(request)).toEqual({
      ip: '198.51.100.8',
      origin: 'https://cope.app',
      host: 'cope.app',
      ownerCode: null,
    });
  });

  it('lee el código de propietario', () => {
    const request = makeRequest('', {
      'x-cope-owner': 'secreto',
    });
    expect(requestMeta(request).ownerCode).toBe('secreto');
  });

  it('usa x-forwarded-host si falta host', () => {
    const request = makeRequest('', {
      'content-type': 'application/json',
      'x-forwarded-host': 'preview.cope.app',
    });
    expect(requestMeta(request).host).toBe('preview.cope.app');
  });
});
