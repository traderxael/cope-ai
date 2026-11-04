/**
 * Cola de avisos (toasts).
 *
 * Los avisos se muestran de a uno, pero se encolan: si llega otro mientras
 * hay uno en pantalla, el nuevo espera su turno en lugar de pisar al
 * anterior. Antes un aviso de PWA ("listo para usarse sin conexión") podía
 * tapar y perder el "Enfoque completado" de una sesión de enfoque.
 *
 * El `id` lo deriva la propia cola a partir de su contenido. Es importante
 * que sea así y no un contador externo: si dos avisos se agregan en el mismo
 * ciclo y el id se leyera más tarde (dentro de un updater de React), ambos
 * podrían recibir el mismo id y al descartar uno se perderían los dos.
 */

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

/** Agrega un aviso al final de la cola con un id propio. */
export function enqueueToast(
  queue: ToastMessage[],
  toast: Omit<ToastMessage, 'id'>,
): ToastMessage[] {
  const id = queue.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  return [...queue, { ...toast, id }];
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
