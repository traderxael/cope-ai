export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseEventBlock(raw: string): SseEvent | null {
  const lines = raw.split(/\r?\n/);
  let event = 'message';
  let id: string | undefined;
  const data: string[] = [];

  for (const line of lines) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value || 'message';
    else if (field === 'data') data.push(value);
    else if (field === 'id') id = value;
  }

  if (data.length === 0) return null;
  const parsed: SseEvent = { event, data: data.join('\n') };
  if (id !== undefined) parsed.id = id;
  return parsed;
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const drain = function* (flush: boolean): Generator<SseEvent> {
    while (true) {
      const boundary = /\r?\n\r?\n/.exec(buffer);
      if (!boundary) break;
      const raw = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      const event = parseEventBlock(raw);
      if (event) yield event;
    }
    if (flush) {
      const raw = buffer.trim();
      buffer = '';
      if (raw) {
        const event = parseEventBlock(raw);
        if (event) yield event;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drain(false);
    }
    buffer += decoder.decode();
    yield* drain(true);
  } finally {
    reader.releaseLock();
  }
}
