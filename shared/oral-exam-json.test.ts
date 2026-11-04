import { describe, expect, it } from 'vitest';
import {
  parseOralExamJson,
  parseOralGradeJson,
  parseOralReplyJson,
} from './oral-exam-json';

const questions = Array.from({ length: 3 }, (_, index) => ({
  prompt: `Pregunta oral número ${index + 1} sobre el tema.`,
  expectedPoints: ['Punto esperado uno', 'Punto esperado dos'],
  rubric: 'Explica, justifica y da un ejemplo.',
}));

describe('parseOralExamJson', () => {
  it('extrae un examen válido aunque venga con fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify({
      title: 'Simulacro de prueba',
      questions,
    })}\n\`\`\``;
    expect(parseOralExamJson(raw)?.questions).toHaveLength(3);
  });

  it('rechaza exámenes incompletos', () => {
    expect(parseOralExamJson('sin json')).toBeNull();
    expect(
      parseOralExamJson(
        JSON.stringify({ title: 'Corto', questions: questions.slice(0, 2) }),
      ),
    ).toBeNull();
  });
});

describe('parseOralReplyJson', () => {
  it('extrae feedback y repregunta', () => {
    const parsed = parseOralReplyJson(
      '{"reply":"Bien dicho, falta justificar.","followUp":"¿Podés dar un ejemplo?"}',
    );
    expect(parsed).toEqual({
      reply: 'Bien dicho, falta justificar.',
      followUp: '¿Podés dar un ejemplo?',
    });
  });

  it('acepta followUp nulo o ausente', () => {
    expect(
      parseOralReplyJson('{"reply":"Bien.","followUp":null}')?.followUp,
    ).toBe('');
    expect(parseOralReplyJson('{"reply":"Bien."}')?.followUp).toBe('');
  });

  it('rechaza respuestas vacías', () => {
    expect(parseOralReplyJson('{"reply":"   "}')).toBeNull();
    expect(parseOralReplyJson('sin json')).toBeNull();
  });
});

describe('parseOralGradeJson', () => {
  it('extrae una corrección válida', () => {
    const raw = JSON.stringify({
      results: questions.map((_, index) => ({
        questionId: `q${index + 1}`,
        score: 4,
        strengths: ['Claridad'],
        improvements: ['Ejemplo'],
        modelAnswer: 'Una respuesta modelo.',
      })),
      summary: 'Buen desempeño general.',
      nextSteps: ['Practicar más ejemplos'],
    });
    expect(parseOralGradeJson(raw)?.results).toHaveLength(3);
  });

  it('repara comillas dobles internas del modelo', () => {
    const raw =
      '{"results":[{"questionId":"q1","score":3,"strengths":["Bien "claro" y preciso"],"improvements":["Falta "ejemplo""],"modelAnswer":"Una "fracción" equivalente."}],"summary":"Buen "trabajo" general.","nextSteps":["Practicar "ejemplos""]}';
    const parsed = parseOralGradeJson(raw);
    expect(parsed?.results[0]?.strengths[0]).toBe('Bien "claro" y preciso');
    expect(parsed?.summary).toBe('Buen "trabajo" general.');
  });

  it('rechaza puntajes fuera de escala', () => {
    expect(
      parseOralGradeJson(
        JSON.stringify({
          results: [
            {
              questionId: 'q1',
              score: 9,
              strengths: [],
              improvements: [],
              modelAnswer: 'x',
            },
          ],
          summary: 'Resumen',
          nextSteps: ['Seguir'],
        }),
      ),
    ).toBeNull();
  });
});
