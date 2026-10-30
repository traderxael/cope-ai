import { useEffect, useMemo, useState } from 'react';
import type { AiProvider } from '../lib/api';
import {
  etaLabel,
  estimateExpectedChars,
  estimateWaitMs,
  formatEta,
  remainingWriteMs,
  writingProgress,
  waitingProgress,
  type GenerationStatus,
} from '../lib/generationProgress';

interface GenerationProgressProps {
  generation: GenerationStatus | null;
  provider: AiProvider | null;
}

const TICK_MS = 250;

/**
 * Barra de carga de la generación: muestra el avance, la fase actual
 * ("preparando" o "escribiendo") y cuánto falta aproximadamente.
 */
export function GenerationProgress({
  generation,
  provider,
}: GenerationProgressProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!generation) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [generation]);

  const view = useMemo(() => {
    if (!generation) return null;
    const waitEstimate = estimateWaitMs(provider);
    const elapsed = now - generation.startedAt;
    const firstTokenAt = generation.firstTokenAt;

    if (firstTokenAt === null) {
      return {
        phase: 'waiting' as const,
        progress: waitingProgress(elapsed, waitEstimate),
        eta: etaLabel(elapsed, waitEstimate),
        label: 'Preparando la respuesta…',
        hint:
          provider === 'pollinations'
            ? 'La IA gratuita de nube puede tardar un poco en arrancar.'
            : 'Conectando con el modelo para iniciar la respuesta.',
      };
    }

    const writeElapsed = Math.max(1, now - firstTokenAt);
    const expected = estimateExpectedChars();
    const remainingMs = remainingWriteMs(
      generation.chars,
      writeElapsed,
      expected,
    );

    return {
      phase: 'writing' as const,
      progress: writingProgress(generation.chars, expected),
      eta:
        remainingMs > 0 && generation.chars < expected
          ? `quedan ~${formatEta(remainingMs)}`
          : 'casi listo',
      label: 'Escribiendo la respuesta…',
      hint: 'La respuesta llega en vivo: podés detenerla cuando quieras.',
    };
  }, [generation, now, provider]);

  if (!generation || !view) return null;

  const percent = Math.round(Math.min(1, Math.max(0, view.progress)) * 100);

  return (
    <div className="genProgress">
      <div className="genProgressTop">
        <span className="genProgressLabel">
          <span className="genProgressPulse" aria-hidden="true" />
          {view.label}
        </span>
        <span className="genProgressEta">{view.eta}</span>
      </div>
      <div
        className="genProgressTrack"
        role="progressbar"
        aria-label="Avance de la respuesta"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={
            view.phase === 'writing'
              ? 'genProgressFill isWriting'
              : 'genProgressFill'
          }
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="genProgressHint">{view.hint}</p>
    </div>
  );
}
