// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GenerationStatus } from '../lib/generationProgress';
import { GenerationProgress } from './GenerationProgress';

const waiting: GenerationStatus = {
  startedAt: Date.now() - 1000,
  firstTokenAt: null,
  chars: 0,
  promptChars: 1200,
};

describe('GenerationProgress', () => {
  it('anuncia la fase de espera y el ETA al lector de pantalla', () => {
    render(<GenerationProgress generation={waiting} provider="pollinations" />);
    const bar = screen.getByRole('progressbar', { name: 'Avance de la respuesta' });
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^Preparando la respuesta/);
    expect(bar.getAttribute('aria-valuenow')).toMatch(/^\d+$/);
    expect(screen.getByRole('status').textContent).toMatch(/Preparando la respuesta/);
  });

  it('anuncia la fase de escritura', () => {
    render(
      <GenerationProgress
        generation={{ ...waiting, firstTokenAt: Date.now() - 100, chars: 200 }}
        provider="openai"
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Avance de la respuesta' });
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^Escribiendo la respuesta/);
  });
});
