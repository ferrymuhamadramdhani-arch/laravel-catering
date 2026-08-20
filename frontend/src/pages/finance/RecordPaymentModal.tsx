import React, { useState, useEffect } from 'react';
import { ModalPortal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Invoice } from '../../types/finance';
import { formatCurrency } from '../../lib/utils';
import {
  CreditCard,
  X,
  Building2,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from '../../stores/toastStore';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'qris' | 'other'>('bank_transfer');
  const [destinationBank, setDestinationBank] = useState<string>('BCA 8881234567 - PT Berkah Catering');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = invoice ? Number(invoice.remaining_amount) : 0;
  const total = invoice ? Number(invoice.total_amount) : 0;

  useEffect(() => {
    if (invoice && isOpen) {
      setAmount(remaining > 0 ? remaining.toString() : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('bank_transfer');
      setReferenceNumber('');
      setNotes('');
      setError(null);
    }
  }, [invoice, isOpen, remaining]);

  if (!isOpen || !invoice) return null;

  const handleSetPresetPercentage = (pct: number) => {
    const calculated = Math.round((total * pct) / 100);
    const finalAmount = Math.min(calculated, remaining);
    setAmount(finalAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Masukkan nominal pembayaran yang valid (lebih dari Rp 0).');
      return;
    }

    if (numAmount > remaining) {
      setError(`Nominal pembayaran melebihi sisa tagihan (${formatCurrency(remaining)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/tenant/invoices/${invoice.id}/payments`, {
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        destination_bank_account: paymentMethod === 'bank_transfer' ? destinationBank : 'Kasir / Tunai',
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success(
        `Pembayaran sebesar ${formatCurrency(numAmount)} berhasil dicatat untuk faktur ${invoice.invoice_number}!`,
        'Pembayaran Diterima'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Record payment error:', err);
      setError(err.response?.data?.message || 'Gagal mencatat pembayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Catat Pembayaran Masuk</h2>
                <p className="text-xs text-slate-500">
                  Faktur: <span className="font-semibold text-slate-700">{invoice.invoice_number}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bill Summary Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Total Nilai Tagihan:</span>
                <strong className="text-slate-900 text-sm font-bold">{formatCurrency(total)}</strong>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-amber-700 font-medium block">Sisa Tagihan Belum Dibayar:</span>
                <strong className="text-amber-800 text-base font-extrabold">{formatCurrency(remaining)}</strong>
              </div>
            </div>

            {/* Quick Amount Percentage Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Nominal Pembayaran (Rp)</span>
                <span className="text-[10px] text-slate-400">Pilih cepat:</span>
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleSetPresetPercentage(25)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 font-medium text-slate-700 transition"
                >
                  DP 25%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetPercentage(50)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 font-medium text-slate-700 transition"
                >
                  DP 50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(remaining.toString())}
                  className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold hover:bg-amber-200 transition"
                >
                  Bayar Lunas (100%)
                </button>
              </div>

              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="1000"
                  min="1"
                  max={remaining}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 500000"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                >
                  <option value="bank_transfer">Transfer Bank (BCA / Mandiri / BRI)</option>
                  <option value="cash">Tunai / Cash Langsung</option>
                  <option value="qris">QRIS Dinamis / Statis</option>
                  <option value="other">Metode Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Destination Bank Account */}
            {paymentMethod === 'bank_transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Rekening Tujuan Katering
                </label>
                <select
                  value={destinationBank}
                  onChange={(e) => setDestinationBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800"
                >
                  <option value="BCA 8881234567 - PT Berkah Catering">BCA: 8881234567 (a.n PT Berkah Nusantara)</option>
                  <option value="Mandiri 1370098765432 - PT Berkah Catering">Mandiri: 1370098765432 (a.n PT Berkah Nusantara)</option>
                  <option value="BRI 01234567890 - PT Berkah Catering">BRI: 01234567890 (a.n PT Berkah Nusantara)</option>
                </select>
              </div>
            )}

            {/* Reference Number */}
            <div>
              <Input
                label="Nomor Referensi Transfer / No. Struk (Opsional)"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Contoh: TRX-BCA-987123 atau No. Kwitansi Manual"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan Pembayaran (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pembayaran DP 50% via m-BCA a.n Ibu Ratna..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 resize-none transition"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Konfirmasi Simpan Pembayaran
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
