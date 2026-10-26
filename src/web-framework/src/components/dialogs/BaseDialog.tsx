import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface BaseDialogProps {
  title: string;
  description?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  dismissible?: boolean;
  onClose: () => void;
}

export function BaseDialog({
  title,
  description,
  children,
  open = true,
  dismissible = true,
  onClose,
}: BaseDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closeRequested, setCloseRequested] = useState(false);
  const closing = closeRequested || !open;
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!closing || !dialog) return;
    // Keep unmounting in sync with the CSS animation, including reduced motion.
    const duration = Number.parseFloat(window.getComputedStyle(dialog).animationDuration) * 1000;
    const timeout = window.setTimeout(() => onCloseRef.current(), duration);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  function requestClose() {
    if (dismissible) setCloseRequested(true);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="kv-modal kv"
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="kv-modal-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <button
          type="button"
          className="kv-icon-button"
          aria-label="Close dialog"
          disabled={!dismissible || closing}
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </div>
      <div inert={closing || undefined}>
        {typeof children === "function" ? children(requestClose) : children}
      </div>
    </dialog>
  );
}
