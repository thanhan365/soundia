import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto px-4 py-3 rounded-xl shadow-lg backdrop-blur-xl
              flex items-center gap-3 min-w-[280px] max-w-sm
              animate-slide-in border
              ${toast.type === "success"
                ? "bg-neon/10 border-neon/30 text-neon"
                : toast.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-white/5 border-white/10 text-gray-300"
              }
            `}
          >
            <span className="text-lg">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
