// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QuizResponse } from '../../../shared/types';
import type { PracticeResult } from '../../lib/storage';
import type { PracticeSession } from '../study/practice';
import { QuizCard } from './QuizCard';

function makeQuiz(): QuizResponse {
  return {
    demo: true,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index + 1}`,
      prompt: `Pregunta ${index + 1}`,
      options: ['Alfa', 'Beta', 'Gamma', 'Delta'] as [
        string,
        string,
        string,
        string,
      ],
      correctIndex: 0,
      explanation: `Explicación de la pregunta ${index + 1}.`,
    })),
  };
}

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'session-1',
    quiz: makeQuiz(),
    settings: { count: 5, difficulty: 'medium', timed: false },
    subject: 'math',
    level: 'secundaria',
    startedAt: Date.now(),
    ...overrides,
  };
}

function renderQuiz(
  session = makeSession(),
  onComplete = vi.fn(async (_result: PracticeResult) => true),
) {
  const onClose = vi.fn();
  const onRetry = vi.fn();
  const utils = render(
    <QuizCard
      session={session}
      label="Práctica de Matemáticas"
      onClose={onClose}
      onRetry={onRetry}
      retrying={false}
      online
      onComplete={onComplete}
    />,
  );
  return { ...utils, onClose, onRetry, onComplete };
}

describe('QuizCard', () => {
  it('oculta explicaciones y guarda un resultado una sola vez', async () => {
    const user = userEvent.setup();
    const { onComplete } = renderQuiz();
    expect(screen.queryByText(/Explicación de la pregunta 1/)).toBeNull();
    expect(screen.getByText('0 de 5')).toBeInTheDocument();

    for (let index = 1; index <= 5; index += 1) {
      const group = screen.getByRole('group', {
        name: new RegExp(`Pregunta ${index}`),
      });
      await user.click(within(group).getByText('Alfa'));
    }

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      subject: 'math',
      level: 'secundaria',
      difficulty: 'medium',
      questionCount: 5,
      score: 5,
      timed: false,
      answers: [0, 0, 0, 0, 0],
    });
    expect(screen.getByText('5 de 5')).toBeInTheDocument();
    expect(
      screen.getByText('Excelente. Dominás el tema.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Resultado guardado en este dispositivo.'),
    ).toBeInTheDocument();
  });

  it('informa si no se pudo guardar y permite reintentar', async () => {
    const user = userEvent.setup();
    const onComplete = vi
      .fn<(result: PracticeResult) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderQuiz(makeSession(), onComplete);

    for (let index = 1; index <= 5; index += 1) {
      const group = screen.getByRole('group', {
        name: new RegExp(`Pregunta ${index}`),
      });
      await user.click(within(group).getByText('Alfa'));
    }

    expect(
      await screen.findByText(
        'No se pudo guardar el resultado en este dispositivo.',
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Guardar de nuevo/ }),
    );
    expect(
      await screen.findByText('Resultado guardado en este dispositivo.'),
    ).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('da feedback y bloquea la pregunta al responder', async () => {
    const user = userEvent.setup();
    renderQuiz();
    const group = screen.getByRole('group', { name: /Pregunta 1/ });
    await user.click(within(group).getByText('Beta'));

    expect(screen.getByText(/No exactamente/)).toBeInTheDocument();
    expect(
      within(group).getByText('Alfa').closest('label'),
    ).toHaveClass('isCorrect');
    expect(
      within(group).getByText('Beta').closest('label'),
    ).toHaveClass('isWrong');
    expect(screen.getByText('1 de 5')).toBeInTheDocument();
  });

  it('permite otra práctica con la misma configuración', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderQuiz();
    for (let index = 1; index <= 5; index += 1) {
      const group = screen.getByRole('group', {
        name: new RegExp(`Pregunta ${index}`),
      });
      await user.click(within(group).getByText('Alfa'));
    }
    await user.click(screen.getByRole('button', { name: /Otra práctica/ }));
    expect(onRetry).toHaveBeenCalledWith({
      count: 5,
      difficulty: 'medium',
      timed: false,
    });
  });

  it('finaliza al agotarse el tiempo y registra el resultado', async () => {
    const session = makeSession({
      settings: { count: 5, difficulty: 'medium', timed: true },
      startedAt: Date.now() - 301_000,
    });
    const { onComplete } = renderQuiz(session);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      timed: true,
      durationSeconds: 300,
    });
    expect(await screen.findByText('Tiempo agotado')).toBeInTheDocument();
  });
});
