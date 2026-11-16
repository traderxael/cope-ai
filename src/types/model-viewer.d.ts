import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        style?: CSSProperties;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'rotation-per-second'?: string;
        'shadow-intensity'?: string;
        exposure?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'interaction-prompt'?: string;
        loading?: string;
      };
    }
  }
}
