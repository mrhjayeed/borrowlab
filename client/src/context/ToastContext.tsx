import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
  success: (title: string, message?: string) => void;
  error: (titleOrError: string | any, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (titleOrError: string | any, message?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);

    let finalTitle = typeof titleOrError === 'string' ? titleOrError : '';
    let finalMessage = message;

    // Handle when an Error or ApiError object is passed directly
    if (typeof titleOrError === 'object' && titleOrError !== null) {
      if (titleOrError.reason) {
        finalTitle = titleOrError.message?.startsWith('Validation failed')
          ? 'Validation Failed'
          : 'Request Failed';
        finalMessage = titleOrError.reason;
      } else if (titleOrError.message) {
        finalTitle = titleOrError.message;
      } else {
        finalTitle = 'An unexpected error occurred';
      }
    }

    // If message is not provided and title contains a separator like ": ", split title & reason
    // Example: "Validation failed: Replacement value must be greater than 0 BDT"
    // -> Title: "Validation Failed", Message: "Replacement value must be greater than 0 BDT"
    if (!finalMessage && finalTitle && finalTitle.includes(': ')) {
      const colonIdx = finalTitle.indexOf(': ');
      const prefix = finalTitle.slice(0, colonIdx).trim();
      const reasonPart = finalTitle.slice(colonIdx + 2).trim();
      if (prefix && reasonPart) {
        finalTitle = prefix === 'Validation failed' ? 'Validation Failed' : prefix;
        finalMessage = reasonPart;
      }
    }

    setToasts((prev) => [...prev, { id, title: finalTitle, message: finalMessage, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (title, msg) => addToast(title, msg, 'success'),
        error: (titleOrError, msg) => addToast(titleOrError, msg, 'error'),
        info: (title, msg) => addToast(title, msg, 'info'),
      }}
    >
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-level-3 bg-white transition-all transform duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'border-emerald-200 text-slate-900 bg-white/95 backdrop-blur-sm shadow-emerald-500/5'
                : t.type === 'error'
                ? 'border-red-200 text-slate-900 bg-white/95 backdrop-blur-sm shadow-red-500/5'
                : 'border-slate-200 text-slate-900 bg-white/95 backdrop-blur-sm'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 leading-snug">{t.title}</div>
              {t.message && (
                <div className="text-xs text-slate-600 mt-1 leading-relaxed break-words whitespace-pre-line">
                  {t.message}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
