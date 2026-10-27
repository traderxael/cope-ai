import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PracticeResult } from './storage';
import {
  clearAllData,
  clearConversations,
  deleteConversation,
  deleteFlashcardDeck,
  deleteStudyPlan,
  getConversation,
  listConversations,
  listFlashcardDecks,
  listPracticeResults,
  listStudyPlans,
  makeConversation,
  newId,
  saveConversation,
  saveFlashcardDeck,
  savePracticeResult,
  saveStudyPlan,
  titleFromContent,
  deleteOralExam,
  listOralExams,
  saveOralExam,
  type FlashcardDeck,
  type OralExamSession,
  type StudyPlan,
} from './storage';

beforeEach(async () => {
  await clearAllData();
});

let sequence = 0;

function practiceResult(
  overrides: Partial<PracticeResult> = {},
): PracticeResult {
  sequence += 1;
  return {
    id: `practice-${sequence}`,
    subject: 'math',
    level: 'secundaria',
    difficulty: 'medium',
    questionCount: 5,
    timed: false,
    durationSeconds: 240,
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_000_000 + sequence,
    score: 4,
    questions: [],
    answers: [],
    ...overrides,
  };
}

function deck(overrides: Partial<FlashcardDeck> = {}): FlashcardDeck {
  sequence += 1;
  return {
    id: `deck-${sequence}`,
    title: 'Deck de prueba',
    subject: 'math',
    level: 'secundaria',
    cards: [
      {
        id: 'fc-1',
        front: 'Frente',
        back: 'Reverso',
        ease: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: 1_700_000_000_000,
      },
    ],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000 + sequence,
    ...overrides,
  };
}

function oralExam(overrides: Partial<OralExamSession> = {}): OralExamSession {
  sequence += 1;
  return {
    id: `oral-${sequence}`,
    config: {
      subject: 'math',
      level: 'secundaria',
      difficulty: 'medium',
      topics: [],
      count: 3,
    },
    personality: { preset: 'cope', name: 'Cope' },
    questions: [
      {
        id: 'q1',
        prompt: 'Pregunta oral de prueba.',
        expectedPoints: ['Punto uno', 'Punto dos'],
        rubric: 'Explica y justifica.',
      },
    ],
    answers: { q1: 'Una respuesta.' },
    status: 'in_progress',
    startedAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000 + sequence,
    ...overrides,
  };
}

function studyPlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  sequence += 1;
  return {
    id: `plan-${sequence}`,
    title: 'Plan de prueba',
    subject: 'math',
    level: 'secundaria',
    examDate: '2026-11-10',
    topics: [],
    days: [
      {
        day: 1,
        focus: 'Tema 1',
        tasks: [
          {
            id: 'd1-t1',
            title: 'Estudiar',
            minutes: 30,
            type: 'study',
            completed: false,
          },
        ],
      },
    ],
    createdAt: 1_700_000_000_000 + sequence,
    updatedAt: 1_700_000_000_000 + sequence,
    ...overrides,
  };
}

