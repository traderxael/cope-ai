import { describe, expect, it } from 'vitest';
import { LIMITS } from '../limits';
import {
  flashcardContentSchema,
  flashcardRequestSchema,
  flashcardResponseSchema,
  studyPlanContentSchema,
  studyPlanRequestSchema,
  studyPlanResponseSchema,
} from './study';

const card = {
  front: '¿Qué es la derivada?',
  back: 'La tasa de cambio instantánea.',
  explanation: 'Es la pendiente de la recta tangente.',
};

function cards(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...card,
    front: `${card.front} ${index + 1}`,
  }));
}

function planDay(day: number) {
  return {
    day,
    focus: `Tema ${day}`,
    tasks: [
      {
        title: `Estudiar tema ${day}`,
        description: 'Leer y resumir.',
        minutes: 40,
        type: 'study' as const,
      },
    ],
  };
}

function planContent(days: number) {
  return {
    title: 'Plan de matemáticas',
    days: Array.from({ length: days }, (_, index) => planDay(index + 1)),
  };
}

describe('flashcardRequestSchema', () => {
  it('aplica valores por defecto y limpia campos vacíos', () => {
    const parsed = flashcardRequestSchema.parse({
      subject: 'math',
      level: 'secundaria',
      topic: '   ',
    });
    expect(parsed.count).toBe(LIMITS.defaultFlashcards);
    expect(parsed.topic).toBeUndefined();
    expect(parsed.sourceText).toBeUndefined();
  });

  it('acepta 6, 8 y 10 tarjetas, pero no otras cantidades', () => {
    for (const count of [6, 8, 10] as const) {
      expect(
        flashcardRequestSchema.safeParse({
          subject: 'math',
          level: 'secundaria',
          count,
        }).success,
      ).toBe(true);
    }
    expect(
      flashcardRequestSchema.safeParse({
        subject: 'math',
        level: 'secundaria',
        count: 7,
      }).success,
    ).toBe(false);
  });

  it('limita el texto de origen', () => {
    expect(
      flashcardRequestSchema.safeParse({
        subject: 'math',
        level: 'secundaria',
        sourceText: 'a'.repeat(LIMITS.maxSourceTextChars + 1),
      }).success,
    ).toBe(false);
  });
});

describe('flashcardContentSchema', () => {
  it('exige entre 6 y 10 tarjetas con contenido mínimo', () => {
    expect(flashcardContentSchema.safeParse({ cards: cards(6) }).success).toBe(
      true,
    );
    expect(flashcardContentSchema.safeParse({ cards: cards(10) }).success).toBe(
      true,
    );
    expect(flashcardContentSchema.safeParse({ cards: cards(5) }).success).toBe(
      false,
    );
    expect(flashcardContentSchema.safeParse({ cards: cards(11) }).success).toBe(
      false,
    );
    expect(
      flashcardContentSchema.safeParse({
        cards: [{ ...card, front: '  a ' }],
      }).success,
    ).toBe(false);
  });

  it('la respuesta final exige ids únicos por tarjeta', () => {
    const withIds = cards(6).map((item, index) => ({
      ...item,
      id: `fc-${index + 1}`,
    }));
    expect(
      flashcardResponseSchema.safeParse({ cards: withIds, demo: true }).success,
    ).toBe(true);
    expect(
      flashcardResponseSchema.safeParse({
        cards: withIds.map(({ id: _id, ...rest }) => rest),
        demo: true,
      }).success,
    ).toBe(false);
  });
});

