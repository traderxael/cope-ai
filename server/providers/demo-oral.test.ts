import { describe, expect, it } from 'vitest';
import {
  oralExamResponseSchema,
  type OralExamConfig,
} from '../../shared/schemas/oral-exam';
import { demoOralExam, demoOralGrade } from './demo-oral';

const config: OralExamConfig = {
  subject: 'physics',
  level: 'secundaria',
  difficulty: 'medium',
  topics: [],
  count: 5,
};

describe('demoOralExam', () => {
  it('genera un examen válido y determinista', () => {
    const first = demoOralExam({ ...config, count: 8 });
    const second = demoOralExam({ ...config, count: 8 });
    expect(oralExamResponseSchema.safeParse(first).success).toBe(true);
    expect(first.questions).toHaveLength(8);
    expect(first.questions.map((question) => question.id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `q${index + 1}`),
    );
    expect(second.questions[0]?.prompt).toBe(first.questions[0]?.prompt);
  });
});

describe('demoOralGrade', () => {
  it('da cero y zona de refuerzo si no hay respuestas', () => {
    const exam = demoOralExam(config);
    const grade = demoOralGrade(
      config,
      exam.questions,
      exam.questions.map((question) => ({
        questionId: question.id,
        answer: '',
      })),
    );
    expect(grade.overallScore).toBe(0);
    expect(grade.zone).toBe('refuerzo');
    expect(grade.results).toHaveLength(config.count);
  });

  it('reconoce respuestas completas y da zona segura', () => {
    const exam = demoOralExam(config);
    const grade = demoOralGrade(
      config,
      exam.questions,
      exam.questions.map((question) => ({
        questionId: question.id,
        answer: question.expectedPoints.join(' '),
      })),
    );
    expect(grade.overallScore).toBe(100);
    expect(grade.zone).toBe('segura');
    expect(grade.results.every((result) => result.score === 5)).toBe(true);
  });
});
