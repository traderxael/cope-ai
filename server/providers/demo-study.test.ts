import { describe, expect, it } from 'vitest';
import { flashcardContentSchema, studyPlanContentSchema } from '../../shared/schemas/study';
import type { StudyPlanRequest, Subject } from '../../shared/types';
import { demoFlashcards, demoStudyPlan } from './demo-study';

const ALL_SUBJECTS: Subject[] = ['math', 'physics', 'chemistry', 'general'];

function request(overrides: Partial<StudyPlanRequest> = {}): StudyPlanRequest {
  return {
    subject: 'math',
    level: 'secundaria',
    difficulty: 'medium',
    examDate: '2026-11-10',
    topics: [],
    days: 7,
    ...overrides,
  };
}

describe('demoFlashcards', () => {
  it('devuelve entre 6 y 10 tarjetas válidas por materia', () => {
    for (const subject of ALL_SUBJECTS) {
      for (const count of [6, 8, 10]) {
        const parsed = flashcardContentSchema.safeParse({
          cards: demoFlashcards(subject, count),
        });
        expect(parsed.success, `${subject}-${count}`).toBe(true);
        expect(demoFlashcards(subject, count)).toHaveLength(count);
      }
    }
  });

  it('devuelve copias independientes', () => {
    const first = demoFlashcards('physics', 6);
    first[0]!.front = 'Cambiada';
    expect(demoFlashcards('physics', 6)[0]!.front).not.toBe('Cambiada');
  });
});

describe('demoStudyPlan', () => {
  it('genera planes válidos para 3, 7 y 14 días', () => {
    for (const days of [3, 7, 14]) {
      const plan = demoStudyPlan(request({ days }));
      expect(plan.days).toHaveLength(days);
      expect(plan.days.map((day) => day.day)).toEqual(
        Array.from({ length: days }, (_, index) => index + 1),
      );
      expect(studyPlanContentSchema.safeParse(plan).success, String(days)).toBe(
        true,
      );
    }
  });

  it('alterna repaso cada tres días y cierra con descanso', () => {
    const plan = demoStudyPlan(request({ days: 7 }));
    expect(plan.days[2]?.tasks[0]?.type).toBe('review');
    expect(plan.days[5]?.tasks[0]?.type).toBe('review');
    expect(plan.days[6]?.tasks.some((task) => task.type === 'rest')).toBe(true);
    expect(plan.days[0]?.tasks[0]?.type).toBe('study');
  });

  it('usa los temas indicados y rota entre ellos', () => {
    const plan = demoStudyPlan(
      request({ days: 3, topics: ['derivadas', 'límites'] }),
    );
    expect(plan.days.map((day) => day.focus)).toEqual([
      'derivadas',
      'límites',
      'derivadas',
    ]);
  });

  it('incluye materia y nivel en el título', () => {
    const plan = demoStudyPlan(
      request({ subject: 'chemistry', level: 'universidad' }),
    );
    expect(plan.title).toContain('Química');
    expect(plan.title).toContain('Universidad');
  });
});
