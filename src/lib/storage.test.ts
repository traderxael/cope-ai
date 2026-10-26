import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearConversations,
  deleteConversation,
  getConversation,
  listConversations,
  makeConversation,
  newId,
  saveConversation,
  titleFromContent,
} from './storage';

beforeEach(async () => {
  await clearConversations();
});

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
  });
});
