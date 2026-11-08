import type { AiProvider } from './api';

const STORAGE_KEY = 'cope-gen-estimates-v2';
const MAX_SAMPLES = 8;
const MIN_PAIRED_SAMPLES = 3;

/**
 * Porcentaje de la barra que se cubre mientras se espera al primer token.
 * El resto se completa con la escritura de la respuesta.
 */
export const WAITING_SHARE = 0.72;

/** Una medición real de una respuesta, pareada con el largo del prompt. */
export interface GenerationSample {
  promptChars: number;
  waitMs: number;
  writeMs: number;
  chars: number;
}

export interface EstimateSamples {
  samples: GenerationSample[];
}

/** Estado de la generación en curso, usado para la barra de progreso. */
export interface GenerationStatus {
  /** Momento en que se envió la petición. */
  startedAt: number;
  /** Momento en que llegó el primer fragmento de texto. */
  firstTokenAt: number | null;
  /** Caracteres recibidos hasta ahora. */
  chars: number;
  /** Caracteres de texto del prompt enviado, como sensor de la estimación. */
  promptChars: number;
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

const MIN_EXPECTED_CHARS = 120;
const MAX_EXPECTED_CHARS = 6_000;

export function emptySamples(): EstimateSamples {
  return { samples: [] };
}

function isSample(value: unknown): value is GenerationSample {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  const positive = (key: string) =>
    typeof source[key] === 'number' &&
    Number.isFinite(source[key]) &&
    (source[key] as number) > 0;
  const nonNegative = (key: string) =>
    typeof source[key] === 'number' &&
    Number.isFinite(source[key]) &&
    (source[key] as number) >= 0;
  return (
    positive('waitMs') &&
    positive('writeMs') &&
    positive('chars') &&
    nonNegative('promptChars')
  );
}

export function readEstimateSamples(): EstimateSamples {
  if (typeof window === 'undefined') return emptySamples();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySamples();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return emptySamples();
    return { samples: parsed.filter(isSample).slice(-MAX_SAMPLES) };
  } catch {
    return emptySamples();
  }
}

/** Guarda una medición real completa para afinar la estimación. */
export function recordEstimateSample(sample: {
  promptChars?: number;
  waitMs?: number;
  writeMs?: number;
  chars?: number;
}): void {
  if (typeof window === 'undefined') return;
  const { waitMs, writeMs, chars } = sample;
  if (
    !waitMs || waitMs <= 0 ||
    !writeMs || writeMs <= 0 ||
    !chars || chars <= 0
  ) {
    return;
  }
  const promptChars =
    typeof sample.promptChars === 'number' &&
    Number.isFinite(sample.promptChars) &&
    sample.promptChars > 0
      ? Math.round(sample.promptChars)
      : 0;
  const next: GenerationSample = {
    promptChars,
    waitMs: Math.round(waitMs),
    writeMs: Math.round(writeMs),
    chars: Math.round(chars),
  };
  const current = readEstimateSamples().samples;
  const combined = [...current, next];
  const capped =
    combined.length > MAX_SAMPLES
      ? combined.slice(combined.length - MAX_SAMPLES)
      : combined;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultWait(provider: AiProvider | null): number {
  if (provider && provider in DEFAULT_WAIT_MS) return DEFAULT_WAIT_MS[provider];
  return DEFAULT_WAIT_MS.pollinations;
}

/**
 * Espera estimada hasta el primer token. Con historial pareado suficiente,
 * escala la espera según el largo del prompt respecto de lo observado.
 */
export function estimateWaitMs(
  provider: AiProvider | null,
  promptChars = 0,
  samples: EstimateSamples = readEstimateSamples(),
): number {
  const observed = median(
    samples.samples.map((sample) => sample.waitMs).filter((value) => value > 0),
  );
  const base = observed > 0 ? observed : defaultWait(provider);
  const paired = samples.samples.filter(
    (sample) => sample.promptChars > 0 && sample.waitMs > 0,
  );
  if (promptChars > 0 && paired.length >= MIN_PAIRED_SAMPLES) {
    const medianPrompt = median(paired.map((sample) => sample.promptChars));
    if (medianPrompt > 0) {
      const scale = clamp(promptChars / medianPrompt, 0.5, 2);
      return Math.round(base * scale);
    }
  }
  return base;
}

/** Duración estimada de la escritura de la respuesta. */
export function estimateWriteMs(
  samples: EstimateSamples = readEstimateSamples(),
): number {
  const observed = median(
    samples.samples.map((sample) => sample.writeMs).filter((value) => value > 0),
  );
  return observed > 0 ? observed : DEFAULT_WRITE_MS;
}

/**
 * Caracteres esperados de la respuesta. Con historial pareado suficiente,
 * los estima proporcionales al largo del prompt; si no, usa la mediana
 * observada o el valor por defecto.
 */
export function estimateExpectedChars(
  promptChars = 0,
  samples: EstimateSamples = readEstimateSamples(),
): number {
  const paired = samples.samples.filter(
    (sample) => sample.promptChars > 0 && sample.chars > 0,
  );
  if (promptChars > 0 && paired.length >= MIN_PAIRED_SAMPLES) {
    const ratio = median(paired.map((sample) => sample.chars / sample.promptChars));
    if (ratio > 0) {
      return Math.round(clamp(promptChars * ratio, MIN_EXPECTED_CHARS, MAX_EXPECTED_CHARS));
    }
  }
  const observed = median(
    samples.samples.map((sample) => sample.chars).filter((value) => value > 0),
  );
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
  const remainingChars = Math.max(0, expectedChars - receivedChars);
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