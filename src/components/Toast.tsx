import { useEffect } from 'react';
import { Icon } from './Icon';
import type { ToastMessage } from '../lib/toastQueue';

export type { ToastMessage, ToastTone } from '../lib/toastQueue';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: (id: number) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => onDismiss(toast.id),
      toast.action ? 8_000 : 5_000,
    );
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast-${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <Icon
        name={
          toast.tone === 'error'
            ? 'alert'
            : toast.tone === 'success'
              ? 'check'
              : 'info'
        }
        size={17}
      />
      <span>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          className="toastAction"
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="toastClose"
        aria-label="Cerrar aviso"
        onClick={() => onDismiss(toast.id)}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
