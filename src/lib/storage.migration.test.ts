import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { listConversations } from './storage';

describe('IndexedDB v1 → v2', () => {
  it('conserva conversaciones, agrega los stores nuevos y completa el estilo', async () => {
    const legacy = await openDB('cope-ai', 1, {
      upgrade(db) {
        const store = db.createObjectStore('conversations', {
          keyPath: 'id',
        });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
    await legacy.put('conversations', {
      id: 'antigua',
      title: 'Conversación antigua',
      mode: 'tutor',
      tutor: { subject: 'chemistry', level: 'universidad' },
      messages: [],
      createdAt: 100,
      updatedAt: 200,
    });
    legacy.close();

    const conversations = await listConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.tutor.style).toBe('guided');

    const migrated = await openDB('cope-ai');
    const raw = await migrated.get('conversations', 'antigua');
    expect(raw.tutor.style).toBe('guided');

    const transaction = migrated.transaction(
      ['practiceResults', 'flashcardDecks', 'studyPlans'],
      'readonly',
    );
    expect(await transaction.objectStore('practiceResults').count()).toBe(0);
    expect(await transaction.objectStore('flashcardDecks').count()).toBe(0);
    expect(await transaction.objectStore('studyPlans').count()).toBe(0);
    migrated.close();
  });
});