describe('conversations storage', () => {
  it('guarda, lista y ordena por actualización', async () => {
    const older = {
      ...makeConversation(),
      id: 'older',
      title: 'Vieja',
      updatedAt: 100,
    };
    const newer = {
      ...makeConversation(),
      id: 'newer',
      title: 'Nueva',
      updatedAt: 200,
    };
    await saveConversation(older);
    await saveConversation(newer);

    const listed = await listConversations();
    expect(listed.map((conversation) => conversation.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('sobrescribe y borra conversaciones', async () => {
    const conversation = { ...makeConversation(), id: 'uno', title: 'Antes' };
    await saveConversation(conversation);
    await saveConversation({ ...conversation, title: 'Después' });
    expect((await listConversations())[0]?.title).toBe('Después');

    await deleteConversation('uno');
    expect(await listConversations()).toEqual([]);
  });

  it('lee una conversación por id', async () => {
    await saveConversation({ ...makeConversation(), id: 'uno', title: 'Hola' });
    expect((await getConversation('uno'))?.title).toBe('Hola');
    expect(await getConversation('no-existe')).toBeUndefined();
  });

  it('vacía todo el historial', async () => {
    await saveConversation({ ...makeConversation(), id: 'a' });
    await saveConversation({ ...makeConversation(), id: 'b' });
    await clearConversations();
    expect(await listConversations()).toEqual([]);
  });
});

describe('helpers', () => {
  it('crea título corto a partir del contenido', () => {
    expect(titleFromContent('  Hola   mundo  ')).toBe('Hola mundo');
    expect(titleFromContent('   ')).toBe('Nueva conversación');
    expect(titleFromContent('a'.repeat(80))).toHaveLength(52);
    expect(titleFromContent('a'.repeat(80)).endsWith('…')).toBe(true);
  });

  it('genera ids únicos y conversaciones por defecto', () => {
    expect(newId()).not.toBe(newId());
    const conversation = makeConversation();
    expect(conversation.messages).toEqual([]);
    expect(conversation.mode).toBe('assistant');
    expect(conversation.title).toBe('Nueva conversación');
    expect(conversation.tutor.subject).toBe('math');
    expect(conversation.tutor.style).toBe('guided');
  });

  it('convierte un mensaje pendiente en error reintentable al recargar', async () => {
    const raw = await openDB('cope-ai', 3);
    await raw.put('conversations', {
      ...makeConversation(),
      id: 'interrumpida',
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: '',
          createdAt: 1,
          pending: true,
        },
      ],
    });
    raw.close();

    const conversation = await getConversation('interrumpida');
    expect(conversation?.messages[0]).toMatchObject({
      pending: false,
      error: true,
    });
    expect(conversation?.messages[0]?.content).toContain('se interrumpió');
  });

  it('normaliza el estilo del tutor al leer datos antiguos', async () => {
    const raw = await openDB('cope-ai', 3);
    const legacy = makeConversation();
    await raw.put('conversations', {
      ...legacy,
      id: 'legacy',
      tutor: { subject: 'physics', level: 'bachillerato' },
    });
    raw.close();

    expect((await getConversation('legacy'))?.tutor).toEqual({
      subject: 'physics',
      level: 'bachillerato',
      style: 'guided',
    });
  });
});

describe('practice results storage', () => {
  it('guarda y lista por finalización descendente', async () => {
    await savePracticeResult(
      practiceResult({ id: 'vieja', completedAt: 100 }),
    );
    await savePracticeResult(
      practiceResult({ id: 'nueva', completedAt: 300 }),
    );

    expect((await listPracticeResults()).map((item) => item.id)).toEqual([
      'nueva',
      'vieja',
    ]);
  });
});

describe('flashcard decks storage', () => {
  it('guarda, actualiza, lista y borra decks', async () => {
    await saveFlashcardDeck(deck({ id: 'uno', updatedAt: 100 }));
    await saveFlashcardDeck(deck({ id: 'dos', updatedAt: 200 }));
    await saveFlashcardDeck(deck({ id: 'uno', title: 'Actualizado', updatedAt: 300 }));

    const listed = await listFlashcardDecks();
    expect(listed.map((item) => item.id)).toEqual(['uno', 'dos']);
    expect(listed[0]?.title).toBe('Actualizado');

    await deleteFlashcardDeck('uno');
    expect((await listFlashcardDecks()).map((item) => item.id)).toEqual([
      'dos',
    ]);
  });
});

describe('study plans storage', () => {
  it('guarda, actualiza, lista y borra planes', async () => {
    await saveStudyPlan(studyPlan({ id: 'uno', createdAt: 100 }));
    await saveStudyPlan(studyPlan({ id: 'dos', createdAt: 200 }));
    await saveStudyPlan(
      studyPlan({
        id: 'uno',
        createdAt: 100,
        days: [
          {
            day: 1,
            focus: 'Actualizado',
            tasks: [
              {
                id: 'd1-t1',
                title: 'Tarea',
                minutes: 30,
                type: 'review',
                completed: true,
              },
            ],
          },
        ],
      }),
    );

    const listed = await listStudyPlans();
    expect(listed.map((item) => item.id)).toEqual(['dos', 'uno']);
    expect(listed[1]?.days[0]?.tasks[0]?.completed).toBe(true);

    await deleteStudyPlan('dos');
    expect((await listStudyPlans()).map((item) => item.id)).toEqual(['uno']);
  });
});

describe('oral exam storage', () => {
  it('guarda, lista y borra exámenes orales', async () => {
    await saveOralExam(oralExam({ id: 'uno', updatedAt: 100 }));
    await saveOralExam(oralExam({ id: 'dos', updatedAt: 200 }));

    const listed = await listOralExams();
    expect(listed.map((item) => item.id)).toEqual(['dos', 'uno']);

    await deleteOralExam('dos');
    expect((await listOralExams()).map((item) => item.id)).toEqual(['uno']);
  });
});

describe('clearAllData', () => {
  it('vacía conversaciones, prácticas, decks, planes y exámenes orales', async () => {
    await saveConversation(makeConversation());
    await savePracticeResult(practiceResult());
    await saveFlashcardDeck(deck());
    await saveStudyPlan(studyPlan());
    await saveOralExam(oralExam());

    await clearAllData();

    expect(await listConversations()).toEqual([]);
    expect(await listPracticeResults()).toEqual([]);
    expect(await listFlashcardDecks()).toEqual([]);
    expect(await listStudyPlans()).toEqual([]);
    expect(await listOralExams()).toEqual([]);
  });
});
