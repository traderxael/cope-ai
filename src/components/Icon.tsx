import type { ReactNode } from 'react';

export type IconName =
  | 'menu'
  | 'plus'
  | 'chat'
  | 'graduation'
  | 'sparkles'
  | 'paperclip'
  | 'arrowUp'
  | 'stop'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'trash'
  | 'pencil'
  | 'close'
  | 'book'
  | 'calculator'
  | 'flask'
  | 'atom'
  | 'check'
  | 'alert'
  | 'copy'
  | 'refresh'
  | 'chevronDown'
  | 'image'
  | 'file'
  | 'shield'
  | 'download'
  | 'info'
  | 'camera'
  | 'cards'
  | 'calendar'
  | 'chart'
  | 'timer'
  | 'target'
  | 'mic'
  | 'waveform'
  | 'volume'
  | 'search';

const PATHS: Record<IconName, ReactNode> = {
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 9.7 9.7 0 0 1-3.8-.8L3 21l1.8-5.1a8.4 8.4 0 1 1 16.2-4.4Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </>
  ),
  graduation: (
    <>
      <path d="M3 9l9-4 9 4-9 4-9-4Z" />
      <path d="M7 11.2V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-3.8" />
      <path d="M21 9.5v5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      <path d="M5 14l.6 1.7L7.5 16l-1.9.6L5 18.5l-.6-1.9L2.5 16l1.9-.3L5 14Z" />
    </>
  ),
  paperclip: (
    <path d="M20.5 11.5l-8.1 8.1a5.4 5.4 0 0 1-7.6-7.6l8.8-8.8a3.6 3.6 0 1 1 5.1 5.1l-8.8 8.8a1.8 1.8 0 1 1-2.6-2.6l8-8" />
  ),
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
  settings: (
    <>
      <path d="M4 7h7" />
      <path d="M15 7h5" />
      <circle cx="13" cy="7" r="2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.2A8.4 8.4 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6.5 7l.8 13h9.4l.8-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M8 6h8M8 10h6" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01M8 20h.01M12 20h.01M16 20h.01" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6l-5.2 8.6A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3.4L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(45 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-45 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
    </>
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  alert: (
    <>
      <path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.8-4L3 10" />
      <path d="M3 4v6h6" />
      <path d="M4 13a8 8 0 0 0 14.8 4L21 14" />
      <path d="M21 20v-6h-6" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-4.5-4.5L8 19" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6l8-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  cards: (
    <>
      <rect x="7" y="3" width="12" height="17" rx="2" />
      <path d="M5 7v13a2 2 0 0 0 2 2h8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  mic: (
    <>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M8 21h8" />
    </>
  ),
  waveform: (
    <>
      <path d="M4 10v4" />
      <path d="M8 7v10" />
      <path d="M12 4v16" />
      <path d="M16 8v8" />
      <path d="M20 11v2" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
      <path d="M18 6a8 8 0 0 1 0 12" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
