import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import {
  FOCUS_LABELS,
  formatClock,
  nextPhase,
  phaseDuration,
  type FocusPhase,
} from '../lib/focus';

interface FocusDialogProps {
  open: boolean;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export function FocusDialog({ open, onClose, onNotify }: FocusDialogProps) {
  const [phase, setPhase] = useState<FocusPhase>('focus');
  const [remaining, setRemaining] = useState(phaseDuration('focus'));
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const endAt = endAtRef.current;
      if (endAt === null) return;
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left > 0) return;

      endAtRef.current = null;
      setRunning(false);
      const finished = phase;
      if (finished === 'focus') {
        setSessions((previous) => previous + 1);
        onNotify('Enfoque completado. Tomate un descanso.');
      } else {
        onNotify('Descanso terminado. Volvamos al enfoque.');
      }
      const next = nextPhase(finished);
      setPhase(next);
      setRemaining(phaseDuration(next));
    };

    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [onNotify, phase, running]);

  const start = () => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const pause = () => {
    const endAt = endAtRef.current;
    if (endAt !== null) {
      setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    }
    endAtRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    endAtRef.current = null;
    setRunning(false);
    setRemaining(phaseDuration(phase));
  };

  const changePhase = (next: FocusPhase) => {
    endAtRef.current = null;
    setRunning(false);
    setPhase(next);
    setRemaining(phaseDuration(next));
  };

  const total = phaseDuration(phase);
  const progress = Math.round(((total - remaining) / total) * 100);
  const phaseLabel = FOCUS_LABELS[phase];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Modo enfoque"
      description="Trabajá en bloques y descansá. El temporizador sigue si cerrás el panel."
      className="focusDialog"
    >
      <div className="focusTabs" role="group" aria-label="Fase">
        {(['focus', 'break'] as FocusPhase[]).map((value) => (
          <button
            key={value}
            type="button"
            className={
              phase === value ? 'focusTab isActive' : 'focusTab'
            }
            aria-pressed={phase === value}
            disabled={running}
            onClick={() => changePhase(value)}
          >
            {FOCUS_LABELS[value]} · {phaseDuration(value) / 60} min
          </button>
        ))}
      </div>

      <p className="focusPhase">
        {running ? `${phaseLabel} en curso` : `Listo para ${phaseLabel.toLowerCase()}`}
      </p>
      <strong
        className="focusClock"
        role="timer"
        aria-label={`Tiempo restante de ${phaseLabel.toLowerCase()}`}
      >
        {formatClock(remaining)}
      </strong>
      <div
        className="progressBar focusProgress"
        role="progressbar"
        aria-label="Progreso del bloque"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="focusSessions">
        {sessions === 1
          ? '1 sesión de enfoque completada.'
          : `${sessions} sesiones de enfoque completadas.`}
      </p>

      <div className="focusActions">
        <button
          type="button"
          className="button primary"
          onClick={running ? pause : start}
        >
          <Icon name={running ? 'stop' : 'timer'} size={17} />
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" className="button ghost" onClick={reset}>
          Reiniciar
        </button>
      </div>
    </Dialog>
  );
}
