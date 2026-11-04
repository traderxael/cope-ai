import { describe, expect, it } from 'vitest';
import {
  dismissToast,
  enqueueToast,
  visibleToast,
  type ToastMessage,
} from './toastQueue';

describe('cola de avisos', () => {
  it('muestra el primer aviso de la cola', () => {
    const queue = enqueueToast([], {
      message: 'Enfoque completado.',
      tone: 'info',
    });
    expect(visibleToast(queue)?.message).toBe('Enfoque completado.');
  });

  it('no deja sin avisar cuando llega otro mientras hay uno en pantalla', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, { message: 'Enfoque completado.', tone: 'info' });
    queue = enqueueToast(queue, {
      message: 'Listo para usarse sin conexión.',
      tone: 'success',
    });

    expect(queue).toHaveLength(2);
    expect(visibleToast(queue)?.message).toBe('Enfoque completado.');
  });

  it('da un id distinto a cada aviso aunque se agreguen en el mismo ciclo', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, { message: 'Sesión guardada.', tone: 'success' });
    queue = enqueueToast(queue, {
      message: 'Enfoque completado.',
      tone: 'success',
    });

    expect(queue[0].id).not.toBe(queue[1].id);
  });

  it('hace pasar al siguiente aviso cuando se descarta el primero', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, { message: 'Enfoque completado.', tone: 'info' });
    queue = enqueueToast(queue, {
      message: 'Listo para usarse sin conexión.',
      tone: 'success',
    });

    queue = dismissToast(queue, queue[0].id);

    expect(queue).toHaveLength(1);
    expect(visibleToast(queue)?.message).toBe('Listo para usarse sin conexión.');
  });

  it('descarta solo el aviso indicado', () => {
    let queue: ToastMessage[] = [];
    queue = enqueueToast(queue, { message: 'Uno', tone: 'info' });
    queue = enqueueToast(queue, { message: 'Dos', tone: 'info' });
    queue = enqueueToast(queue, { message: 'Tres', tone: 'info' });

    queue = dismissToast(queue, 2);

    expect(queue.map((toast) => toast.message)).toEqual(['Uno', 'Tres']);
  });

  it('deja la cola vacía cuando no hay avisos', () => {
    expect(visibleToast([])).toBeNull();
  });
});
