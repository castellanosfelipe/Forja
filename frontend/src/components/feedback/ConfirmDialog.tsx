import { AlertTriangle } from 'lucide-react';
import { useId, useRef } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel(): void;
  onConfirm(): void | Promise<void>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      backdropClassName="dialog-backdrop"
      contentClassName="confirm-dialog"
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={cancelRef}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      onClose={onCancel}
    >
      <span className="dialog-icon" aria-hidden="true"><AlertTriangle size={24} /></span>
      <div>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </div>
      <div className="dialog-actions">
        <button ref={cancelRef} className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Conservar</button>
        <button className="danger-button" type="button" disabled={busy} onClick={() => void onConfirm()}>
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
