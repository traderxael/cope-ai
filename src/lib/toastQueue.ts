/**
 * Cola de avisos (toasts).
 *
 * Los avisos se muestran de a uno, pero se encolan: si llega otro mientras
 * hay uno en pantalla, el nuevo espera su turno en lugar de pisar al
 * anterior. Antes un aviso de PWA ("listo para usarse sin conexión") podía
 * tapar y perder el "Enfoque completado" de una sesión de enfoque.
 */

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

/** Agrega un aviso al final de la cola, sin perder los que ya había. */
export function enqueueToast(
  queue: ToastMessage[],
  toast: ToastMessage,
): ToastMessage[] {
  return [...queue, toast];
}

/** Saca de la cola solo el aviso con ese id. */
export function dismissToast(
  queue: ToastMessage[],
  id: number,
): ToastMessage[] {
  return queue.filter((toast) => toast.id !== id);
}

/** El aviso que está en pantalla es el primero de la cola. */
export function visibleToast(queue: ToastMessage[]): ToastMessage | null {
  return queue[0] ?? null;
}
