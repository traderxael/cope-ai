import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TUTOR } from '../../shared/types';
import { restoreConversations } from './backup';
import {
  clearAllData,
  listConversations,
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

function backupWith(conversations: unknown[]): string {
  return JSON.stringify({
    app: 'cope-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations,
    practices: [],
    decks: [],
    plans: [],
    oralExams: [],
  });
}

beforeEach(async () => {
  await clearAllData();
});

describe('restoreConversations', () => {
  it('restaura las válidas y omite las inválidas', async () => {
    const result = await restoreConversations(
      backupWith([valid, { id: 'rota' }]),
    );
    expect(result).toEqual({ restored: 1, skipped: 1 });
    const stored = await listConversations();
    expect(stored.map((conversation) => conversation.title)).toEqual([
      'Repaso de biología',
    ]);
  });

  it('rechaza archivos que no son un respaldo de Cope', async () => {
    await expect(restoreConversations('{"app":"otra"}')).rejects.toThrow(
      /no es un respaldo válido/,
    );
    await expect(restoreConversations('no-json')).rejects.toThrow(
      /no es un JSON válido/,
    );
  });

  it('falla si no hay ninguna conversación válida', async () => {
    await expect(
      restoreConversations(backupWith([{ id: 'rota' }])),
    ).rejects.toThrow(/no tiene conversaciones válidas/);
  });
});
