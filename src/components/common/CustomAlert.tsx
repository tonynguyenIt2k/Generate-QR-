import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  Trash2,
  Check,
} from 'lucide-react';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

export interface ToastState {
  isOpen: boolean;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

interface ConfirmModalProps {
  state: ConfirmState;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ state, onClose }) => {
  if (!state.isOpen) return null;

  const type = state.type || 'danger';

  const iconMap = {
    danger: <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    info: <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
  };

  const bgIconMap = {
    danger: 'bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-800/60',
    warning: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
    info: 'bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60',
  };

  const buttonMap = {
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border shrink-0 ${bgIconMap[type]}`}>
            {iconMap[type]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {state.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              {state.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            {state.cancelText || 'Hủy Bỏ'}
          </button>
          <button
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            className={`px-5 py-2 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${buttonMap[type]}`}
          >
            <Check className="w-4 h-4" />
            <span>{state.confirmText || 'Xác Nhận'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastNotificationProps {
  state: ToastState;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ state, onClose }) => {
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    if (!state.isOpen) {
      setProgress(100);
      return;
    }

    // Trigger subtle haptic on mobile if supported
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }

    const startTime = Date.now();
    const duration = 3600; // 3.6s duration
    setProgress(100);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [state.isOpen, state.title, state.message]);

  if (!state.isOpen) return null;

  const type = state.type || 'success';

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-emerald-500/10',
      progressBar: 'bg-emerald-400',
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-rose-400" />,
      badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      glow: 'shadow-rose-500/10',
      progressBar: 'bg-rose-400',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      glow: 'shadow-amber-500/10',
      progressBar: 'bg-amber-400',
    },
    info: {
      icon: <Info className="w-4 h-4 text-sky-400" />,
      badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      glow: 'shadow-sky-500/10',
      progressBar: 'bg-sky-400',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      id="mobile-dynamic-toast-wrapper"
      className="fixed top-3 sm:top-5 inset-x-0 z-[9999] flex justify-center pointer-events-none px-3"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        id="mobile-dynamic-toast-card"
        onClick={onClose}
        className={`pointer-events-auto w-full max-w-sm sm:max-w-md bg-slate-950/92 dark:bg-slate-900/95 text-white backdrop-blur-2xl border border-white/15 dark:border-slate-700/80 rounded-2xl p-3 sm:p-3.5 shadow-2xl ${config.glow} flex items-start gap-3 transition-all duration-300 transform active:scale-[0.98] cursor-pointer overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 select-none ring-1 ring-white/10`}
      >
        {/* Left Glowing Icon Badge */}
        <div
          className={`p-2 rounded-xl border shrink-0 flex items-center justify-center ${config.badgeBg}`}
        >
          {config.icon}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight">
              {state.title}
            </h4>
          </div>
          {state.message && (
            <p className="text-[11px] sm:text-xs text-slate-300/90 font-normal leading-snug mt-0.5 line-clamp-2">
              {state.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 mt-0.5"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Dynamic Countdown Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${config.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
