import { parseSseStream } from '../../shared/sse';
import { quizResponseSchema } from '../../shared/schemas/quiz';
import type {
  ChatRequest,
  QuizRequest,
  QuizResponse,
} from '../../shared/types';
import { isAbortError } from './errors';

export interface HealthResponse {
  ok: boolean;
  demo: boolean;
  configured: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as {
      error?: { code?: unknown; message?: unknown };
    };
    const code =
      typeof payload.error?.code === 'string'
        ? payload.error.code
        : 'http_error';
    const message =
      typeof payload.error?.message === 'string'
        ? payload.error.message
        : `La solicitud falló (${response.status}).`;
    return new ApiError(response.status, code, message);
  } catch {
    return new ApiError(
      response.status,
      'http_error',
      `La solicitud falló (${response.status}).`,
    );
  }
}

function parsePayload(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiError(
      502,
      'invalid_stream',
      'La respuesta del servidor llegó incompleta.',
    );
  }
}

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw await readError(response);
  const payload = (await response.json()) as Partial<HealthResponse>;
  return {
    ok: payload.ok === true,
    demo: payload.demo === true,
    configured: payload.configured === true,
  };
}

export async function streamChat(
  request: ChatRequest,
  options: {
    signal?: AbortSignal;
    onDelta: (text: string) => void;
  },
): Promise<{ demo: boolean }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    cache: 'no-store',
    signal: options.signal,
  });

  if (!response.ok) throw await readError(response);
  if (!response.body) {
    throw new ApiError(
      502,
      'empty_stream',
      'El servidor no devolvió una respuesta.',
    );
  }

  let demo = false;
  let finished = false;

  for await (const event of parseSseStream(response.body)) {
    if (event.event === 'delta') {
      const payload = parsePayload(event.data);
      if (typeof payload.text === 'string') options.onDelta(payload.text);
      continue;
    }

    if (event.event === 'done') {
      const payload = parsePayload(event.data);
      demo = payload.demo === true;
      finished = true;
      continue;
    }

    if (event.event === 'error') {
      const payload = parsePayload(event.data);
      const code =
        typeof payload.code === 'string' ? payload.code : 'stream_error';
      const message =
        typeof payload.message === 'string'
          ? payload.message
          : 'La respuesta se interrumpió.';
      const status =
        code === 'rate_limited'
          ? 429
          : code === 'vision_unsupported'
            ? 422
            : 502;
      throw new ApiError(status, code, message);
    }
  }

  if (!finished && !options.signal?.aborted) {
    throw new ApiError(
      502,
      'stream_incomplete',
      'La respuesta se cortó antes de terminar. Probá de nuevo.',
    );
  }

  return { demo };
}

export async function requestQuiz(
  request: QuizRequest,
  signal?: AbortSignal,
): Promise<QuizResponse> {
  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
    cache: 'no-store',
    signal,
  });

  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      502,
      'invalid_quiz',
      'La práctica llegó en un formato inválido.',
    );
  }

  const parsed = quizResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      502,
      'invalid_quiz',
      'La práctica llegó en un formato inválido.',
    );
  }
  return parsed.data;
}

export { isAbortError };
