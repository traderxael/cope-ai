// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { StoredAttachment } from '../lib/storage';
import { Composer } from './Composer';

interface Overrides {
  value?: string;
  online?: boolean;
  streaming?: boolean;
  processing?: boolean;
  attachments?: StoredAttachment[];
  error?: string | null;
}

function renderComposer(overrides: Overrides = {}) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  const onAddFiles = vi.fn();
  const onRemoveAttachment = vi.fn();
  const onDismissError = vi.fn();

  function Wrapper() {
    const [value, setValue] = useState(overrides.value ?? 'Hola');
    return (
      <Composer
        value={value}
        onChange={setValue}
        onSend={onSend}
        onStop={onStop}
        attachments={overrides.attachments ?? []}
        onAddFiles={onAddFiles}
        onRemoveAttachment={onRemoveAttachment}
        processing={overrides.processing ?? false}
        streaming={overrides.streaming ?? false}
        online={overrides.online ?? true}
        error={overrides.error ?? null}
        onDismissError={onDismissError}
        placeholder="Preguntá lo que necesites…"
      />
    );
  }

  return {
    ...render(<Wrapper />),
    onSend,
    onStop,
    onAddFiles,
    onRemoveAttachment,
    onDismissError,
  };
}

describe('Composer', () => {
  it('envía con Enter y respeta Shift+Enter', async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();
    const textarea = screen.getByLabelText('Mensaje para Cope');

    await user.click(textarea);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el envío sin conexión, vacío o procesando', () => {
    const { unmount } = renderComposer({ value: 'Hola', online: false });
    expect(
      screen.getByRole('button', { name: 'Enviar mensaje' }),
    ).toBeDisabled();
    unmount();

    renderComposer({ value: '' });
    expect(
      screen.getByRole('button', { name: 'Enviar mensaje' }),
    ).toBeDisabled();
  });

  it('muestra detener durante el streaming', async () => {
    const user = userEvent.setup();
    const { onStop } = renderComposer({ streaming: true });
    await user.click(screen.getByRole('button', { name: 'Detener respuesta' }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Enviar mensaje' }),
    ).toBeNull();
  });

  it('adjunta archivos y permite quitarlos', async () => {
    const user = userEvent.setup();
    const attachment: StoredAttachment = {
      id: 'a1',
      kind: 'image',
      name: 'foto.png',
      mime: 'image/jpeg',
      size: 1024,
      dataUrl: 'data:image/jpeg;base64,AAAA',
    };
    const { container, onAddFiles, onRemoveAttachment } = renderComposer({
      value: '',
      attachments: [attachment],
    });

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    const file = new File(['abc'], 'nueva.png', { type: 'image/png' });
    await user.upload(input, file);
    expect(onAddFiles).toHaveBeenCalledWith([file]);

    await user.click(
      screen.getByRole('button', { name: 'Quitar foto.png' }),
    );
    expect(onRemoveAttachment).toHaveBeenCalledWith('a1');
  });

  it('muestra y cierra errores', async () => {
    const user = userEvent.setup();
    const { onDismissError } = renderComposer({
      error: 'El PDF es demasiado grande.',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El PDF es demasiado grande.',
    );
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(onDismissError).toHaveBeenCalledTimes(1);
  });
});
