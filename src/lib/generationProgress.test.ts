// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPECTED_CHARS,
  DEFAULT_WAIT_MS,
  DEFAULT_WRITE_MS,
  emptySamples,
  estimateExpectedChars,
  estimateWaitMs,
  estimateWriteMs,
  etaLabel,
  formatEta,
  median,
  readEstimateSamples,
  recordEstimateSample,
  remainingWriteMs,
  WAITING_SHARE,
  writingProgress,
  waitingProgress,
  type EstimateSamples,
} from './generationProgress';

function samplesWith(entries: Array<Partial<{
  promptChars: number;
  waitMs: number;
  writeMs: number;
  chars: number;
}>>): EstimateSamples {
  return {
    samples: entries.map((entry) => ({
      promptChars: entry.promptChars ?? 0,
      waitMs: entry.waitMs ?? 0,
      writeMs: entry.writeMs ?? 0,
      chars: entry.chars ?? 0,
    })),
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('estimación de espera', () => {
  it('usa el valor por defecto del proveedor cuando no hay historial', () => {
    expect(estimateWaitMs('pollinations')).toBe(DEFAULT_WAIT_MS.pollinations);
    expect(estimateWaitMs('ollama')).toBe(DEFAULT_WAIT_MS.ollama);
    expect(estimateWaitMs('openai')).toBe(DEFAULT_WAIT_MS.openai);
  });

  it('prefiere la mediana del historial local sin escalar si no conoce el prompt', () => {
    const samples = samplesWith([
      { waitMs: 4000 },
      { waitMs: 6000 },
      { waitMs: 8000 },
    ]);
    expect(estimateWaitMs('openai', 0, samples)).toBe(6000);
  });

  it('escala la espera con la longitud del prompt respecto del historial', () => {
    const samples = samplesWith([
      { promptChars: 1000, waitMs: 5000 },
      { promptChars: 1000, waitMs: 5000 },
      { promptChars: 1000, waitMs: 5000 },
    ]);
    // Prompt del doble de largo => espera aproximadamente doble.
    expect(estimateWaitMs('openai', 2000, samples)).toBe(10_000);
    // Prompt de la mitad => espera aproximadamente mitad.
    expect(estimateWaitMs('openai', 500, samples)).toBe(2500);
  });

  it('acota el factor de escala de la espera entre 0.5x y 2x', () => {
    const samples = samplesWith([
      { promptChars: 1000, waitMs: 5000 },
      { promptChars: 1000, waitMs: 5000 },
      { promptChars: 1000, waitMs: 5000 },
    ]);
    expect(estimateWaitMs('openai', 100_000, samples)).toBe(10_000);
    expect(estimateWaitMs('openai', 1, samples)).toBe(2500);
  });

  it('no escala la espera con menos de tres muestras pareadas', () => {
    const samples = samplesWith([
      { promptChars: 1000, waitMs: 5000 },
      { promptChars: 1000, waitMs: 7000 },
    ]);
    expect(estimateWaitMs('openai', 4000, samples)).toBe(6000);
  });

  it('calcula la mediana de una lista impar y par', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('caracteres esperados de la respuesta', () => {
  it('usa el valor por defecto sin historial', () => {
    expect(estimateExpectedChars()).toBe(DEFAULT_EXPECTED_CHARS);
  });

  it('usa la mediana de caracteres cuando no conoce el prompt', () => {
    const samples = samplesWith([{ chars: 400 }, { chars: 600 }, { chars: 800 }]);
    expect(estimateExpectedChars(0, samples)).toBe(600);
  });

  it('estima los caracteres proporcionales a la longitud del prompt', () => {
    const samples = samplesWith([
      { promptChars: 1000, chars: 500 },
      { promptChars: 1000, chars: 500 },
      { promptChars: 1000, chars: 500 },
    ]);
    expect(estimateExpectedChars(2000, samples)).toBe(1000);
  });

  it('acota los caracteres esperados entre 120 y 6000', () => {
    const samples = samplesWith([
      { promptChars: 1000, chars: 500 },
      { promptChars: 1000, chars: 500 },
      { promptChars: 1000, chars: 500 },
    ]);
    expect(estimateExpectedChars(10, samples)).toBe(120);
    expect(estimateExpectedChars(100_000, samples)).toBe(6000);
  });

  it('no usa la proporción con menos de tres muestras pareadas', () => {
    const samples = samplesWith([
      { promptChars: 1000, chars: 500 },
      { promptChars: 1000, chars: 900 },
    ]);
    expect(estimateExpectedChars(4000, samples)).toBe(700);
  });
});

describe('duración de escritura estimada', () => {
  it('usa el valor por defecto sin historial', () => {
    expect(estimateWriteMs()).toBe(DEFAULT_WRITE_MS);
  });

  it('prefiere la mediana de escritura del historial', () => {
    const samples = samplesWith([
      { writeMs: 3000 },
      { writeMs: 5000 },
      { writeMs: 9000 },
    ]);
    expect(estimateWriteMs(samples)).toBe(5000);
  });
});

describe('historial persistido', () => {
  it('arranca vacío', () => {
    expect(readEstimateSamples()).toEqual(emptySamples());
  });

  it('guarda y lee una medición completa pareada', () => {
    recordEstimateSample({ promptChars: 1200, waitMs: 4000, writeMs: 6000, chars: 800 });
    const stored = readEstimateSamples();
    expect(stored.samples).toHaveLength(1);
    expect(stored.samples[0]).toEqual({
      promptChars: 1200,
      waitMs: 4000,
      writeMs: 6000,
      chars: 800,
    });
  });

  it('descarta mediciones incompletas', () => {
    recordEstimateSample({ waitMs: 4000 });
    recordEstimateSample({ waitMs: 4000, writeMs: 0, chars: 100 });
    recordEstimateSample({ waitMs: -1, writeMs: 6000, chars: 800 });
    expect(readEstimateSamples().samples).toHaveLength(0);
  });

  it('conserva como máximo ocho muestras', () => {
    for (let i = 0; i < 12; i += 1) {
      recordEstimateSample({ promptChars: 1000, waitMs: 1000 + i, writeMs: 2000, chars: 300 });
    }
    const stored = readEstimateSamples().samples;
    expect(stored).toHaveLength(8);
    expect(stored[0]?.waitMs).toBe(1004);
    expect(stored[7]?.waitMs).toBe(1011);
  });

  it('ignora un historial corrupto', () => {
    window.localStorage.setItem('cope-gen-estimates-v2', '{not json');
    expect(readEstimateSamples()).toEqual(emptySamples());
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