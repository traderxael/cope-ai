// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TUTOR } from '../../shared/types';
import type { Conversation } from '../lib/storage';
import { Sidebar } from './Sidebar';

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Fotosíntesis',
    mode: 'assistant',
    tutor: DEFAULT_TUTOR,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function renderSidebar(conversations: Conversation[]) {
  return render(
    <Sidebar
      conversations={conversations}
      demo={false}
      provider="pollinations"
      resolvedTheme="light"
      onSelect={vi.fn()}
      onNew={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
      onSettings={vi.fn()}
      onProgress={vi.fn()}
      onBadges={vi.fn()}
      onFocus={vi.fn()}
      onToggleTheme={vi.fn()}
    />,
  );
}

describe('Sidebar', () => {
  it('filtra conversaciones sin distinguir acentos ni mayúsculas', async () => {
    const user = userEvent.setup();
    renderSidebar([
      conversation(),
      conversation({ id: 'c2', title: 'Álgebra lineal' }),
    ]);

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar conversaciones' }),
      'ALGEBRA',
    );

    expect(screen.getByText('Álgebra lineal')).toBeInTheDocument();
    expect(screen.queryByText('Fotosíntesis')).not.toBeInTheDocument();
    expect(screen.getByText('Resultados')).toBeInTheDocument();
  });

  it('muestra el vacío de búsqueda y permite limpiarla', async () => {
    const user = userEvent.setup();
    renderSidebar([conversation()]);

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar conversaciones' }),
      'química',
    );

    expect(
      screen.getByText('No encontramos conversaciones con “química”.'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByText('Fotosíntesis')).toBeInTheDocument();
    expect(screen.getByText('Recientes')).toBeInTheDocument();
  });
});
