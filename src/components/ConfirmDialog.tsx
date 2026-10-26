import type { ReactNode } from 'react';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="button ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={danger ? 'button danger' : 'button primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirmCopy">{description}</div>
    </Dialog>
  );
}