describe('studyPlanRequestSchema', () => {
  it('aplica días, dificultad y temas por defecto', () => {
    const parsed = studyPlanRequestSchema.parse({
      subject: 'physics',
      level: 'bachillerato',
      examDate: '2026-11-10',
    });
    expect(parsed.days).toBe(LIMITS.defaultPlanDays);
    expect(parsed.difficulty).toBe('medium');
    expect(parsed.topics).toEqual([]);
  });

  it('valida la fecha real del examen', () => {
    const base = {
      subject: 'physics',
      level: 'bachillerato',
    };
    expect(
      studyPlanRequestSchema.safeParse({
        ...base,
        examDate: '2026-11-10',
      }).success,
    ).toBe(true);
    expect(
      studyPlanRequestSchema.safeParse({
        ...base,
        examDate: '2026-02-30',
      }).success,
    ).toBe(false);
    expect(
      studyPlanRequestSchema.safeParse({
        ...base,
        examDate: '10/11/2026',
      }).success,
    ).toBe(false);
  });

  it('limita días y temas', () => {
    const base = {
      subject: 'physics',
      level: 'bachillerato',
      examDate: '2026-11-10',
    };
    expect(
      studyPlanRequestSchema.safeParse({ ...base, days: LIMITS.minPlanDays })
        .success,
    ).toBe(true);
    expect(
      studyPlanRequestSchema.safeParse({ ...base, days: LIMITS.maxPlanDays })
        .success,
    ).toBe(true);
    expect(
      studyPlanRequestSchema.safeParse({ ...base, days: LIMITS.minPlanDays - 1 })
        .success,
    ).toBe(false);
    expect(
      studyPlanRequestSchema.safeParse({ ...base, days: LIMITS.maxPlanDays + 1 })
        .success,
    ).toBe(false);
    expect(
      studyPlanRequestSchema.safeParse({
        ...base,
        topics: Array.from(
          { length: LIMITS.maxPlanTopics + 1 },
          (_, index) => `tema ${index}`,
        ),
      }).success,
    ).toBe(false);
  });
});

describe('studyPlanContentSchema', () => {
  it('acepta un plan con días únicos y tareas válidas', () => {
    expect(
      studyPlanContentSchema.safeParse(planContent(LIMITS.minPlanDays)).success,
    ).toBe(true);
    expect(
      studyPlanContentSchema.safeParse(planContent(LIMITS.maxPlanDays)).success,
    ).toBe(true);
  });

  it('rechaza días duplicados', () => {
    const content = planContent(3);
    content.days[2] = planDay(2);
    expect(studyPlanContentSchema.safeParse(content).success).toBe(false);
  });

  it('exige días contiguos desde 1', () => {
    const gap = planContent(3);
    gap.days[2] = planDay(4);
    expect(studyPlanContentSchema.safeParse(gap).success).toBe(false);

    const startsAtTwo = planContent(3);
    startsAtTwo.days[0] = planDay(2);
    expect(studyPlanContentSchema.safeParse(startsAtTwo).success).toBe(false);
  });

  it('limita minutos y cantidad de tareas por día', () => {
    const short = planContent(3);
    short.days[0]!.tasks[0]!.minutes = LIMITS.minPlanTaskMinutes - 1;
    expect(studyPlanContentSchema.safeParse(short).success).toBe(false);

    const long = planContent(3);
    long.days[0]!.tasks[0]!.minutes = LIMITS.maxPlanTaskMinutes + 1;
    expect(studyPlanContentSchema.safeParse(long).success).toBe(false);

    const rest = {
      ...planContent(3),
      days: planContent(3).days.map((day, index) =>
        index === 0
          ? {
              ...day,
              tasks: [{ ...day.tasks[0]!, type: 'rest', minutes: 15 }],
            }
          : day,
      ),
    };
    expect(studyPlanContentSchema.safeParse(rest).success).toBe(true);

    const empty = planContent(3);
    empty.days[0]!.tasks = [];
    expect(studyPlanContentSchema.safeParse(empty).success).toBe(false);

    const crowded = {
      ...planContent(3),
      days: planContent(3).days.map((day, index) =>
        index === 0
          ? {
              ...day,
              tasks: Array.from(
                { length: LIMITS.maxPlanTasksPerDay + 1 },
                (_, taskIndex) => ({
                  title: `Tarea ${taskIndex}`,
                  minutes: 30,
                  type: 'practice' as const,
                }),
              ),
            }
          : day,
      ),
    };
    expect(studyPlanContentSchema.safeParse(crowded).success).toBe(false);
  });

  it('la respuesta final exige ids de tareas', () => {
    const content = planContent(3);
    const withTaskIds = {
      ...content,
      examDate: '2026-11-10',
      topics: [],
      days: content.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((task, index) => ({
          ...task,
          id: `d${day.day}-t${index + 1}`,
        })),
      })),
    };
    expect(
      studyPlanResponseSchema.safeParse({
        plan: withTaskIds,
        demo: true,
      }).success,
    ).toBe(true);
    expect(
      studyPlanResponseSchema.safeParse({
        plan: { ...withTaskIds, days: content.days },
        demo: true,
      }).success,
    ).toBe(false);
  });
});
