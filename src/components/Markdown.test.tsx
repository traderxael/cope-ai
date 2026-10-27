// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

const content = `# Título

Texto con $x^2$ y **negrita**.

\`\`\`ts
const x = 1;
\`\`\`

| A | B |
| - | - |
| 1 | 2 |

<script>window.__xss = true</script>

[malo](javascript:alert(1))`;

describe('Markdown', () => {
  it('renderiza markdown, matemáticas, tablas y código', () => {
    const { container } = render(<Markdown content={content} />);
    expect(
      screen.getByRole('heading', { name: 'Título' }),
    ).toBeInTheDocument();
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('.tableWrap')).not.toBeNull();
    expect(container.querySelector('.codeBlock')).not.toBeNull();
    expect(container.querySelector('.hljs')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /Copiar/ }),
    ).toBeInTheDocument();
  });

  it('renderiza imágenes externas con privacidad y carga diferida', () => {
    const { container } = render(
      <Markdown content="![Foto](https://ejemplo.com/foto.png)" />,
    );
    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('src', 'https://ejemplo.com/foto.png');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('no ejecuta HTML ni enlaces peligrosos', () => {
    const { container } = render(<Markdown content={content} />);
    expect(container.querySelector('script')).toBeNull();
    expect(
      (window as unknown as { __xss?: boolean }).__xss,
    ).toBeUndefined();
    expect(screen.getByText('malo').closest('a')).toBeNull();
  });

  it('no renderiza contenido vacío', () => {
    const { container } = render(<Markdown content="   " />);
    expect(container.firstChild).toBeNull();
  });
});
