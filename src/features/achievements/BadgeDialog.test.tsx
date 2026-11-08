// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeDialog } from './BadgeDialog';
import { savePracticeResult, type PracticeResult } from '../../lib/storage';

function result(id: string): PracticeResult {
  return {
    id,
    subject: 'math',
    level: 'secundaria',
    difficulty: 'medium',
    questionCount: 5,
    timed: false,
    durationSeconds: 300,
    startedAt: Date.now() - 1000,
    completedAt: Date.now(),
    score: 4,
    questions: [],
    answers: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('BadgeDialog misiones', () => {
  it('muestra la grilla Misiones con el avance de cada logro', async () => {
    await savePracticeResult(result('a'));
    await savePracticeResult(result('b'));
    await savePracticeResult(result('c'));
    render(<BadgeDialog open onClose={() => {}} />);
    expect(await screen.findByText('Misiones')).toBeInTheDocument();
    expect(screen.getByText('Constancia')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByText('Primer paso')).toBeInTheDocument();
  });
});