import { parseSseStream } from '../../shared/sse';
import { quizResponseSchema } from '../../shared/schemas/quiz';
import {
  flashcardResponseSchema,
  studyPlanResponseSchema,
} from '../../shared/schemas/study';
import {
  oralExamResponseSchema,
  oralGradeResponseSchema,
  type OralExamConfig,
  type OralExamResponse,
  type OralGradeResponse,
  type OralQuestion,
} from '../../shared/schemas/oral-exam';
import type {
  ChatRequest,
  FlashcardRequest,
  FlashcardResponse,
  PersonalityConfig,
  QuizRequest,
  QuizResponse,
  StudyPlanRequest,
  StudyPlanResponse,
} from '../../shared/types';
import { isAbortError } from './errors';

export interface VoiceCapabilities {
  tts: boolean;
  clone: boolean;
}

export type AiProvider = 'openai' | 'ollama' | 'pollinations' | 'fixtures';

export interface HealthResponse {
  ok: boolean;
  demo: boolean;
  configured: boolean;
  provider: AiProvider;
  model: string | null;
  voice: VoiceCapabilities;
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
  const voice = payload.voice ?? { tts: false, clone: false };
  const provider: AiProvider =
    payload.provider === 'openai' ||
    payload.provider === 'ollama' ||
    payload.provider === 'fixtures'
      ? payload.provider
      : 'pollinations';
  return {
    ok: payload.ok === true,
    demo: payload.demo === true,
    configured: payload.configured === true,
    provider,
    model: typeof payload.model === 'string' ? payload.model : null,
    voice: {
      tts: voice.tts === true,
      clone: voice.clone === true,
    },
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
  if (!parsed.success || parsed.data.questions.length !== request.count) {
    throw new ApiError(
      502,
      'invalid_quiz',
      'La práctica llegó en un formato inválido.',
    );
  }
  return parsed.data;
}

export async function requestFlashcards(
  request: FlashcardRequest,
  signal?: AbortSignal,
): Promise<FlashcardResponse> {
  const response = await fetch('/api/flashcards', {
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
      'invalid_flashcards',
      'Las flashcards llegaron en un formato inválido.',
    );
  }

  const parsed = flashcardResponseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.cards.length !== request.count) {
    throw new ApiError(
      502,
      'invalid_flashcards',
      'Las flashcards llegaron en un formato inválido.',
    );
  }
  return parsed.data;
}

export async function requestStudyPlan(
  request: StudyPlanRequest,
  signal?: AbortSignal,
): Promise<StudyPlanResponse> {
  const response = await fetch('/api/study-plan', {
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
      'invalid_plan',
      'El plan de estudio llegó en un formato inválido.',
    );
  }

  const parsed = studyPlanResponseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.plan.days.length !== request.days) {
    throw new ApiError(
      502,
      'invalid_plan',
      'El plan de estudio llegó en un formato inválido.',
    );
  }
  return parsed.data;
}

async function postOralExam(
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch('/api/oral-exam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw await readError(response);
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      502,
      'invalid_oral_exam',
      'El examen oral llegó en un formato inválido.',
    );
  }
}

export async function requestOralExam(
  config: OralExamConfig,
  personality: PersonalityConfig,
  signal?: AbortSignal,
): Promise<OralExamResponse> {
  const payload = await postOralExam(
    { action: 'generate', config, personality },
    signal,
  );
  const parsed = oralExamResponseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.questions.length !== config.count) {
    throw new ApiError(
      502,
      'invalid_oral_exam',
      'El examen oral llegó en un formato inválido.',
    );
  }
  return parsed.data;
}

export async function cloneVoice(
  file: File,
  ownerCode: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/voice-clone', {
    method: 'POST',
    headers: {
      'Content-Type': 'audio/mpeg',
      'x-cope-owner': ownerCode,
    },
    body: file,
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw await readError(response);
  const payload = (await response.json().catch(() => null)) as {
    voiceId?: unknown;
  } | null;
  if (typeof payload?.voiceId !== 'string' || !payload.voiceId.trim()) {
    throw new ApiError(
      502,
      'invalid_voice',
      'El servicio devolvió una voz inválida.',
    );
  }
  return payload.voiceId.trim();
}

export async function deleteVoice(
  voiceId: string,
  ownerCode: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/voice-clone?voiceId=${encodeURIComponent(voiceId)}`,
    {
      method: 'DELETE',
      headers: { 'x-cope-owner': ownerCode },
      cache: 'no-store',
      signal,
    },
  );
  if (!response.ok) throw await readError(response);
}

export async function requestOralGrade(
  config: OralExamConfig,
  questions: OralQuestion[],
  answers: Record<string, string>,
  personality: PersonalityConfig,
  signal?: AbortSignal,
): Promise<OralGradeResponse> {
  const payload = await postOralExam(
    {
      action: 'grade',
      config,
      personality,
      questions,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? '',
      })),
    },
    signal,
  );
  const parsed = oralGradeResponseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.results.length !== questions.length) {
    throw new ApiError(
      502,
      'invalid_oral_grade',
      'La corrección del examen llegó en un formato inválido.',
    );
  }
  return parsed.data;
}

export { isAbortError };
