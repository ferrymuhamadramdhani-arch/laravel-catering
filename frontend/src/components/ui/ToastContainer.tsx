import React from 'react';
import { useToastStore, type ToastType } from '../../stores/toastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; text: string; iconColor: string; icon: React.FC<any> }
> = {
  success: {
    bg: 'bg-white',
    border: 'border-emerald-200 shadow-emerald-500/10',
    text: 'text-slate-800',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-200 shadow-red-500/10',
    text: 'text-slate-800',
    iconColor: 'text-red-600 bg-red-50 border-red-200',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-200 shadow-blue-500/10',
    text: 'text-slate-800',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Info,
  },
  warning: {
    bg: 'bg-white',
    border: 'border-amber-200 shadow-amber-500/10',
    text: 'text-slate-800',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border ${style.border} ${style.bg} shadow-xl flex items-start gap-3 transform transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${style.iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              {toast.title && (
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-600 mt-0.5 leading-snug break-words">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
