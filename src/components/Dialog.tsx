import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  variant?: 'modal' | 'drawer';
  hideHeader?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  variant = 'modal',
  hideHeader = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
          } catch {
            dialog.setAttribute('open', '');
          }
        } else {
          dialog.setAttribute('open', '');
        }
      }
      const timer = window.setTimeout(() => {
        const explicit = dialog.querySelector<HTMLElement>('[data-autofocus]');
        const target =
          explicit ??
          dialog.querySelector<HTMLElement>('input, select, textarea, button');
        (target ?? dialog).focus();
      }, 30);
      return () => window.clearTimeout(timer);
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    previousFocusRef.current?.focus?.();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={[
        'dialog',
        variant === 'drawer' ? 'dialogDrawer' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialogCard">
        {hideHeader ? (
          <h2 id={titleId} className="srOnly">
            {title}
          </h2>
        ) : (
          <header className="dialogHeader">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description ? (
                <p className="dialogDescription">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="iconButton"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </button>
          </header>
        )}
        <div className="dialogBody">{children}</div>
        {footer ? <footer className="dialogFooter">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
