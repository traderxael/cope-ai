import type { AiProvider } from './api';

const STORAGE_KEY = 'cope-gen-estimates-v1';
const MAX_SAMPLES = 8;

/**
 * Porcentaje de la barra que se cubre mientras se espera al primer token.
 * El resto se completa con la escritura de la respuesta.
 */
export const WAITING_SHARE = 0.72;

export interface EstimateSamples {
  wait: number[];
  write: number[];
  chars: number[];
}

/** Estado de la generación en curso, usado para la barra de progreso. */
export interface GenerationStatus {
  /** Momento en que se envió la petición. */
  startedAt: number;
  /** Momento en que llegó el primer fragmento de texto. */
  firstTokenAt: number | null;
  /** Caracteres recibidos hasta ahora. */
  chars: number;
}

/** Espera por defecto hasta el primer token, según el proveedor. */
export const DEFAULT_WAIT_MS: Record<AiProvider, number> = {
  pollinations: 25_000,
  ollama: 20_000,
  openai: 8_000,
  fixtures: 400,
};

export const DEFAULT_WRITE_MS = 6_000;
export const DEFAULT_EXPECTED_CHARS = 900;

export function emptySamples(): EstimateSamples {
  return { wait: [], write: [], chars: [] };
}

export function readEstimateSamples(): EstimateSamples {
  if (typeof window === 'undefined') return emptySamples();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySamples();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptySamples();
    const source = parsed as Record<string, unknown>;
    const pick = (key: 'wait' | 'write' | 'chars'): number[] => {
      const value = source[key];
      if (!Array.isArray(value)) return [];
      return value.filter(
        (item): item is number =>
          typeof item === 'number' && Number.isFinite(item) && item > 0,
      );
    };
    return { wait: pick('wait'), write: pick('write'), chars: pick('chars') };
  } catch {
    return emptySamples();
  }
}

function pushSample(list: number[], value: number): number[] {
  const next = [...list, value];
  return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
}

/** Guarda una medición real de espera/escritura para afinar la estimación. */
export function recordEstimateSample(sample: {
  waitMs?: number;
  writeMs?: number;
  chars?: number;
}): void {
  if (typeof window === 'undefined') return;
  const current = readEstimateSamples();
  const next: EstimateSamples = {
    wait:
      sample.waitMs && sample.waitMs > 0
        ? pushSample(current.wait, Math.round(sample.waitMs))
        : current.wait,
    write:
      sample.writeMs && sample.writeMs > 0
        ? pushSample(current.write, Math.round(sample.writeMs))
        : current.write,
    chars:
      sample.chars && sample.chars > 0
        ? pushSample(current.chars, Math.round(sample.chars))
        : current.chars,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin historial persistido la estimación usa los valores por defecto.
  }
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Espera estimada hasta el primer token, en milisegundos. */
export function estimateWaitMs(
  provider: AiProvider | null,
  samples: EstimateSamples = readEstimateSamples(),
): number {
  const observed = median(samples.wait);
  if (observed > 0) return observed;
  if (provider && provider in DEFAULT_WAIT_MS) return DEFAULT_WAIT_MS[provider];
  return DEFAULT_WAIT_MS.pollinations;
}

/** Duración estimada de la escritura de la respuesta. */
export function estimateWriteMs(samples: EstimateSamples = readEstimateSamples()): number {
  const observed = median(samples.write);
  return observed > 0 ? observed : DEFAULT_WRITE_MS;
}

/** Cantidad de caracteres que se espera que tenga la respuesta. */
export function estimateExpectedChars(
  samples: EstimateSamples = readEstimateSamples(),
): number {
  const observed = median(samples.chars);
  return observed > 0 ? observed : DEFAULT_EXPECTED_CHARS;
}

/**
 * Avance de la barra durante la espera del primer token.
 * Crece de forma asintótica y nunca llega a 100 %: la barra solo se
 * completa cuando la respuesta termina.
 */
export function waitingProgress(elapsedMs: number, estimateMs: number): number {
  const safeEstimate = Math.max(estimateMs, 500);
  const ratio = 1 - Math.exp(-Math.max(0, elapsedMs) / safeEstimate);
  return Math.min(WAITING_SHARE, WAITING_SHARE * ratio);
}

/** Avance de la barra mientras llega el texto de la respuesta. */
export function writingProgress(
  receivedChars: number,
  expectedChars: number,
): number {
  const safeExpected = Math.max(expectedChars, 120);
  const ratio = Math.min(1, Math.max(0, receivedChars) / safeExpected);
  return WAITING_SHARE + (1 - WAITING_SHARE) * ratio;
}

/**
 * Tiempo estimado que falta para terminar de escribir la respuesta.
 * `rate` es la velocidad de llegada de caracteres por milisegundo, así que
 * el resultado sale directamente en milisegundos.
 */
export function remainingWriteMs(
  receivedChars: number,
  writeElapsedMs: number,
  expectedChars: number,
): number {
  if (receivedChars <= 0 || writeElapsedMs <= 0) return 0;
  const rate = receivedChars / writeElapsedMs;
  if (rate <= 0) return 0;
  const remainingChars = Math.max(
    0,
    expectedChars - receivedChars,
  );
  return remainingChars / rate;
}

/** Formatea una duración corta: "12 s", "1 min 20 s". */
export function formatEta(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

/**
 * Texto del contador: cuánto falta aproximadamente, o un aviso cuando la
 * respuesta tarda más de lo previsto.
 */
export function etaLabel(elapsedMs: number, estimateMs: number): string {
  const remaining = estimateMs - elapsedMs;
  if (remaining > 0) return `quedan ~${formatEta(remaining)}`;
  return 'tarda más de lo previsto';
}
