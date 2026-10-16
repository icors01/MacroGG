import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, AlertCircle, X } from "lucide-react";

export const FeedbackContext = createContext(null);
export const useDialogFeedback = () => useContext(FeedbackContext);
let activeDialog = () => null;
export function registerDialogLookup(lookup) {
  activeDialog = lookup;
}

export function useFeedback() {
  const [toast, setToast] = useState(null);
  const [inline, setInline] = useState(null);
  const sequence = useRef(0);
  const clearDialog = useCallback(
    (id) => setInline((old) => (old?.dialogId === id ? null : old)),
    [],
  );
  const dismiss = useCallback(
    (id) => setToast((old) => (id == null || old?.id === id ? null : old)),
    [],
  );
  const clear = useCallback(() => {
    setToast(null);
    setInline(null);
  }, []);
  const notify = useCallback((message, type = "error", options = {}) => {
    const dialogId = options.scope || activeDialog();
    if (dialogId && (type === "error" || options.inline)) {
      setInline({ id: ++sequence.current, dialogId, message, type });
      return;
    }
    setInline(null);
    setToast({
      id: ++sequence.current,
      message,
      type,
      action: options.action,
      duration: type === "error" ? 0 : 2000,
    });
  }, []);
  useEffect(() => {
    if (!inline || inline.type === "error") return;
    const id = inline.id;
    const fade = setTimeout(
      () =>
        setInline((old) => (old?.id === id ? { ...old, fading: true } : old)),
      2000,
    );
    const remove = setTimeout(
      () => setInline((old) => (old?.id === id ? null : old)),
      2220,
    );
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [inline?.id, inline?.type]);
  return { toast, notify, dismiss, clear, context: { inline, clearDialog } };
}

export function Toast({ toast, onDismiss }) {
  const element = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [acting, setActing] = useState(false);
  const remaining = useRef(0);
  const actionLock = useRef(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    remaining.current = toast?.duration || 0;
    setHovered(element.current?.matches(":hover") || false);
    setFocused(element.current?.contains(document.activeElement) || false);
    setActing(false);
    actionLock.current = false;
  }, [toast?.id]);
  useEffect(() => {
    if (!toast?.duration || hovered || focused || hidden || acting) return;
    const start = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - start));
    };
  }, [toast?.id, hovered, focused, hidden, acting, onDismiss]);
  if (!toast) return null;
  return (
    <div
      className="toast-position"
      data-toast
      role="region"
      aria-label="Notification"
    >
      <div
        ref={element}
        className={`app-toast ${toast.type === "error" ? "toast-error" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onDismiss(toast.id);
          }
        }}
      >
        {toast.type === "error" ? (
          <AlertCircle size={17} />
        ) : (
          <Check size={17} />
        )}
        <p role={toast.type === "error" ? "alert" : "status"} key={toast.id}>
          {toast.message}
        </p>
        {toast.action && (
          <button
            type="button"
            className="toast-action"
            disabled={acting}
            onClick={async () => {
              if (actionLock.current) return;
              actionLock.current = true;
              setActing(true);
              try {
                if ((await toast.action.onClick()) !== false)
                  onDismiss(toast.id);
              } catch {
                /* Keep the action available; the caller reports the error. */
              } finally {
                actionLock.current = false;
                setActing(false);
              }
            }}
          >
            {acting ? "Undoing…" : toast.action.label}
          </button>
        )}
        <button
          type="button"
          className="toast-close"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
