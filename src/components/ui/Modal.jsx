import React, { useEffect, useId, useRef } from "react";
import { useDialogFeedback, registerDialogLookup } from "./Feedback";
import { X } from "lucide-react";

const openDialogs = [];
let originalOverflow = "";
registerDialogLookup(
  () => [...openDialogs].sort((a, b) => a.zIndex - b.zIndex).at(-1)?.id || null,
);

export const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  allowClickOutside = false,
  zIndex = 50,
  showFeedbackError = true,
}) => {
  const titleId = useId();
  const feedback = useDialogFeedback();
  const clearDialog = feedback?.clearDialog;
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    if (!openDialogs.length) originalOverflow = document.body.style.overflow;
    const entry = { panel: panel.current, zIndex, id: titleId };
    openDialogs.push(entry);
    const top = () =>
      [...openDialogs].sort((a, b) => a.zIndex - b.zIndex).at(-1);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKeyDown = (event) => {
      if (top() !== entry) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key === "Tab") {
        const elements = [
          ...panel.current.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ),
          ...document.querySelectorAll("[data-toast] button:not(:disabled)"),
        ].filter((el) => el.getClientRects().length);
        const first = elements[0];
        const last = elements.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearDialog?.(titleId);
      document.removeEventListener("keydown", onKeyDown);
      openDialogs.splice(openDialogs.indexOf(entry), 1);
      if (!openDialogs.length) {
        document.body.style.overflow = originalOverflow;
        if (previous?.isConnected) previous.focus();
      } else if (!top().panel?.contains(document.activeElement)) {
        top().panel?.focus();
      }
    };
  }, [isOpen, zIndex, titleId, clearDialog]);
  if (!isOpen) return null;
  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex }}
      onClick={(e) => {
        if (allowClickOutside && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {showFeedbackError && feedback?.inline?.dialogId === titleId && (
          <p
            role={feedback.inline.type === "error" ? "alert" : "status"}
            className={`dialog-feedback ${feedback.inline.type === "error" ? "dialog-danger" : "dialog-accent"}`}
          >
            {feedback.inline.message}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};
