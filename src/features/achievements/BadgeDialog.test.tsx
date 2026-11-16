// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { dateOnlyFromEpochLocal } from '../../../shared/date';
import { BadgeDialog } from './BadgeDialog';
import { clearAllData, savePracticeResult, type PracticeResult } from '../../lib/storage';

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

beforeEach(async () => {
  window.localStorage.clear();
  await clearAllData();
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

  it('el hero muestra Marte como próxima insignia tras nueve días de estudio', async () => {
    const log: Record<string, number> = {};
    for (let i = 0; i < 9; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      log[dateOnlyFromEpochLocal(date.getTime())] = 10;
    }
    window.localStorage.setItem('cope-study-log-v1', JSON.stringify(log));
    render(<BadgeDialog open onClose={() => {}} />);
    await screen.findByText('Misiones');
    const hero = document.querySelector('.badgeHero');
    expect(hero?.querySelector('img')).toHaveAttribute('src', expect.stringContaining('mars'));
    expect(screen.getByRole('heading', { name: 'Racha actual: 9 días' })).toBeInTheDocument();
  });

  it('destaca la cifra de la racha sin perder el texto del encabezado', async () => {
    await savePracticeResult(result('a'));
    render(<BadgeDialog open onClose={() => {}} />);
    await screen.findByText('Misiones');
    const heading = screen.getByRole('heading', { name: 'Racha actual: 1 día' });
    expect(within(heading).getByText('1')).toBeInTheDocument();
  });

  it('cada misión muestra su porcentaje de avance real', async () => {
    await savePracticeResult(result('a'));
    render(<BadgeDialog open onClose={() => {}} />);
    await screen.findByText('Misiones');
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(4);
    for (const [index, percent] of ['100%', '33%', '10%', '25%'].entries()) {
      expect(within(bars[index]!.closest('li')!).getByText(percent)).toBeInTheDocument();
    }
  });

  it('sin actividad muestra el cohete inicial y cuatro misiones al cero por ciento', async () => {
    render(<BadgeDialog open onClose={() => {}} />);
    await screen.findByText('Misiones');
    expect(screen.getByRole('heading', { name: 'Empezá tu primera racha' })).toBeInTheDocument();
    expect(document.querySelector('.badgeHero img')).toHaveAttribute('src', expect.stringContaining('rocket'));
    expect(screen.getAllByText('0%')).toHaveLength(4);
  });
});
