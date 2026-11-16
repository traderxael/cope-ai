import { describe, expect, it } from 'vitest';
import { scoreDuel, type DuelQuestion } from './duel';

const questions: DuelQuestion[] = [
  { correctIndex: 0 },
  { correctIndex: 1 },
  { correctIndex: 2 },
  { correctIndex: 3 },
  { correctIndex: 0 },
];

describe('scoreDuel', () => {
  it('gana si acierta más que el rival', () => {
    const result = scoreDuel(questions, [0, 1, 2, 3, 0], 0.6);
    expect(result.playerScore).toBe(5);
    expect(result.opponentScore).toBe(3);
    expect(result.won).toBe(true);
    expect(result.stars).toBe(7);
  });

  it('pierde si acierta menos que el rival', () => {
    const result = scoreDuel(questions, [0, 1, 2], 0.8);
    expect(result.playerScore).toBe(3);
    expect(result.opponentScore).toBe(4);
    expect(result.won).toBe(false);
    expect(result.stars).toBe(3);
  });

  it('cuenta como empate cuando empatan y no otorga bonificación', () => {
    const result = scoreDuel(questions, [0, 1, 2], 0.6);
    expect(result.playerScore).toBe(3);
    expect(result.opponentScore).toBe(3);
    expect(result.won).toBe(false);
    expect(result.stars).toBe(3);
  });

  it('no puntúa respuestas nulas ni fora de rango', () => {
    const result = scoreDuel(questions, [0, 9, null, 3, 1], 0);
    expect(result.playerScore).toBe(2);
  });
});
