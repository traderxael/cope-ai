import { useId } from 'react';
import type { BadgeIcon } from '../../lib/achievements';

interface BadgeArtProps {
  icon: BadgeIcon;
}

/**
 * Arte vectorial propio para cada insignia. Usa degradados radiales,
 * brillos especulares y sombras suaves para lograr un volumen similar al
 * de las insignias 3D, sin recursos de terceros.
 */
export function BadgeArt({ icon }: BadgeArtProps) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `astra-${icon}-${uid}-${name}`;

  switch (icon) {
    case 'rocket':
      return <Rocket id={id} />;
    case 'earth':
      return <Earth id={id} />;
    case 'moon':
      return <Moon id={id} />;
    case 'mars':
      return <Mars id={id} />;
    case 'jupiter':
      return <Jupiter id={id} />;
    case 'sun':
      return <Sun id={id} />;
    case 'asteroid':
      return <Asteroid id={id} />;
    case 'comet':
      return <Comet id={id} />;
    case 'nebula':
      return <Nebula id={id} />;
    case 'galaxy':
      return <Galaxy id={id} />;
    case 'supernova':
      return <Supernova id={id} />;
    case 'universe':
    default:
      return <Universe id={id} />;
  }
}

interface ArtProps {
  id: (name: string) => string;
}

