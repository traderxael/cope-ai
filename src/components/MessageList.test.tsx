// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StoredMessage } from '../lib/storage';
import { MessageList } from './MessageList';

function message(overrides: Partial<StoredMessage>): StoredMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'Hola',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('MessageList', () => {
  it('renderiza usuario y asistente con acciones', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const assistantContent = '## Respuesta\n\nTodo bien.';
    render(
      <MessageList
        conversationId="c1"
        messages={[
          message({ id: 'u1', content: 'Hola' }),
          message({
            id: 'a1',
            role: 'assistant',
            content: assistantContent,
          }),
        ]}
        streamingId={null}
        streaming={false}
        onRetry={vi.fn()}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Respuesta' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Copiar/ }));
    expect(onCopy).toHaveBeenCalledWith(assistantContent);
  });

  it('muestra el estado de escritura', () => {
    const { container } = render(
      <MessageList
        conversationId="c1"
        messages={[
          message({ id: 'u1', content: 'Hola' }),
          message({ id: 'a1', role: 'assistant', content: '' }),
        ]}
        streamingId="a1"
        streaming
        onRetry={vi.fn()}
        onCopy={vi.fn()}
      />,
    );
    expect(container.querySelector('.typingIndicator')).not.toBeNull();
    expect(
      screen.getByText('Cope está respondiendo.'),
    ).toBeInTheDocument();
  });

  it('ofrece reintentar cuando hay error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MessageList
        conversationId="c1"
        messages={[
          message({ id: 'u1', content: 'Hola' }),
          message({
            id: 'a1',
            role: 'assistant',
            content: 'No se pudo conectar.',
            error: true,
          }),
        ]}
        streamingId={null}
        streaming={false}
        onRetry={onRetry}
        onCopy={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo conectar.',
    );
    await user.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
