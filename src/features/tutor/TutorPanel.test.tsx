// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TutorConfig } from '../../../shared/types';
import { TutorPanel } from './TutorPanel';

const tutor: TutorConfig = {
  subject: 'math',
  level: 'secundaria',
  style: 'guided',
};

function renderPanel(overrides: Partial<Parameters<typeof TutorPanel>[0]> = {}) {
  const onChange = vi.fn();
  const onPractice = vi.fn();
  const onOpenFlashcards = vi.fn();
  const onOpenPlan = vi.fn();
  const onOpenOralExam = vi.fn();
  const onOpenProgress = vi.fn();
  const props = {
    tutor,
    onChange,
    online: true,
    onPractice,
    practiceLoading: false,
    onOpenFlashcards,
    onOpenPlan,
    onOpenOralExam,
    onOpenProgress,
    ...overrides,
  };
  const utils = render(<TutorPanel {...props} />);
  return {
    ...utils,
    onChange,
    onPractice,
    onOpenFlashcards,
    onOpenPlan,
    onOpenOralExam,
    onOpenProgress,
  };
}

describe('TutorPanel', () => {
  it('cambia el estilo del tutor', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();
    expect(screen.getByRole('button', { name: 'Socrático' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Solver' }));
    expect(onChange).toHaveBeenCalledWith({ style: 'solver' });
  });

  it('envía la configuración elegida al practicar', async () => {
    const user = userEvent.setup();
    const { onPractice } = renderPanel();

    await user.click(screen.getByRole('button', { name: '10' }));
    await user.selectOptions(
      screen.getByLabelText('Dificultad'),
      'hard',
    );
    await user.click(screen.getByRole('checkbox', { name: /Con tiempo/ }));
    await user.type(screen.getByLabelText(/Tema/), '  derivadas  ');
    await user.click(screen.getByRole('button', { name: 'Practicar' }));

    expect(onPractice).toHaveBeenCalledWith({
      count: 10,
      difficulty: 'hard',
      timed: true,
      examFormat: 'general',
      topic: 'derivadas',
    });
  });

  it('adjunta el material de la conversación a la práctica', async () => {
    const user = userEvent.setup();
    const { onPractice } = renderPanel({
      latestMaterial: 'La célula es la unidad de la vida.',
    });

    await user.click(
      screen.getByRole('checkbox', { name: /Usar el último material/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Practicar' }));

    expect(onPractice).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: 'La célula es la unidad de la vida.',
      }),
    );
  });

  it('deshabilita la práctica sin conexión o mientras genera', () => {
    const { unmount } = renderPanel({ online: false });
    expect(screen.getByRole('button', { name: 'Practicar' })).toBeDisabled();
    unmount();

    renderPanel({ practiceLoading: true });
    expect(
      screen.getByRole('button', { name: /Generando práctica/ }),
    ).toBeDisabled();
  });

  it('abre las herramientas de estudio', async () => {
    const user = userEvent.setup();
    const { onOpenFlashcards, onOpenPlan, onOpenOralExam, onOpenProgress } =
      renderPanel();

    await user.click(screen.getByRole('button', { name: 'Flashcards' }));
    await user.click(screen.getByRole('button', { name: 'Plan de examen' }));
    await user.click(screen.getByRole('button', { name: 'Examen oral' }));
    await user.click(screen.getByRole('button', { name: 'Progreso' }));

    expect(onOpenFlashcards).toHaveBeenCalledTimes(1);
    expect(onOpenPlan).toHaveBeenCalledTimes(1);
    expect(onOpenOralExam).toHaveBeenCalledTimes(1);
    expect(onOpenProgress).toHaveBeenCalledTimes(1);
  });
});
