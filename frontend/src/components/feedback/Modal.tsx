import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface DocumentSnapshot {
  bodyOverflow: string;
  root: HTMLElement | null;
  rootAriaHidden: string | null;
  rootHadAriaHidden: boolean;
  rootHadInert: boolean;
  rootInert: boolean;
}

let documentLockCount = 0;
let documentSnapshot: DocumentSnapshot | null = null;
const modalStack: symbol[] = [];

export interface ModalProps {
  open: boolean;
  children: ReactNode;
  backdropClassName: string;
  contentClassName: string;
  labelledBy: string;
  describedBy?: string | undefined;
  role?: 'dialog' | 'alertdialog' | undefined;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  closeOnBackdrop?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

/**
 * Modal compartido: separa el diálogo de #root, aísla el fondo y mantiene
 * el foco dentro del contenido hasta que la persona lo cierra.
 */
export function Modal({
  open,
  children,
  backdropClassName,
  contentClassName,
  labelledBy,
  describedBy,
  role = 'dialog',
  initialFocusRef,
  returnFocusRef,
  closeOnBackdrop = true,
  closeOnEscape = true,
  onClose,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(Symbol('modal'));
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const initialFocusRefRef = useRef(initialFocusRef);
  const returnFocusRefRef = useRef(returnFocusRef);

  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;
  initialFocusRefRef.current = initialFocusRef;
  returnFocusRefRef.current = returnFocusRef;

  useLayoutEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const token = tokenRef.current;
    const activeElement = document.activeElement;
    const trigger = returnFocusRefRef.current?.current
      ?? (activeElement instanceof HTMLElement ? activeElement : null);
    let lastFocusedInside: HTMLElement | null = null;

    lockDocument();
    modalStack.push(token);

    const dialog = dialogRef.current;
    if (!dialog) {
      removeFromStack(token);
      unlockDocument();
      return;
    }

    const focusInitialElement = () => {
      const requested = initialFocusRefRef.current?.current;
      const target = requested && dialog.contains(requested)
        ? requested
        : getTabbableElements(dialog)[0] ?? dialog;
      target.focus();
      if (!dialog.contains(document.activeElement)) dialog.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(token)) return;

      if (event.key === 'Escape') {
        if (closeOnEscapeRef.current && onCloseRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      trapTab(event, dialog);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopModal(token)) return;
      const target = event.target;
      if (target instanceof HTMLElement && dialog.contains(target)) {
        lastFocusedInside = target;
        return;
      }

      const fallback = lastFocusedInside && dialog.contains(lastFocusedInside)
        ? lastFocusedInside
        : initialFocusRefRef.current?.current;
      if (fallback && dialog.contains(fallback)) fallback.focus();
      else focusInitialElement();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    focusInitialElement();

    return () => {
      const wasTopModal = isTopModal(token);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      removeFromStack(token);
      unlockDocument();

      const returnTarget = returnFocusRefRef.current?.current ?? trigger;
      if (wasTopModal && returnTarget?.isConnected) returnTarget.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnBackdrop) onCloseRef.current?.();
  };

  const keepReactKeyEventInsideModal = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') event.stopPropagation();
  };

  return createPortal(
    <div className={backdropClassName} role="presentation" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={contentClassName}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={keepReactKeyEventInsideModal}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function trapTab(event: KeyboardEvent, dialog: HTMLElement) {
  const tabbable = getTabbableElements(dialog);
  if (tabbable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const activeElement = document.activeElement;
  const currentIndex = tabbable.indexOf(activeElement as HTMLElement);
  if (currentIndex === -1) {
    event.preventDefault();
    (event.shiftKey ? tabbable[tabbable.length - 1] : tabbable[0])?.focus();
    return;
  }

  const leavingAtStart = event.shiftKey && currentIndex === 0;
  const leavingAtEnd = !event.shiftKey && currentIndex === tabbable.length - 1;
  if (!leavingAtStart && !leavingAtEnd) return;

  event.preventDefault();
  (leavingAtStart ? tabbable[tabbable.length - 1] : tabbable[0])?.focus();
}

function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && isVisible(element));

  const tabbableRadios = new Set<HTMLInputElement>();
  for (const element of elements) {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) continue;
    const group = elements.filter((candidate): candidate is HTMLInputElement => (
      candidate instanceof HTMLInputElement
      && candidate.type === 'radio'
      && candidate.name === element.name
      && candidate.form === element.form
    ));
    tabbableRadios.add(group.find((candidate) => candidate.checked) ?? group[0]!);
  }

  return elements
    .filter((element) => !(element instanceof HTMLInputElement)
      || element.type !== 'radio'
      || !element.name
      || tabbableRadios.has(element))
    .map((element, index) => ({ element, index }))
    .sort((left, right) => {
      const leftOrder = left.element.tabIndex > 0 ? left.element.tabIndex : Number.MAX_SAFE_INTEGER;
      const rightOrder = right.element.tabIndex > 0 ? right.element.tabIndex : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ element }) => element);
}

function isVisible(element: HTMLElement): boolean {
  if (element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    current = current.parentElement;
  }
  return true;
}

function isTopModal(token: symbol): boolean {
  return modalStack[modalStack.length - 1] === token;
}

function removeFromStack(token: symbol) {
  const index = modalStack.lastIndexOf(token);
  if (index >= 0) modalStack.splice(index, 1);
}

function lockDocument() {
  if (documentLockCount === 0) {
    const root = document.getElementById('root');
    documentSnapshot = {
      bodyOverflow: document.body.style.overflow,
      root,
      rootAriaHidden: root?.getAttribute('aria-hidden') ?? null,
      rootHadAriaHidden: root?.hasAttribute('aria-hidden') ?? false,
      rootHadInert: root?.hasAttribute('inert') ?? false,
      rootInert: root?.inert ?? false,
    };
    document.body.style.overflow = 'hidden';
    if (root) {
      root.inert = true;
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
    }
  }
  documentLockCount += 1;
}

function unlockDocument() {
  documentLockCount = Math.max(0, documentLockCount - 1);
  if (documentLockCount > 0 || !documentSnapshot) return;

  document.body.style.overflow = documentSnapshot.bodyOverflow;
  const { root } = documentSnapshot;
  if (root) {
    root.inert = documentSnapshot.rootInert;
    root.toggleAttribute('inert', documentSnapshot.rootHadInert);
    if (documentSnapshot.rootHadAriaHidden) {
      root.setAttribute('aria-hidden', documentSnapshot.rootAriaHidden ?? 'true');
    } else {
      root.removeAttribute('aria-hidden');
    }
  }
  documentSnapshot = null;
}
