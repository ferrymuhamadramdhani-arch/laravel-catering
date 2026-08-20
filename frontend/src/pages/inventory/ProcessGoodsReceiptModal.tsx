import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { ModalPortal } from '../../components/ui/Modal';
import {
  PackageCheck,
  X,
  Boxes,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { GoodsReceipt } from '../../types/procurement';

interface ProcessGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receipt: GoodsReceipt | null;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const ProcessGoodsReceiptModal: React.FC<ProcessGoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  receipt,
}) => {
  const [itemsMap, setItemsMap] = useState<{
    [itemId: number]: {
      quantity_received: number | string;
      unit_cost: number | string;
      notes: string;
    };
  }>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && receipt) {
      setError(null);
      setNotes('');
      const initialMap: any = {};
      receipt.items?.forEach((item) => {
        initialMap[item.id] = {
          quantity_received: item.quantity_expected,
          unit_cost: item.unit_cost,
          notes: '',
        };
      });
      setItemsMap(initialMap);
    }
  }, [isOpen, receipt]);

  if (!receipt) return null;

  const handleItemChange = (itemId: number, field: 'quantity_received' | 'unit_cost' | 'notes', value: any) => {
    setItemsMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const totalCalculatedCost = (receipt.items || []).reduce((sum, item) => {
    const it = itemsMap[item.id];
    const qty = it ? Number(it.quantity_received) || 0 : 0;
    const cost = it ? Number(it.unit_cost) || 0 : 0;
    return sum + qty * cost;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const itemsPayload = (receipt.items || []).map((item) => {
        const it = itemsMap[item.id];
        return {
          goods_receipt_item_id: item.id,
          quantity_received: Number(it?.quantity_received) || 0,
          unit_cost: Number(it?.unit_cost) || 0,
          notes: it?.notes || undefined,
        };
      });

      await apiClient.post(`/tenant/inventory/goods-receipts/${receipt.id}/receive`, {
        notes: notes.trim() || undefined,
        items: itemsPayload,
      });

      toast.success(
        `Penerimaan barang untuk ${receipt.receipt_number} berhasil dikonfirmasi! Stok gudang telah bertambah.`,
        'Penerimaan Barang Berhasil'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Goods receipt error:', err);
      setError(err.response?.data?.message || 'Gagal memproses penerimaan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-200">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-none">
                  Konfirmasi Penerimaan: {receipt.receipt_number}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  {receipt.purchase_order?.po_number || 'PO'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Supplier: <strong className="text-slate-700">{receipt.supplier?.name || receipt.purchase_order?.supplier?.name || 'Supplier'}</strong>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Petunjuk Verifikasi Fisik di Gudang:</strong>
              Periksa kuantitas dan kesegaran bahan yang tiba. Sesuaikan jumlah diterima jika ada selisih timbangan atau bahan yang ditolak/rusak. Klik <strong>Konfirmasi Terima</strong> untuk memasukkan saldo ke gudang.
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Bahan Baku</th>
                  <th className="px-4 py-2.5 text-center">Dipesan (PO)</th>
                  <th className="px-4 py-2.5 text-center w-36">Diterima Fisik *</th>
                  <th className="px-4 py-2.5 text-right w-36">Harga Satuan</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.items?.map((item) => {
                  const state = itemsMap[item.id] || {
                    quantity_received: item.quantity_expected,
                    unit_cost: item.unit_cost,
                    notes: '',
                  };
                  const subtotal = (Number(state.quantity_received) || 0) * (Number(state.unit_cost) || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">{item.raw_material?.name}</p>
                            <span className="text-[10px] text-slate-400">{item.raw_material?.category}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {item.quantity_expected} {item.raw_material?.unit}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.quantity_received}
                            onChange={(e) => handleItemChange(item.id, 'quantity_received', e.target.value)}
                            className="w-20 px-2 py-1 text-center font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                            required
                          />
                          <span className="text-[10px] text-slate-400">{item.raw_material?.unit}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={state.unit_cost}
                          onChange={(e) => handleItemChange(item.id, 'unit_cost', e.target.value)}
                          className="w-28 px-2 py-1 text-right font-medium text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white text-xs"
                          placeholder="Rp 0"
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-xs">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes & Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan Penerimaan / No. Surat Jalan Supplier
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Surat Jalan #SJ-9981 tiba jam 08:30 WIB, kondisi daging segar dan dingin..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Total Item Bahan:</span>
                <strong className="text-slate-900">{receipt.items?.length || 0} Jenis</strong>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="font-semibold text-slate-800">Total Nilai Penerimaan:</span>
                <strong className="text-emerald-700 font-extrabold text-base">
                  {formatCurrency(totalCalculatedCost)}
                </strong>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Konfirmasi Terima Barang (Masuk Gudang)
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
