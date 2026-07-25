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
  if (!state.isOpen) return null;

  const type = state.type || 'success';

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const borderMap = {
    success: 'border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100',
    error: 'border-red-500/40 bg-red-50/90 dark:bg-red-950/80 text-red-950 dark:text-red-100',
    warning: 'border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100',
    info: 'border-blue-500/40 bg-blue-50/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-100',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] animate-bounce-in max-w-sm w-full">
      <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 ${borderMap[type]}`}>
        <div className="shrink-0 mt-0.5">{iconMap[type]}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold">{state.title}</h4>
          {state.message && (
            <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
              {state.message}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
