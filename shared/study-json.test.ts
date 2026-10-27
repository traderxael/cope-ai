import { describe, expect, it } from 'vitest';
import { parseFlashcardsJson, parseStudyPlanJson } from './study-json';

const cards = Array.from({ length: 6 }, (_, index) => ({
  front: `Pregunta ${index + 1}`,
  back: `Respuesta ${index + 1}`,
  explanation: `Explicación ${index + 1}`,
}));

function plan(days = 3) {
  return {
    title: 'Plan de repaso',
    days: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      focus: `Tema ${index + 1}`,
      tasks: [
        {
          title: `Estudiar tema ${index + 1}`,
          minutes: 30,
          type: 'study',
        },
      ],
    })),
  };
}

describe('parseFlashcardsJson', () => {
  it('extrae tarjetas de un objeto JSON con fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify({ cards })}\n\`\`\``;
    const parsed = parseFlashcardsJson(raw);
    expect(parsed).toHaveLength(6);
    expect(parsed?.[0]?.front).toBe('Pregunta 1');
  });

  it('rechaza formatos incompletos', () => {
    expect(parseFlashcardsJson('texto sin json')).toBeNull();
    expect(
      parseFlashcardsJson(JSON.stringify({ cards: cards.slice(0, 5) })),
    ).toBeNull();
    expect(
      parseFlashcardsJson(
        JSON.stringify({ cards: cards.map(({ front: _f, ...rest }) => rest) }),
      ),
    ).toBeNull();
  });
});

describe('parseStudyPlanJson', () => {
  it('acepta un plan con días únicos', () => {
    expect(parseStudyPlanJson(JSON.stringify(plan()))).toMatchObject({
      title: 'Plan de repaso',
    });
  });

  it('rechaza días repetidos o menos del mínimo', () => {
    const duplicated = plan();
    duplicated.days[2] = duplicated.days[0]!;
    expect(parseStudyPlanJson(JSON.stringify(duplicated))).toBeNull();

    expect(parseStudyPlanJson(JSON.stringify(plan(2)))).toBeNull();
  });

  it('rechaza texto sin JSON', () => {
    expect(parseStudyPlanJson('no hay plan')).toBeNull();
  });
});
