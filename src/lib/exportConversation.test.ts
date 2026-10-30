import { describe, expect, it } from 'vitest';
import { DEFAULT_TUTOR } from '../../shared/types';
import {
  conversationFileName,
  conversationToMarkdown,
} from './exportConversation';
import type { Conversation } from './storage';

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Álgebra lineal: repaso',
    mode: 'assistant',
    tutor: DEFAULT_TUTOR,
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Explícame la matriz inversa.',
        createdAt: Date.now(),
        attachments: [
          {
            id: 'a1',
            kind: 'pdf',
            name: 'clase.pdf',
            mime: 'application/pdf',
            size: 10,
          },
        ],
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'Una matriz es invertible si su determinante no es cero.',
        createdAt: Date.now(),
      },
    ],
    createdAt: new Date(2026, 9, 25, 10, 30).getTime(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('exportConversation', () => {
  it('genera Markdown con título, roles y adjuntos', () => {
    const markdown = conversationToMarkdown(conversation());
    expect(markdown).toContain('# Álgebra lineal: repaso');
    expect(markdown).toContain('## Vos');
    expect(markdown).toContain('Explícame la matriz inversa.');
    expect(markdown).toContain('## Cope');
    expect(markdown).toContain('Una matriz es invertible');
    expect(markdown).toContain('- Adjunto: clase.pdf (pdf)');
    expect(markdown.endsWith('\n')).toBe(true);
  });

  it('arma un nombre de archivo sin acentos y con fecha local', () => {
    expect(conversationFileName('Álgebra lineal: repaso', new Date(2026, 9, 25))).toBe(
      'cope-algebra-lineal-repaso-2026-10-25.md',
    );
    expect(conversationFileName('   ', new Date(2026, 0, 2))).toBe(
      'cope-conversacion-2026-01-02.md',
    );
  });
});
