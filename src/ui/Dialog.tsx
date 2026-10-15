import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { inertOutsideDialog } from './dialog-inert';

const DEFAULT_DIALOG_CLASS =
  'ui-dialog dark:bg-wood-900 border-wood-200 dark:border-wood-700 w-full max-w-sm rounded-xl border bg-white p-0 text-start shadow-2xl';

interface DialogProps {
  title: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  showHeader?: boolean;
  hiddenFromPrint?: boolean;
}

export function Dialog({
  title,
  closeLabel = 'Close',
  onClose,
  children,
  className,
  labelledBy,
  showHeader = true,
  hiddenFromPrint = false,
}: Readonly<DialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== dialogRef.current) openerRef.current = active;
  }, []);
  useFocusTrap(dialogRef, true, onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleBackdropClick);
    document.addEventListener('keydown', handleEscape);
    const releaseInert = inertOutsideDialog(dialog);
    return () => {
      releaseInert();
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
      document.removeEventListener('keydown', handleEscape);
      if (typeof dialog.close === 'function') {
        if (dialog.open) dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      // The focus trap restores the opener before this cleanup removes inert, so that call is ignored.
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
      className={className ? `ui-dialog ${className}` : DEFAULT_DIALOG_CLASS}
      data-print={hiddenFromPrint ? 'hide' : undefined}
    >
      {showHeader ? (
        <>
          <div className="border-wood-200 dark:border-wood-700 flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-wood-800 dark:text-wood-100 text-base font-semibold">{title}</h2>
            <button
              type="button"
              className="text-wood-400 hover:text-wood-700 min-h-11 min-w-11"
              onClick={onClose}
              aria-label={closeLabel}
            >
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
        </>
      ) : (
        children
      )}
    </dialog>
  );
}
