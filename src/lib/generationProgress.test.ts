import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WAIT_MS,
  etaLabel,
  estimateExpectedChars,
  estimateWaitMs,
  formatEta,
  median,
  remainingWriteMs,
  WAITING_SHARE,
  writingProgress,
  waitingProgress,
} from './generationProgress';

describe('estimación de espera', () => {
  it('usa el valor por defecto del proveedor cuando no hay historial', () => {
    expect(estimateWaitMs('pollinations')).toBe(DEFAULT_WAIT_MS.pollinations);
    expect(estimateWaitMs('ollama')).toBe(DEFAULT_WAIT_MS.ollama);
    expect(estimateWaitMs('openai')).toBe(DEFAULT_WAIT_MS.openai);
  });

  it('prefiere la mediana del historial local', () => {
    const samples = { wait: [4000, 6000, 8000], write: [], chars: [] };
    expect(estimateWaitMs('openai', samples)).toBe(6000);
  });

  it('cae al proveedor cuando no hay mediciones guardadas', () => {
    const samples = { wait: [], write: [], chars: [] };
    expect(estimateWaitMs('openai', samples)).toBe(DEFAULT_WAIT_MS.openai);
    expect(estimateExpectedChars(samples)).toBeGreaterThan(0);
  });

  it('calcula la mediana de una lista impar y par', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('avance de la barra', () => {
  it('crece de forma monótona mientras espera', () => {
    const early = waitingProgress(1000, 10_000);
    const middle = waitingProgress(5000, 10_000);
    const late = waitingProgress(20_000, 10_000);
    expect(early).toBeGreaterThan(0);
    expect(middle).toBeGreaterThan(early);
    expect(late).toBeGreaterThan(middle);
  });

  it('nunca completa la barra durante la espera', () => {
    expect(waitingProgress(120_000, 10_000)).toBeLessThan(WAITING_SHARE);
    expect(waitingProgress(120_000, 10_000)).toBeLessThan(1);
  });

  it('parte del avance de espera cuando llega el primer token', () => {
    expect(writingProgress(0, 900)).toBeCloseTo(WAITING_SHARE, 5);
  });

  it('cierra la barra al recibir todos los caracteres esperados', () => {
    expect(writingProgress(900, 900)).toBeCloseTo(1, 5);
    expect(writingProgress(2000, 900)).toBe(1);
  });
});

describe('tiempo restante de escritura', () => {
  it('estima los milisegundos que faltan con la velocidad observada', () => {
    // 100 caracteres en 1 s => 0,1 caracteres/ms; faltan 900 => 9 s.
    expect(remainingWriteMs(100, 1000, 1000)).toBeCloseTo(9_000, 0);
  });

  it('devuelve cero cuando ya llegó todo el texto', () => {
    expect(remainingWriteMs(1000, 1000, 1000)).toBe(0);
  });

  it('devuelve cero sin caracteres o sin tiempo medido', () => {
    expect(remainingWriteMs(0, 1000, 1000)).toBe(0);
    expect(remainingWriteMs(100, 0, 1000)).toBe(0);
  });

  it('no devuelve horas de más cuando la respuesta es lenta', () => {
    const remaining = remainingWriteMs(20, 1000, 1250);
    expect(remaining).toBeLessThan(120_000);
    expect(remaining).toBeGreaterThan(0);
  });
});

describe('texto del contador', () => {
  it('muestra el tiempo restante estimado', () => {
    expect(formatEta(12_000)).toBe('12 s');
    expect(formatEta(80_000)).toBe('1 min 20 s');
    expect(formatEta(120_000)).toBe('2 min');
    expect(formatEta(0)).toBe('0 s');
  });

  it('avisa cuando la respuesta tarda más de lo previsto', () => {
    expect(etaLabel(1000, 5000)).toBe('quedan ~4 s');
    expect(etaLabel(9000, 5000)).toBe('tarda más de lo previsto');
  });
});
