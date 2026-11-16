import { useEffect, useRef } from 'react';
import { logStudyMinutes } from './studyLog';

/**
 * Ventana sin actividad tras la cual el chat deja de contar para la meta
 * diaria: tener la app abierta sin escribir no es tiempo de estudio.
 */
export const CHAT_ACTIVE_WINDOW_MS = 75_000;

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
 * Decide si este tick debe sumar un minuto. Exige actividad *nueva* desde el
 * último minuto contado, para que un solo mensaje no sume varios minutos.
 */
export function shouldCountChatMinute(
  lastActivityAt: number,
  countedAt: number,
  now: number,
  visible: boolean,
): boolean {
  if (lastActivityAt <= countedAt) return false;
  return isChatStudyActive(lastActivityAt, now, visible);
}

/**
 * Suma un minuto por cada minuto con actividad nueva en el chat (pestaña
 * visible y mensaje enviado o respuesta recibida en la última ventana).
 */
export function useChatStudyMinutes(lastActivityAt: number): void {
  const activityRef = useRef(lastActivityAt);
  activityRef.current = lastActivityAt;
  const countedRef = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (
        shouldCountChatMinute(
          activityRef.current,
          countedRef.current,
          now,
          document.visibilityState === 'visible',
        )
      ) {
        countedRef.current = activityRef.current;
        logStudyMinutes(1);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}