import { useState, useEffect, useCallback } from "react";

let _addToast = () => {};

export function showToast(message, type = "info", duration = 4000) {
  _addToast({ message, type, duration, id: Date.now() + Math.random() });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setExiting(true), toast.duration - 300);
    const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, onRemove]);

  return (
    <div className={`toast toast-${toast.type} ${exiting ? "toast-exit" : "toast-enter"}`} role="alert">
      <span className="toast-icon" aria-hidden="true">
        {toast.type === "success" ? "\u2713" : toast.type === "error" ? "\u2717" : "\u2139"}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 300); }}
      >
        &times;
      </button>
    </div>
  );
}
