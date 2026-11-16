// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopicsDialog } from './TopicsDialog';

vi.mock('@google/model-viewer', () => ({}));

import { installModelViewerMock } from '../../test/modelViewerMock';
installModelViewerMock();

describe('TopicsDialog', () => {
  it('muestra las áreas y los ocho temas', () => {
    render(<TopicsDialog open onClose={vi.fn()} />);
    expect(screen.getByText('Tecnología')).toBeTruthy();
    expect(screen.getByText('Ciencias')).toBeTruthy();
    expect(screen.getByText('Humanidades')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Motores de reacción' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Economía' })).toBeTruthy();
  });

  it('abre la ficha de un tema con fuente enlazada', async () => {
    const user = userEvent.setup();
    render(<TopicsDialog open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Motores de reacción' }));
    expect(await screen.findByRole('heading', { name: 'Qué es' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cómo funciona' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Un ejemplo' })).toBeTruthy();
    const viewer = document.querySelector('model-viewer');
    expect(viewer?.getAttribute('src')).toBe('/models/motor-reaccion.glb');
    const link = screen.getByRole('link', { name: /Wikipedia/ });
    expect(link.getAttribute('href')).toContain('wikipedia.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('vuelve al catálogo desde la ficha', async () => {
    const user = userEvent.setup();
    render(<TopicsDialog open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Artes' }));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('button', { name: 'Física' })).toBeTruthy();
  });
});
