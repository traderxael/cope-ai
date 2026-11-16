// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LearningBadge } from '../../lib/learningBadges';
import { LearningConceptDialog } from './LearningConceptDialog';

const badge: LearningBadge = {
  id: 'pomodoro',
  label: 'Pomodoro',
  icon: 'pomodoro',
  source: 'focusSessions',
  target: 3,
  unlocked: true,
  current: 3,
  progress: 1,
  concept: {
    title: 'Bloques cortos, pausas reales',
    explanation: 'Trabajar en bloques breves y focalizados mantiene la atención y evita la fatiga mental.',
    application: '25 minutos de estudio y 5 de descanso.',
  },
};

describe('LearningConceptDialog', () => {
  it('muestra la explicación y la aplicación cuando está desbloqueada', () => {
    render(<LearningConceptDialog badge={badge} open onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Bloques cortos, pausas reales' })).toBeTruthy();
    expect(screen.getByText(badge.concept.explanation)).toBeTruthy();
    expect(screen.getByText(badge.concept.application)).toBeTruthy();
  });

  it('oculta la explicación y muestra un adelanto cuando está bloqueada', () => {
    render(
      <LearningConceptDialog
        badge={{ ...badge, unlocked: false, current: 1, progress: 1 / 3 }}
        open
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(badge.concept.explanation)).toBeNull();
    expect(screen.getByText(/Desbloqueá completando/)).toBeTruthy();
  });
});