function Rocket({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#dfe7ff" />
          <stop offset="100%" stopColor="#93a8e8" />
        </linearGradient>
        <linearGradient id={id('nose')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bff" />
          <stop offset="100%" stopColor="#5b6bff" />
        </linearGradient>
        <linearGradient id={id('fin')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6d8bff" />
          <stop offset="100%" stopColor="#3a4fd8" />
        </linearGradient>
        <linearGradient id={id('flame')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd36b" />
          <stop offset="55%" stopColor="#ff8a5c" />
          <stop offset="100%" stopColor="#ff5c7a" />
        </linearGradient>
        <radialGradient id={id('glass')} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#eafcff" />
          <stop offset="60%" stopColor="#4fd8ff" />
          <stop offset="100%" stopColor="#2b7bd6" />
        </radialGradient>
      </defs>

      <ellipse cx="50" cy="88" rx="20" ry="4.5" fill="#0b1020" opacity="0.28" />

      <path
        d="M50 12c10 8 15 20 15 33v20H35V45c0-13 5-25 15-33Z"
        fill={`url(#${id('body')})`}
      />
      <path
        d="M50 12c10 8 15 20 15 33v6c-3-14-8-24-15-31-7 7-12 17-15 31v-6c0-13 5-25 15-33Z"
        fill={`url(#${id('nose')})`}
      />
      <path d="M35 52 22 72h13V52Z" fill={`url(#${id('fin')})`} />
      <path d="M65 52 78 72H65V52Z" fill={`url(#${id('fin')})`} />
      <path
        d="M44 72c1 8 3 13 6 16 3-3 5-8 6-16H44Z"
        fill={`url(#${id('flame')})`}
      />
      <circle cx="50" cy="40" r="7.5" fill={`url(#${id('glass')})`} />
      <circle cx="47.6" cy="37.6" r="2.4" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

function Earth({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('sea')} cx="34%" cy="28%">
          <stop offset="0%" stopColor="#8fe6ff" />
          <stop offset="45%" stopColor="#3f8ff5" />
          <stop offset="100%" stopColor="#1b3f9e" />
        </radialGradient>
        <linearGradient id={id('land')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7bf0b4" />
          <stop offset="100%" stopColor="#2fbf7a" />
        </linearGradient>
      </defs>

      <ellipse
        cx="50"
        cy="50"
        rx="44"
        ry="13"
        fill="none"
        stroke="#9fc4ff"
        strokeWidth="3"
        opacity="0.55"
        transform="rotate(-24 50 50)"
      />
      <circle cx="50" cy="50" r="30" fill={`url(#${id('sea')})`} />
      <path
        d="M32 38c6-6 15-7 19-2 3 4-2 7-6 8-5 2-4 8-10 9-5 1-9-3-8-8 1-3 3-5 5-7Z"
        fill={`url(#${id('land')})`}
      />
      <path
        d="M58 54c5-3 12-2 14 3 2 4-2 8-7 8-4 0-6-3-8-6-1-2-1-4 1-5Z"
        fill={`url(#${id('land')})`}
      />
      <ellipse
        cx="40"
        cy="34"
        rx="12"
        ry="7"
        fill="#ffffff"
        opacity="0.42"
        transform="rotate(-28 40 34)"
      />
      <circle cx="39" cy="36" r="3" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}

function Moon({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('body')} cx="32%" cy="26%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#dfe3f2" />
          <stop offset="100%" stopColor="#9aa3c4" />
        </radialGradient>
      </defs>

      <ellipse
        cx="50"
        cy="50"
        rx="43"
        ry="11"
        fill="none"
        stroke="#cbd6f5"
        strokeWidth="2.5"
        opacity="0.45"
        transform="rotate(-20 50 50)"
      />
      <circle cx="50" cy="50" r="29" fill={`url(#${id('body')})`} />
      <circle cx="40" cy="42" r="6" fill="#b7bed6" opacity="0.65" />
      <circle cx="58" cy="58" r="8" fill="#b0b8d2" opacity="0.55" />
      <circle cx="60" cy="38" r="4" fill="#c2c9de" opacity="0.6" />
      <circle cx="44" cy="60" r="3.2" fill="#c2c9de" opacity="0.5" />
      <ellipse cx="38" cy="33" rx="11" ry="6" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}

function Mars({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('body')} cx="32%" cy="26%">
          <stop offset="0%" stopColor="#ffc9a3" />
          <stop offset="45%" stopColor="#e2724a" />
          <stop offset="100%" stopColor="#8c2f2a" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="30" fill={`url(#${id('body')})`} />
      <path
        d="M32 44c6-5 14-6 18-2 3 3-1 7-6 8-4 1-5 5-10 4-4-1-6-6-2-10Z"
        fill="#a4402f"
        opacity="0.6"
      />
      <path
        d="M58 58c5-2 11 0 12 4 1 4-4 7-8 6-4-1-7-7-4-10Z"
        fill="#9c3a2c"
        opacity="0.5"
      />
      <path
        d="M34 26c10 5 22 5 32 0-3-4-9-6-16-6s-13 2-16 6Z"
        fill="#fff4ea"
        opacity="0.75"
      />
      <ellipse cx="38" cy="34" rx="11" ry="6" fill="#ffffff" opacity="0.38" />
    </svg>
  );
}

function Jupiter({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('body')} cx="32%" cy="26%">
          <stop offset="0%" stopColor="#ffe6c9" />
          <stop offset="50%" stopColor="#d9a273" />
          <stop offset="100%" stopColor="#8a5a3c" />
        </radialGradient>
        <clipPath id={id('clip')}>
          <circle cx="50" cy="50" r="30" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="30" fill={`url(#${id('body')})`} />
      <g clipPath={`url(#${id('clip')})`}>
        <rect x="18" y="34" width="64" height="7" fill="#b97f56" opacity="0.65" />
        <rect x="18" y="46" width="64" height="9" fill="#f0d3b0" opacity="0.6" />
        <rect x="18" y="60" width="64" height="6" fill="#a9704c" opacity="0.55" />
        <ellipse cx="62" cy="54" rx="8" ry="5" fill="#d1604a" opacity="0.85" />
      </g>
      <ellipse cx="38" cy="32" rx="11" ry="6" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

function Sun({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('body')} cx="38%" cy="32%">
          <stop offset="0%" stopColor="#fff6d0" />
          <stop offset="45%" stopColor="#ffc85c" />
          <stop offset="100%" stopColor="#ff8a3c" />
        </radialGradient>
        <radialGradient id={id('glow')} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ff8a3c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="46" fill={`url(#${id('glow')})`} />
      <g stroke="#ffc85c" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M50 8v10M50 82v10M8 50h10M82 50h10" />
        <path d="M20 20l7 7M73 73l7 7M80 20l-7 7M27 73l-7 7" />
      </g>
      <circle cx="50" cy="50" r="26" fill={`url(#${id('body')})`} />
      <ellipse cx="41" cy="38" rx="10" ry="6" fill="#fffbe8" opacity="0.55" />
    </svg>
  );
}

function Asteroid({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('body')} cx="34%" cy="28%">
          <stop offset="0%" stopColor="#cfd6ea" />
          <stop offset="55%" stopColor="#8d95b4" />
          <stop offset="100%" stopColor="#4c5474" />
        </radialGradient>
      </defs>

      <path
        d="M50 20c13-4 28 3 32 15 4 13-4 28-16 33-13 6-30-2-34-15C28 39 37 24 50 20Z"
        fill={`url(#${id('body')})`}
      />
      <circle cx="42" cy="42" r="7" fill="#5f6788" opacity="0.6" />
      <circle cx="62" cy="52" r="5" fill="#5f6788" opacity="0.5" />
      <circle cx="52" cy="62" r="4" fill="#5f6788" opacity="0.45" />
      <ellipse cx="40" cy="32" rx="12" ry="6" fill="#ffffff" opacity="0.3" />
    </svg>
  );
}

function Comet({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('head')} cx="36%" cy="32%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#9ef0ff" />
          <stop offset="100%" stopColor="#3a7bff" />
        </radialGradient>
        <linearGradient id={id('tail')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7de6ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#5b6bff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M46 40 8 14c-2-1-3 2-1 3l20 22-18 4c-3 1-2 4 1 4l21 3-6 20c-1 3 3 4 4 1l10-20 14 14c2 2 4 0 3-2L44 44Z"
        fill={`url(#${id('tail')})`}
      />
      <circle cx="60" cy="44" r="21" fill={`url(#${id('head')})`} />
      <circle cx="53" cy="36" r="5" fill="#ffffff" opacity="0.85" />
      <circle cx="30" cy="24" r="2" fill="#ffffff" opacity="0.8" />
      <circle cx="22" cy="52" r="1.6" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

function Nebula({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('a')}>
          <stop offset="0%" stopColor="#ff9ad5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff9ad5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('b')}>
          <stop offset="0%" stopColor="#7cc6ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7cc6ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('c')}>
          <stop offset="0%" stopColor="#b69cff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#b69cff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="40" cy="46" rx="30" ry="26" fill={`url(#${id('a')})`} />
      <ellipse cx="64" cy="56" rx="28" ry="24" fill={`url(#${id('b')})`} />
      <ellipse cx="52" cy="38" rx="22" ry="20" fill={`url(#${id('c')})`} />
      <circle cx="52" cy="50" r="7" fill="#ffffff" opacity="0.9" />
      <circle cx="24" cy="26" r="1.8" fill="#ffffff" opacity="0.9" />
      <circle cx="76" cy="30" r="1.5" fill="#ffffff" opacity="0.75" />
      <circle cx="82" cy="70" r="1.7" fill="#ffffff" opacity="0.8" />
      <circle cx="20" cy="72" r="1.4" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}

function Galaxy({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('core')}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#ffe7b8" />
          <stop offset="100%" stopColor="#ff9f6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('arm')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9fd0ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a678ff" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <g transform="rotate(-22 50 50)">
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="15"
          fill="none"
          stroke={`url(#${id('arm')})`}
          strokeWidth="7"
          opacity="0.85"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="42"
          ry="15"
          fill="none"
          stroke={`url(#${id('arm')})`}
          strokeWidth="7"
          opacity="0.7"
          transform="rotate(62 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="13"
          fill="none"
          stroke="#6d8bff"
          strokeWidth="5"
          opacity="0.55"
          transform="rotate(120 50 50)"
        />
      </g>
      <circle cx="50" cy="50" r="22" fill={`url(#${id('core')})`} />
      <circle cx="50" cy="50" r="7" fill="#fff6de" />
      <circle cx="18" cy="20" r="1.4" fill="#ffffff" opacity="0.8" />
      <circle cx="84" cy="76" r="1.6" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

function Supernova({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('core')}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#ffe28a" />
          <stop offset="100%" stopColor="#ff5c7a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="44" fill={`url(#${id('core')})`} opacity="0.55" />
      <g stroke="#ffd36b" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M50 6v18M50 76v18M6 50h18M76 50h18" />
        <path d="M18 18l13 13M69 69l13 13M82 18L69 31M31 69L18 82" />
      </g>
      <g stroke="#ff8a5c" strokeWidth="2.6" strokeLinecap="round" opacity="0.75">
        <path d="M31 11l7 17M69 11l-7 17M11 31l17 7M89 31l-17 7" />
        <path d="M31 89l7-17M69 89l-7-17M11 69l17-7M89 69l-17-7" />
      </g>
      <circle cx="50" cy="50" r="14" fill="#fffdf2" />
    </svg>
  );
}

function Universe({ id }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" role="presentation">
      <defs>
        <radialGradient id={id('glow')}>
          <stop offset="0%" stopColor="#8fb4ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8fb4ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('arm')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d7e4ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a06bff" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="48" fill={`url(#${id('glow')})`} />
      <g transform="rotate(-18 50 50)">
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="12"
          fill="none"
          stroke={`url(#${id('arm')})`}
          strokeWidth="6"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="12"
          fill="none"
          stroke="#4fd8ff"
          strokeWidth="4"
          opacity="0.5"
          transform="rotate(90 50 50)"
        />
      </g>
      <circle cx="50" cy="50" r="8" fill="#ffffff" />
      <circle cx="50" cy="50" r="14" fill="#cfe0ff" opacity="0.35" />
      <g fill="#ffffff">
        <circle cx="14" cy="18" r="1.6" opacity="0.9" />
        <circle cx="86" cy="24" r="1.3" opacity="0.8" />
        <circle cx="78" cy="82" r="1.5" opacity="0.75" />
        <circle cx="22" cy="78" r="1.2" opacity="0.7" />
        <circle cx="68" cy="10" r="1.1" opacity="0.6" />
        <circle cx="10" cy="56" r="1.2" opacity="0.65" />
      </g>
    </svg>
  );
}
