import { describe, expect, it } from 'vitest';
import {
  oralExamConfigSchema,
  oralExamRequestSchema,
  oralGradeContentSchema,
  oralGradeResponseSchema,
  oralQuestionSchema,
} from './oral-exam';

const questions = [
  {
    id: 'q1',
    prompt: 'Explicá la ley de Ohm con un ejemplo.',
    expectedPoints: ['V = I · R', 'Relaciona tensión, corriente y resistencia'],
    rubric: 'Define la fórmula y aplica un ejemplo numérico.',
  },
  {
    id: 'q2',
    prompt: '¿Qué es la energía cinética?',
    expectedPoints: ['Ec = ½ m v²', 'Depende de masa y velocidad'],
    rubric: 'Formula y explica la dependencia cuadrática.',
  },
  {
    id: 'q3',
    prompt: 'Describí un circuito en serie.',
    expectedPoints: ['Una sola trayectoria', 'La corriente es la misma'],
    rubric: 'Menciona la trayectoria y la corriente.',
  },
];

describe('oralExamConfigSchema', () => {
  it('aplica valores por defecto y limpia temas', () => {
    const parsed = oralExamConfigSchema.parse({
      subject: 'physics',
      level: 'secundaria',
      topics: ['  ley de Ohm  ', 'circuitos'],
    });
    expect(parsed.count).toBe(5);
    expect(parsed.difficulty).toBe('medium');
    expect(parsed.topics).toEqual(['ley de Ohm', 'circuitos']);
  });

  it('limita la cantidad y los temas', () => {
    expect(
      oralExamConfigSchema.safeParse({
        subject: 'physics',
        level: 'secundaria',
        count: 3,
        topics: [],
      }).success,
    ).toBe(true);
    expect(
      oralExamConfigSchema.safeParse({
        subject: 'physics',
        level: 'secundaria',
        count: 4,
      }).success,
    ).toBe(false);
    expect(
      oralExamConfigSchema.safeParse({
        subject: 'physics',
        level: 'secundaria',
        topics: Array.from({ length: 7 }, (_, index) => `tema ${index}`),
      }).success,
    ).toBe(false);
  });
});

describe('oralExamRequestSchema', () => {
  it('acepta generar un examen', () => {
    const parsed = oralExamRequestSchema.safeParse({
      action: 'generate',
      config: { subject: 'math', level: 'secundaria' },
    });
    expect(parsed.success).toBe(true);
  });

  it('acepta calificar respuestas del mismo examen', () => {
    const parsed = oralExamRequestSchema.safeParse({
      action: 'grade',
      config: { subject: 'physics', level: 'secundaria' },
      questions,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: 'Una respuesta suficientemente larga para el examen.',
      })),
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza respuestas con preguntas desconocidas o demasiado largas', () => {
    const parsed = oralExamRequestSchema.safeParse({
      action: 'grade',
      config: { subject: 'physics', level: 'secundaria' },
      questions,
      answers: [
        ...questions.map((question) => ({
          questionId: question.id,
          answer: 'ok',
        })),
        { questionId: 'q9', answer: 'x'.repeat(4_001) },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('oral question and grade schemas', () => {
  it('exige puntos esperados y rúbrica', () => {
    expect(oralQuestionSchema.safeParse(questions[0]).success).toBe(true);
    expect(
      oralQuestionSchema.safeParse({
        ...questions[0],
        expectedPoints: ['solo uno'],
      }).success,
    ).toBe(false);
    expect(
      oralQuestionSchema.safeParse({
        ...questions[0],
        expectedPoints: Array.from(
          { length: 6 },
          (_, index) => `Punto ${index + 1}`,
        ),
      }).success,
    ).toBe(true);
  });

  it('valida el contenido y la respuesta final', () => {
    const content = {
      title: 'Simulacro de física',
      results: [
        {
          questionId: 'q1',
          score: 4,
          strengths: ['Menciona la fórmula'],
          improvements: ['Falta el ejemplo'],
          modelAnswer: 'V = I · R, por ejemplo...',
        },
      ],
      summary: 'Buen dominio inicial.',
      nextSteps: ['Practicar circuitos en serie'],
    };
    expect(oralGradeContentSchema.safeParse(content).success).toBe(true);
    expect(
      oralGradeResponseSchema.safeParse({
        ...content,
        overallScore: 80,
        zone: 'segura',
        demo: true,
      }).success,
    ).toBe(true);
    expect(
      oralGradeResponseSchema.safeParse({
        ...content,
        overallScore: 101,
        zone: 'segura',
        demo: true,
      }).success,
    ).toBe(false);
  });
});
