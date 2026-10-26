import { useEffect } from 'react';
import { Icon } from './Icon';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, toast.action ? 8_000 : 5_000);
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
        onClick={onDismiss}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
