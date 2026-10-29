export type FocusPhase = 'focus' | 'break';

export const FOCUS_DURATIONS: Record<FocusPhase, number> = {
  focus: 25 * 60,
  break: 5 * 60,
};

export const FOCUS_LABELS: Record<FocusPhase, string> = {
  focus: 'Enfoque',
  break: 'Descanso',
};

export function phaseDuration(phase: FocusPhase): number {
  return FOCUS_DURATIONS[phase];
}

export function nextPhase(phase: FocusPhase): FocusPhase {
  return phase === 'focus' ? 'break' : 'focus';
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
