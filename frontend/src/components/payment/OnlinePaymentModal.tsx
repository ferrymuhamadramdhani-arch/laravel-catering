import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  QrCode,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  X,
  ShieldCheck,
} from 'lucide-react';

interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderAmount?: number;
  onPaymentSuccess?: () => void;
}

export const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  orderAmount,
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'qris' | 'va'>('qris');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderNumber) {
      setIsLoading(true);
      setIsSuccess(false);
      apiClient
        .post('/public/payment-gateway/create-token', {
          order_number: orderNumber,
          amount: orderAmount,
        })
        .then((res) => {
          if (res.data?.data) {
            setPaymentData(res.data.data);
          }
        })
        .catch((err) => {
          console.error('Failed to create payment token:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, orderNumber, orderAmount]);

  if (!isOpen) return null;

  const handleCopyVa = (vaNumber: string, bank: string) => {
    navigator.clipboard.writeText(vaNumber);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleSimulatePayment = async (payType: string = 'qris') => {
    setIsSimulating(true);
    try {
      const res = await apiClient.post('/public/payment-gateway/simulate-pay', {
        order_number: orderNumber,
        amount: paymentData?.amount || orderAmount,
        payment_type: payType,
      });

      if (res.data?.success) {
        setIsSuccess(true);
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pembayaran Online Instan</h3>
              <p className="text-[10px] text-slate-400">No. Order: {orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Payment is Success */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <strong className="text-base font-black text-slate-900 block">
                Pembayaran Berhasil Dikonfirmasi!
              </strong>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Status tagihan dan pesanan Anda telah otomatis terverifikasi lunas oleh sistem.
              </p>
            </div>
            <Button onClick={onClose} className="w-full text-xs font-bold py-2.5">
              Selesai &amp; Tutup
            </Button>
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Mempersiapkan Jalur Pembayaran...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 block">
                  Total Tagihan
                </span>
                <strong className="text-xl font-black text-slate-900">
                  {formatCurrency(paymentData?.amount || orderAmount || 0)}
                </strong>
              </div>
              <Badge className="bg-amber-200/80 text-amber-900 border-amber-300 text-[10px]">
                Otomatis Terverifikasi
              </Badge>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab('qris')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'qris'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> QRIS Instan
              </button>
              <button
                onClick={() => setActiveTab('va')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'va'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Virtual Account
              </button>
            </div>

            {/* QRIS Tab Content */}
            {activeTab === 'qris' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="w-44 h-44 bg-white p-3 rounded-2xl shadow-inner border border-slate-200 mx-auto flex flex-col items-center justify-center">
                  {/* Generated QR Placeholder */}
                  <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-2 bg-slate-50">
                    <QrCode className="w-16 h-16 text-slate-800" />
                    <span className="text-[9px] font-mono text-slate-500 mt-1">QRIS NASIONAL</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Scan QRIS menggunakan BCA Mobile, GoPay, OVO, ShopeePay, atau m-Banking Anda.
                </p>
              </div>
            )}

            {/* VA Tab Content */}
            {activeTab === 'va' && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {paymentData?.payment_methods?.virtual_accounts?.map((va: any) => (
                  <div
                    key={va.bank}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">{va.bank} Virtual Account</strong>
                      <span className="text-sm font-mono font-bold text-amber-700">{va.va_number}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyVa(va.va_number, va.bank)}
                      className="gap-1 text-xs py-1 px-2.5 h-auto"
                    >
                      {copiedBank === va.bank ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Salin
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Sandbox Simulator Action Button */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Button
                onClick={() => handleSimulatePayment(activeTab === 'qris' ? 'qris' : 'bank_transfer')}
                disabled={isSimulating}
                className="w-full py-2.5 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Zap className="w-4 h-4" />
                {isSimulating ? 'Memverifikasi Pembayaran...' : '⚡ Simulasi Bayar Instan (Sandbox)'}
              </Button>
              <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Simulasi otomatis memicu Webhook settlement &amp; update invoice.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
