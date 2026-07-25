import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Promise-based modal API. Keeps the app free of window.alert / window.confirm
 * / window.prompt — everything routes through a themed card that matches the
 * rest of the UI.
 *
 * Only one modal is shown at a time. If a second one is requested while another
 * is open, the second one queues.
 */
const ModalContext = createContext(null);

function makeId() {
  return `modal_${Math.random().toString(36).slice(2, 9)}`;
}

export function ModalProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const resolverMap = useRef(new Map());

  const current = queue[0] || null;

  const openModal = useCallback((spec) => {
    return new Promise((resolve) => {
      const id = makeId();
      resolverMap.current.set(id, resolve);
      setQueue((q) => [...q, { id, ...spec }]);
    });
  }, []);

  const close = useCallback((id, value) => {
    const resolve = resolverMap.current.get(id);
    if (resolve) {
      resolve(value);
      resolverMap.current.delete(id);
    }
    setQueue((q) => q.filter((m) => m.id !== id));
  }, []);

  const api = useMemo(
    () => ({
      confirm: (spec) => openModal({ kind: "confirm", ...spec }),
      promptInput: (spec) => openModal({ kind: "prompt", ...spec }),
      showCopyable: (spec) => openModal({ kind: "copyable", ...spec }),
      alert: (spec) => openModal({ kind: "alert", ...spec }),
    }),
    [openModal]
  );

  return (
    <ModalContext.Provider value={api}>
      {children}
      {current && <ModalHost modal={current} onClose={close} />}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}

function ModalHost({ modal, onClose }) {
  const {
    id,
    kind,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "default",
    label,
    defaultValue = "",
    placeholder,
    inputType = "text",
    text = "",
    dismissLabel = "Close",
  } = modal;

  const [inputValue, setInputValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);
  const primaryRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // reset local state when a new modal takes the slot
    setInputValue(defaultValue);
    setCopied(false);
  }, [id, defaultValue]);

  useEffect(() => {
    const target = kind === "prompt" ? inputRef.current : primaryRef.current;
    target?.focus();
    if (kind === "prompt" && inputRef.current) inputRef.current.select();
  }, [kind, id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        cancel();
      } else if (e.key === "Enter" && kind !== "prompt") {
        // For prompts, let the form's onSubmit handle it (input may still be focused)
        confirm();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind, inputValue]);

  function cancel() {
    if (kind === "confirm" || kind === "alert") onClose(id, false);
    else if (kind === "prompt") onClose(id, null);
    else onClose(id, undefined);
  }

  function confirm() {
    if (kind === "confirm") onClose(id, true);
    else if (kind === "prompt") onClose(id, inputValue);
    else onClose(id, undefined);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fall back to selecting the textarea so the user can Ctrl+C.
      textareaRef.current?.select();
    }
  }

  const primaryClass =
    tone === "danger"
      ? "btn-primary accent"
      : "btn-primary";

  return (
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="app-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={`${id}-title`} className="app-modal-title">
            {title}
          </h2>
        )}
        {message && <p className="app-modal-message">{message}</p>}

        {kind === "prompt" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            {label && <label className="app-modal-label">{label}</label>}
            <input
              ref={inputRef}
              type={inputType}
              className="text-input app-modal-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
            />
            <div className="app-modal-actions">
              <button type="button" className="btn" onClick={cancel}>
                {cancelLabel}
              </button>
              <button ref={primaryRef} type="submit" className="btn-primary">
                {confirmLabel}
              </button>
            </div>
          </form>
        )}

        {kind === "copyable" && (
          <>
            <textarea
              ref={textareaRef}
              className="text-input app-modal-textarea"
              value={text}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="app-modal-actions">
              <button type="button" className="btn" onClick={cancel}>
                {dismissLabel}
              </button>
              <button
                ref={primaryRef}
                type="button"
                className="btn-primary"
                onClick={copyToClipboard}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        )}

        {kind === "confirm" && (
          <div className="app-modal-actions">
            <button type="button" className="btn" onClick={cancel}>
              {cancelLabel}
            </button>
            <button
              ref={primaryRef}
              type="button"
              className={primaryClass}
              onClick={confirm}
            >
              {confirmLabel}
            </button>
          </div>
        )}

        {kind === "alert" && (
          <div className="app-modal-actions">
            <button ref={primaryRef} type="button" className="btn-primary" onClick={confirm}>
              {confirmLabel === "Confirm" ? "OK" : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
