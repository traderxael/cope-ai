import { describe, expect, it } from 'vitest';
import {
  dismissToast,
  enqueueToast,
  visibleToast,
  type ToastMessage,
} from './toastQueue';

const aviso = (id: number, message: string): ToastMessage => ({
  id,
  message,
  tone: 'info',
});

describe('cola de avisos', () => {
  it('muestra el primer aviso de la cola', () => {
    const queue = enqueueToast([], aviso(1, 'Enfoque completado.'));
    expect(visibleToast(queue)?.message).toBe('Enfoque completado.');
  });

  it('no deja sin avisar cuando llega otro mientras hay uno en pantalla', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, aviso(1, 'Enfoque completado.'));
    queue = enqueueToast(queue, aviso(2, 'Listo para usarse sin conexión.'));

    expect(queue).toHaveLength(2);
    expect(visibleToast(queue)?.message).toBe('Enfoque completado.');
  });

  it('hace pasar al siguiente aviso cuando se descarta el primero', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, aviso(1, 'Enfoque completado.'));
    queue = enqueueToast(queue, aviso(2, 'Listo para usarse sin conexión.'));

    queue = dismissToast(queue, 1);

    expect(queue).toHaveLength(1);
    expect(visibleToast(queue)?.message).toBe('Listo para usarse sin conexión.');
  });

  it('descarta solo el aviso indicado', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, aviso(1, 'Uno'));
    queue = enqueueToast(queue, aviso(2, 'Dos'));
    queue = enqueueToast(queue, aviso(3, 'Tres'));

    queue = dismissToast(queue, 2);

    expect(queue.map((toast) => toast.id)).toEqual([1, 3]);
  });

  it('deja la cola vacía cuando no hay avisos', () => {
    expect(visibleToast([])).toBeNull();
  });
});
