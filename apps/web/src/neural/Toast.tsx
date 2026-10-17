import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export function Toast({ message, duration = 2400 }: { message: string; duration?: number }) {
  return createPortal(
    <div
      className="neural document-state-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ '--toast-duration': `${duration}ms` } as CSSProperties}
    >
      {message}
    </div>,
    document.body,
  );
}
