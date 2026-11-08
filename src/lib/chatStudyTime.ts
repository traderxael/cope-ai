import { useEffect, useRef } from 'react';
import { logStudyMinutes } from './studyLog';

/**
 * Ventana sin actividad tras la cual el chat deja de contar para la meta
 * diaria: tener la app abierta sin escribir no es tiempo de estudio.
 */
export const CHAT_ACTIVE_WINDOW_MS = 5 * 60_000;

const TICK_MS = 60_000;

/** Decide si un minuto de chat cuenta para la meta diaria. */
export function isChatStudyActive(
  lastActivityAt: number,
  now: number,
  visible: boolean,
): boolean {
  if (!visible) return false;
  if (!Number.isFinite(lastActivityAt) || lastActivityAt <= 0) return false;
  const elapsed = now - lastActivityAt;
  return elapsed >= 0 && elapsed <= CHAT_ACTIVE_WINDOW_MS;
}

/**
 * Suma un minuto de estudio por cada minuto con el chat activo (pestaña
 * visible y un mensaje enviado o respuesta recibida dentro de la ventana).
 * El intervalo es estable: la actividad frecuente no lo reinicia.
 */
export function useChatStudyMinutes(lastActivityAt: number): void {
  const activityRef = useRef(lastActivityAt);
  activityRef.current = lastActivityAt;

  useEffect(() => {
    const id = window.setInterval(() => {
      const active = isChatStudyActive(
        activityRef.current,
        Date.now(),
        document.visibilityState === 'visible',
      );
      if (active) logStudyMinutes(1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}