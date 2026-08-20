import React, { useState } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { ModalPortal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  FileText,
  X,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { PurchaseOrder } from '../../types/procurement';

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  po: PurchaseOrder | null;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const formatDateIndo = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return { label: 'Draft / Pengajuan', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'approved':
      return { label: 'Disetujui (Approved)', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'partially_received':
      return { label: 'Diterima Sebagian', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'completed':
      return { label: 'Selesai (Done)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'cancelled':
      return { label: 'Dibatalkan', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const PurchaseOrderDetailModal: React.FC<PurchaseOrderDetailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  po,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Confirmation Modals
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  if (!po) return null;

  const statusCfg = getStatusBadge(po.status);

  const handleExecuteApprove = async () => {
    setIsApproveConfirmOpen(false);
    setError(null);
    setIsProcessing(true);
    try {
      await apiClient.patch(`/tenant/purchase-orders/${po.id}/approve`);
      toast.success(
        `Purchase Order ${po.po_number} berhasil disetujui! Draft penerimaan barang telah dibuat di menu Stok Masuk.`,
        'PO Disetujui'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Approve PO error:', err);
      setError(err.response?.data?.message || 'Gagal menyetujui purchase order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteCancel = async () => {
    setIsCancelConfirmOpen(false);
    setError(null);
    setIsProcessing(true);
    try {
      await apiClient.patch(`/tenant/purchase-orders/${po.id}/cancel`);
      toast.success(`Purchase Order ${po.po_number} telah dibatalkan.`, 'PO Dibatalkan');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Cancel PO error:', err);
      setError(err.response?.data?.message || 'Gagal membatalkan purchase order.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ModalPortal isOpen={isOpen} onClose={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-none">
                    {po.po_number}
                  </h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.bg}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Dibuat: {formatDateIndo(po.created_at)}</span>
                  {po.creator && <span>• Oleh: {po.creator.name}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PO Metadata Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Supplier Rekanan</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{po.supplier?.name || 'Tanpa Supplier Spesifik'}</span>
                </div>
                {po.supplier?.phone && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">Telp: {po.supplier.phone}</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Tanggal Pesanan</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDateOnly(po.order_date)}</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Estimasi Tiba: {formatDateOnly(po.expected_delivery_date)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Total Nilai Pemesanan</span>
                <span className="text-base font-extrabold text-amber-700 block">
                  {formatCurrency(po.total_amount)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {po.items?.length || 0} Jenis Bahan
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Bahan Baku</th>
                    <th className="px-4 py-2.5 text-center">Jumlah Dipesan</th>
                    <th className="px-4 py-2.5 text-center">Jumlah Diterima</th>
                    <th className="px-4 py-2.5 text-right">Harga Beli</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {po.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">{item.raw_material?.name}</p>
                            <span className="text-[10px] text-slate-400">{item.raw_material?.category}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                        {item.quantity_ordered} {item.raw_material?.unit}
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`font-extrabold px-2 py-0.5 rounded-md ${
                            Number(item.quantity_received) >= Number(item.quantity_ordered)
                              ? 'bg-emerald-100 text-emerald-800'
                              : Number(item.quantity_received) > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.quantity_received} {item.raw_material?.unit}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                        {formatCurrency(item.unit_price)}
                      </td>

                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {po.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900">
                <strong className="block font-semibold mb-0.5">Catatan PO:</strong>
                <p>{po.notes}</p>
              </div>
            )}

            {/* Approval Info */}
            {po.approved_by && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Disetujui oleh: <strong>{po.approver?.name || 'Manager'}</strong></span>
                </div>
                {po.approved_at && <span>Waktu: {formatDateIndo(po.approved_at)}</span>}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
            <div>
              {po.status === 'draft' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  disabled={isProcessing}
                  className="gap-1 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                >
                  <Ban className="w-3.5 h-3.5" /> Batalkan PO
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
                Tutup
              </Button>

              {po.status === 'draft' && (
                <Button
                  type="button"
                  onClick={() => setIsApproveConfirmOpen(true)}
                  isLoading={isProcessing}
                  className="gap-2 font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" /> Setujui (Approve) PO
                </Button>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* CUSTOM CONFIRMATION: APPROVE PO */}
      <ConfirmModal
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={handleExecuteApprove}
        title="Setujui Purchase Order?"
        message={
          <>
            Apakah Anda yakin ingin menyetujui <strong className="text-slate-900">{po.po_number}</strong>? Dokumen draft penerimaan barang (*Goods Receipt*) akan otomatis dibuat di modul <strong>Stok Masuk</strong>.
          </>
        }
        confirmText="Ya, Setujui PO"
        cancelText="Kembali"
        variant="primary"
        isLoading={isProcessing}
      />

      {/* CUSTOM CONFIRMATION: CANCEL PO */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleExecuteCancel}
        title="Batalkan Purchase Order?"
        message={
          <>
            Apakah Anda yakin ingin membatalkan <strong className="text-slate-900">{po.po_number}</strong>? Tindakan ini tidak dapat dibatalkan kembali.
          </>
        }
        confirmText="Ya, Batalkan"
        cancelText="Tutup"
        variant="danger"
        isLoading={isProcessing}
      />
    </>
  );
};
