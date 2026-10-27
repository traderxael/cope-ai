import type { IncomingMessage, ServerResponse } from 'node:http';
import { LIMITS } from '../../shared/limits.js';
import { encodeSseEvent } from '../../shared/sse.js';
import { AppError, describeError, logError, type ErrorDescription } from '../errors.js';
import { getClientIp } from '../security.js';
import type { ChatSuccess } from '../routes/chat.js';

const HEARTBEAT_MS = 15_000;

export interface RequestMeta {
  ip: string;
  origin: string | null;
  host: string | null;
  ownerCode: string | null;
}

function headersFor(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else if (typeof value === 'string') headers.set(key, value);
  }
  return headers;
}

export function requestMeta(request: IncomingMessage): RequestMeta {
  const headers = headersFor(request);
  return {
    ip: getClientIp(headers),
    origin: headers.get('origin'),
    host: headers.get('host') ?? headers.get('x-forwarded-host'),
    ownerCode: headers.get('x-cope-owner'),
  };
}

export async function readJsonBody(
  request: IncomingMessage,
  maxBytes: number = LIMITS.maxBodyBytes,
): Promise<unknown> {
  const rawContentType = request.headers['content-type'];
  const contentType = Array.isArray(rawContentType)
    ? rawContentType[0]
    : rawContentType;
  if (
    !contentType ||
    !contentType.split(';')[0]?.trim().toLowerCase().includes('application/json')
  ) {
    throw new AppError(
      415,
      'unsupported_media_type',
      'Enviá el cuerpo como application/json.',
    );
  }

  const rawDeclaredLength = request.headers['content-length'];
  const declaredLength = Array.isArray(rawDeclaredLength)
    ? rawDeclaredLength[0]
    : rawDeclaredLength;
  if (declaredLength) {
    const length = Number.parseInt(declaredLength, 10);
    if (!Number.isFinite(length) || length < 0) {
      throw new AppError(400, 'invalid_length', 'El tamaño del cuerpo no es válido.');
    }
    if (length > maxBytes) {
      throw new AppError(
        413,
        'payload_too_large',
        'La solicitud es demasiado grande.',
      );
    }
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new AppError(
        413,
        'payload_too_large',
        'La solicitud es demasiado grande.',
      );
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(400, 'invalid_json', 'El JSON de la solicitud no es válido.');
  }
}

export async function readRawBody(
  request: IncomingMessage,
  maxBytes: number,
  contentTypePrefix: string,
): Promise<Buffer> {
  const rawContentType = request.headers['content-type'];
  const contentType = Array.isArray(rawContentType)
    ? rawContentType[0]
    : rawContentType;
  if (
    !contentType ||
    !contentType
      .split(';')[0]
      ?.trim()
      .toLowerCase()
      .startsWith(contentTypePrefix.toLowerCase())
  ) {
    throw new AppError(
      415,
      'unsupported_media_type',
      `Enviá el archivo como ${contentTypePrefix}.`,
    );
  }

  const rawDeclaredLength = request.headers['content-length'];
  const declaredLength = Array.isArray(rawDeclaredLength)
    ? rawDeclaredLength[0]
    : rawDeclaredLength;
  if (declaredLength) {
    const length = Number.parseInt(declaredLength, 10);
    if (!Number.isFinite(length) || length < 0) {
      throw new AppError(400, 'invalid_length', 'El tamaño del cuerpo no es válido.');
    }
    if (length > maxBytes) {
      throw new AppError(413, 'payload_too_large', 'La muestra es demasiado grande.');
    }
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new AppError(413, 'payload_too_large', 'La muestra es demasiado grande.');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function sendAudio(
  response: ServerResponse,
  audio: Buffer,
  contentType = 'audio/mpeg',
): boolean {
  if (response.headersSent || response.destroyed) return false;
  response.statusCode = 200;
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Length', String(audio.length));
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(audio);
  return true;
}

export function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): boolean {
  if (response.headersSent || response.destroyed) return false;
  const body = JSON.stringify(payload);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(body);
  return true;
}

export function sendSseHeaders(response: ServerResponse): void {
  if (response.headersSent) return;
  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.flushHeaders();
}

function writeEvent(
  response: ServerResponse,
  event: string,
  data: unknown,
): void {
  if (response.destroyed || response.writableEnded) return;
  response.write(encodeSseEvent(event, data));
}

export function sendSseError(
  response: ServerResponse,
  failure: ErrorDescription,
): void {
  if (response.headersSent) {
    writeEvent(response, 'error', {
      code: failure.code,
      message: failure.message,
    });
    if (!response.writableEnded) response.end();
    return;
  }
  sendJson(response, failure.status, {
    error: { code: failure.code, message: failure.message },
  });
}

export async function pipeChat(
  response: ServerResponse,
  result: ChatSuccess,
  signal: AbortSignal,
): Promise<void> {
  sendSseHeaders(response);
  const heartbeat = setInterval(() => {
    if (!response.destroyed && !response.writableEnded) {
      response.write(': ping\n\n');
    }
  }, HEARTBEAT_MS);

  try {
    for await (const text of result.stream) {
      if (signal.aborted) return;
      writeEvent(response, 'delta', { text });
    }
    if (!signal.aborted) {
      writeEvent(response, 'done', { demo: result.demo });
    }
  } catch (error) {
    if (!signal.aborted) {
      logError(error);
      sendSseError(response, describeError(error));
    }
  } finally {
    clearInterval(heartbeat);
    if (!response.destroyed && !response.writableEnded) response.end();
  }
}
