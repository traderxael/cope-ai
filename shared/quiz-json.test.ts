import { describe, expect, it } from 'vitest';
import { extractJsonObject, parseQuizJson } from './quiz-json';

function questions(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Pregunta número ${index + 1}`,
    options: ['Alfa', 'Beta', 'Gamma', 'Delta'],
    correctIndex: index % 4,
    explanation: `Explicación de la pregunta ${index + 1}.`,
  }));
}

describe('extractJsonObject', () => {
  it('extrae JSON con texto alrededor y fences', () => {
    const raw = 'Claro:\n```json\n{"questions":[]}\n```\nEso es todo.';
    expect(extractJsonObject(raw)).toEqual({ questions: [] });
  });

  it('devuelve null si no hay objeto o es inválido', () => {
    expect(extractJsonObject('sin json')).toBeNull();
    expect(extractJsonObject('{ roto }')).toBeNull();
    expect(extractJsonObject('')).toBeNull();
  });

  it('repara comillas dobles sin escapar dentro de un texto', () => {
    const raw =
      '{"summary":"No menciona "secuencia de razones" ni "proporciones"","ok":true}';
    expect(extractJsonObject(raw)).toEqual({
      summary: 'No menciona "secuencia de razones" ni "proporciones"',
      ok: true,
    });
  });
});

describe('parseQuizJson', () => {
  it('acepta cinco preguntas válidas', () => {
    const parsed = parseQuizJson(JSON.stringify({ questions: questions() }));
    expect(parsed).toHaveLength(5);
    expect(parsed?.[0]?.id).toBe('q1');
  });

  it('rechaza cuatro preguntas', () => {
    expect(
      parseQuizJson(JSON.stringify({ questions: questions(4) })),
    ).toBeNull();
  });

  it('rechaza opciones repetidas', () => {
    const invalid = questions();
    invalid[0]!.options = ['Uno', 'Uno', 'Dos', 'Tres'];
    expect(parseQuizJson(JSON.stringify({ questions: invalid }))).toBeNull();
  });

  it('rechaza correctIndex fuera de rango', () => {
    const invalid = questions();
    invalid[0]!.correctIndex = 4;
    expect(parseQuizJson(JSON.stringify({ questions: invalid }))).toBeNull();
  });
});
