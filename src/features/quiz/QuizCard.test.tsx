// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QuizResponse } from '../../../shared/types';
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

function renderQuiz() {
  const onClose = vi.fn();
  const onRetry = vi.fn();
  const utils = render(
    <QuizCard
      quiz={makeQuiz()}
      label="Matemáticas · Secundaria"
      onClose={onClose}
      onRetry={onRetry}
      retrying={false}
    />,
  );
  return { ...utils, onClose, onRetry };
}

describe('QuizCard', () => {
  it('oculta explicaciones y respuestas correctas antes de responder', () => {
    renderQuiz();
    expect(screen.queryByText(/Explicación de la pregunta 1/)).toBeNull();
    expect(screen.getByText('0 de 5')).toBeInTheDocument();
  });

  it('da feedback al responder y bloquea la pregunta', async () => {
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

  it('calcula el puntaje final y permite otra práctica', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderQuiz();

    for (let index = 1; index <= 5; index += 1) {
      const group = screen.getByRole('group', {
        name: new RegExp(`Pregunta ${index}`),
      });
      await user.click(within(group).getByText('Alfa'));
    }

    expect(screen.getByText('5 de 5')).toBeInTheDocument();
    expect(
      screen.getByText('Excelente. Dominás el tema.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Otra práctica/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
