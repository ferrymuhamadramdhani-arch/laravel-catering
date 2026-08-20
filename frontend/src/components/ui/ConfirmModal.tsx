import React from 'react';
import { ModalPortal } from './Modal';
import { Button } from './Button';
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  ShieldCheck,
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'primary',
  isLoading = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-100 border-rose-200',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100 border-amber-200',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100 border-emerald-200',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      default:
        return {
          icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-100 border-blue-200',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${vStyles.iconBg}`}
          >
            {vStyles.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {message}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-end items-center gap-2.5 mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isLoading}
            className={`text-xs font-bold ${vStyles.btnClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
};
