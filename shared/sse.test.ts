import { describe, expect, it } from 'vitest';
import { encodeSseEvent, parseSseStream, type SseEvent } from './sse';

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const event of parseSseStream(stream)) events.push(event);
  return events;
}

const encoder = new TextEncoder();

describe('encodeSseEvent', () => {
  it('serializa evento y datos JSON', () => {
    expect(encodeSseEvent('delta', { text: 'hola' })).toBe(
      'event: delta\ndata: {"text":"hola"}\n\n',
    );
  });
});

describe('parseSseStream', () => {
  it('parsea un evento simple', async () => {
    const events = await collect(
      streamFromChunks([encoder.encode('event: delta\ndata: hola\n\n')]),
    );
    expect(events).toEqual([{ event: 'delta', data: 'hola' }]);
  });

  it('une varias líneas data y conserva comentarios fuera', async () => {
    const events = await collect(
      streamFromChunks([
        encoder.encode(': ping\nevent: x\ndata: a\ndata: b\n\n'),
      ]),
    );
    expect(events).toEqual([{ event: 'x', data: 'a\nb' }]);
  });

  it('soporta CRLF', async () => {
    const events = await collect(
      streamFromChunks([
        encoder.encode('event: delta\r\ndata: uno\r\n\r\ndata: dos\r\n\r\n'),
      ]),
    );
    expect(events).toEqual([
      { event: 'delta', data: 'uno' },
      { event: 'message', data: 'dos' },
    ]);
  });

  it('parsea un bloque final sin línea en blanco', async () => {
    const events = await collect(
      streamFromChunks([encoder.encode('event: done\ndata: {"demo":true}')]),
    );
    expect(events).toEqual([{ event: 'done', data: '{"demo":true}' }]);
  });

  it('interpreta [DONE] como dato', async () => {
    const events = await collect(
      streamFromChunks([encoder.encode('data: [DONE]\n\n')]),
    );
    expect(events).toEqual([{ event: 'message', data: '[DONE]' }]);
  });

  it('sobrevive a cortes en cada límite de bytes, incluido UTF-8', async () => {
    const raw = 'event: delta\ndata: hola 🌟\n\n';
    const bytes = encoder.encode(raw);
    for (let cut = 1; cut < bytes.length; cut += 1) {
      const events = await collect(
        streamFromChunks([bytes.slice(0, cut), bytes.slice(cut)]),
      );
      expect(events).toEqual([{ event: 'delta', data: 'hola 🌟' }]);
    }
  });
});
