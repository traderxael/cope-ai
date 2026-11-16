// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BadgeArt } from './BadgeArt';
import type { BadgeIcon } from '../../lib/achievements';

describe('BadgeArt 3D', () => {
  it.each(['rocket', 'jupiter', 'universe'] as BadgeIcon[])(
    'muestra el render PNG de %s en lugar de un SVG',
    (icon) => {
      const { container } = render(<BadgeArt icon={icon} />);
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src') ?? '').toContain(icon);
      expect(img?.getAttribute('alt')).toBe('');
      expect(container.querySelector('svg')).toBeNull();
    },
  );
});