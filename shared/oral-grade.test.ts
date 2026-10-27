import { describe, expect, it } from 'vitest';
import { oralOverallScore, oralZoneForScore } from './oral-grade';

describe('oralOverallScore', () => {
  it('promedia los puntajes sobre 5', () => {
    expect(oralOverallScore([5, 5, 5])).toBe(100);
    expect(oralOverallScore([0, 0, 0])).toBe(0);
    expect(oralOverallScore([5, 3, 4])).toBe(80);
  });

  it('devuelve cero sin resultados', () => {
    expect(oralOverallScore([])).toBe(0);
  });
});

describe('oralZoneForScore', () => {
  it('clasifica los umbrales', () => {
    expect(oralZoneForScore(80)).toBe('segura');
    expect(oralZoneForScore(79)).toBe('practica');
    expect(oralZoneForScore(55)).toBe('practica');
    expect(oralZoneForScore(54)).toBe('refuerzo');
  });
});
