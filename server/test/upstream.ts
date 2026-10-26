import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface UpstreamRecord {
  method: string | undefined;
  url: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody: string;
}

export type UpstreamHandler = (
  record: UpstreamRecord,
  response: ServerResponse,
) => void | Promise<void>;

export interface FakeUpstream {
  baseUrl: string;
  requests: UpstreamRecord[];
  close: () => Promise<void>;
}

export async function startFakeUpstream(
  handler: UpstreamHandler,
): Promise<FakeUpstream> {
  const requests: UpstreamRecord[] = [];
  const server = createServer((request, response) => {
    let rawBody = '';
    request.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString('utf8');
    });
    request.on('end', () => {
      let body: unknown;
      try {
        body = JSON.parse(rawBody) as unknown;
      } catch {
        body = null;
      }
      const record: UpstreamRecord = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
        rawBody,
      };
      requests.push(record);
      void Promise.resolve(handler(record, response)).catch(() => {
        if (!response.headersSent) response.statusCode = 500;
        response.end();
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    requests,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export function openSse(response: ServerResponse): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
}

export function sendSseData(
  response: ServerResponse,
  payload: unknown,
): void {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function sendSseRaw(response: ServerResponse, raw: string): void {
  response.write(raw);
}

export function finishSse(response: ServerResponse): void {
  response.write('data: [DONE]\n\n');
  response.end();
}

export function sendJsonUpstream(
  response: ServerResponse,
  payload: unknown,
  status = 200,
): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}
