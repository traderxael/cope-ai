// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DuelDialog } from './DuelDialog';

vi.mock('../../lib/api', () => ({
  requestQuiz: vi.fn(async () => ({
    demo: true,
    questions: [
      {
        id: 'q1',
        prompt: '¿Cuánto es 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctIndex: 1,
        explanation: '4',
      },
    ],
  })),
}));

const tutor = { subject: 'math', level: 'secundaria' } as never;

describe('DuelDialog', () => {
  it('muestra el resultado y las estrellas al responder', async () => {
    const user = userEvent.setup();
    render(<DuelDialog open onClose={vi.fn()} tutor={tutor} online={false} />);
    expect(await screen.findByText('¿Cuánto es 2 + 2?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '4' }));
    expect(await screen.findByText(/Duelo perdido/)).toBeTruthy();
    expect(screen.getByText(/1 estrellas ganadas/)).toBeTruthy();
  });
});
