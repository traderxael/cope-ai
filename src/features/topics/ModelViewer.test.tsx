// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// jsdom no tiene WebGL: evitamos que el custom element intente crear un renderer.
vi.mock('@google/model-viewer', () => ({}));

import { installModelViewerMock } from '../../test/modelViewerMock';
import { ModelViewer } from './ModelViewer';

installModelViewerMock();

describe('ModelViewer', () => {
  it('renderiza el modelo con controles, rotación y texto alternativo', () => {
    const { container } = render(
      <ModelViewer src="/models/fisica.glb" preview="/models/preview/fisica.webp" label="Modelo 3D del átomo" />,
    );
    const viewer = container.querySelector('model-viewer');
    expect(viewer).toBeTruthy();
    expect(viewer!.getAttribute('src')).toBe('/models/fisica.glb');
    expect(viewer!.getAttribute('alt')).toBe('Modelo 3D del átomo');
    expect(viewer!.hasAttribute('camera-controls')).toBe(true);
    expect(viewer!.hasAttribute('auto-rotate')).toBe(true);
    expect(viewer!.getAttribute('shadow-intensity')).toBe('0.4');
    expect(screen.getByText(/Arrastrá para girar/)).toBeTruthy();
  });
});
