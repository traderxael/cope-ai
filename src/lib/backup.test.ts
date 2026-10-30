import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TUTOR } from '../../shared/types';
import { restoreBackup } from './backup';
import {
  clearAllData,
  listConversations,
  listPracticeResults,
  type Conversation,
} from './storage';

const valid: Conversation = {
  id: 'c1',
  title: 'Repaso de biología',
  mode: 'assistant',
  tutor: DEFAULT_TUTOR,
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: '¿Qué es la mitosis?',
      createdAt: 1,
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Es la división celular.',
      createdAt: 2,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

const practice = {
  id: 'p1',
  subject: 'math',
  level: 'secundaria',
  difficulty: 'medium',
  questionCount: 5,
  timed: false,
  durationSeconds: 300,
  startedAt: 1,
  completedAt: 2,
  score: 80,
  questions: [],
  answers: [],
};

const deck = {
  id: 'd1',
  title: 'Mazo',
  subject: 'math',
  level: 'secundaria',
  cards: [],
  createdAt: 1,
  updatedAt: 2,
};

const plan = {
  id: 'pl1',
  title: 'Plan',
  subject: 'math',
  level: 'secundaria',
  examDate: '2026-12-01',
  topics: [],
  days: [],
  createdAt: 1,
  updatedAt: 2,
};

const oralExam = {
  id: 'o1',
  config: {},
  personality: {},
  questions: [],
  answers: {},
  status: 'in_progress',
  startedAt: 1,
  updatedAt: 2,
};

function backupWith(overrides: Record<string, unknown[]> = {}): string {
  return JSON.stringify({
    app: 'cope-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations: [valid],
    practices: [practice],
    decks: [deck],
    plans: [plan],
    oralExams: [oralExam],
    ...overrides,
  });
}

beforeEach(async () => {
  await clearAllData();
});

describe('restoreBackup', () => {
  it('restaura todas las colecciones y omite entradas inválidas', async () => {
    const result = await restoreBackup(
      backupWith({ conversations: [valid, { id: 'rota' }] }),
    );
    expect(result).toEqual({
      conversations: 1,
      practices: 1,
      decks: 1,
      plans: 1,
      oralExams: 1,
      skipped: 1,
    });
    const stored = await listConversations();
    expect(stored.map((conversation) => conversation.title)).toEqual([
      'Repaso de biología',
    ]);
    expect(await listPracticeResults()).toHaveLength(1);
  });

  it('rechaza archivos que no son un respaldo de Cope', async () => {
    await expect(restoreBackup('{"app":"otra"}')).rejects.toThrow(
      /no es un respaldo válido/,
    );
    await expect(restoreBackup('no-json')).rejects.toThrow(
      /no es un JSON válido/,
    );
  });

  it('falla si no hay ningún dato válido', async () => {
    await expect(
      restoreBackup(
        backupWith({
          conversations: [{ id: 'rota' }],
          practices: [],
          decks: [],
          plans: [],
          oralExams: [],
        }),
      ),
    ).rejects.toThrow(/no tiene datos válidos/);
  });
});
