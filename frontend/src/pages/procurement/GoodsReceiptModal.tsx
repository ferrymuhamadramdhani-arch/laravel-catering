import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import {
  PackageCheck,
  X,
  AlertCircle,
  Check,
  Building2,
} from 'lucide-react';
import type { PurchaseOrder } from '../../types/procurement';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onSuccess: () => void;
}

interface ReceivedItemInput {
  goods_receipt_item_id?: number;
  raw_material_id: number;
  material_name: string;
  unit: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  notes?: string;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess,
}) => {
  const [items, setItems] = useState<ReceivedItemInput[]>([]);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      setIsLoading(true);
      setErrorMsg(null);
      setNotes('');

      // Fetch latest PO detail with goods receipts
      apiClient
        .get(`/tenant/purchase-orders/${purchaseOrder.id}`)
        .then((res) => {
          const po = res.data?.data;
          if (po) {
            // Find active draft GoodsReceipt or construct items from PO items
            const draftReceipt = po.goods_receipts?.find(
              (gr: any) => gr.status === 'draft'
            );

            if (draftReceipt) {
              setReceiptId(draftReceipt.id);
              const mapped = draftReceipt.items?.map((it: any) => ({
                goods_receipt_item_id: it.id,
                raw_material_id: it.raw_material_id,
                material_name: it.raw_material?.name || 'Bahan Baku',
                unit: it.raw_material?.unit || 'kg',
                quantity_ordered: Number(it.quantity_expected || 0),
                quantity_received: Number(it.quantity_expected || 0),
                unit_cost: Number(it.unit_cost || 0),
                notes: '',
              })) || [];
              setItems(mapped);
            } else {
              setReceiptId(null);
              const mapped = po.items?.map((it: any) => ({
                raw_material_id: it.raw_material_id,
                material_name: it.raw_material?.name || 'Bahan Baku',
                unit: it.raw_material?.unit || 'kg',
                quantity_ordered: Number(it.quantity_ordered || 0),
                quantity_received: Number(it.quantity_ordered || 0),
                unit_cost: Number(it.unit_price || 0),
                notes: '',
              })) || [];
              setItems(mapped);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load PO details for receipt:', err);
          setErrorMsg('Gagal memuat detail barang untuk penerimaan.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, purchaseOrder]);

  if (!isOpen || !purchaseOrder) return null;

  const handleItemChange = (index: number, field: keyof ReceivedItemInput, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptId) {
      alert('Dokumen penerimaan draft tidak ditemukan untuk PO ini. Pastikan PO telah disetujui (Approved) terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        notes,
        items: items.map((it) => ({
          goods_receipt_item_id: it.goods_receipt_item_id,
          raw_material_id: it.raw_material_id,
          quantity_received: Number(it.quantity_received),
          unit_cost: Number(it.unit_cost),
          notes: it.notes || undefined,
        })),
      };

      const res = await apiClient.post(
        `/tenant/inventory/goods-receipts/${receiptId}/receive`,
        payload
      );

      if (res.data?.success) {
        alert('Penerimaan barang berhasil dikonfirmasi! Stok gudang telah bertambah.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to receive goods:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memproses penerimaan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReceivedValue = items.reduce(
    (acc, it) => acc + Number(it.quantity_received) * Number(it.unit_cost),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Konfirmasi Penerimaan Barang (Goods Receipt)
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Nomor PO: <strong>{purchaseOrder.po_number}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PO Info Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>
              Pemasok: <strong>{purchaseOrder.supplier?.name || 'Umum'}</strong>
            </span>
          </div>
          <div>
            <span>Tanggal Order: {purchaseOrder.order_date}</span>
          </div>
        </div>

        {/* Items Table */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat data barang PO...
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Bahan Baku</th>
                    <th className="py-2.5 px-3 text-right">Dipesan</th>
                    <th className="py-2.5 px-3 text-right">Jumlah Diterima</th>
                    <th className="py-2.5 px-3 text-right">Harga Beli / Satuan</th>
                    <th className="py-2.5 px-3 text-right">Total Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={it.raw_material_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {it.material_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {it.quantity_ordered} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={it.quantity_received}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity_received', e.target.value)
                            }
                            className="w-24 px-2 py-1 text-right font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-slate-400 text-[11px]">{it.unit}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={it.unit_cost}
                          onChange={(e) =>
                            handleItemChange(idx, 'unit_cost', e.target.value)
                          }
                          className="w-28 px-2 py-1 text-right font-mono text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(it.quantity_received) * Number(it.unit_cost))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Catatan Penerimaan / No. Surat Jalan Supplier:
            </label>
            <input
              type="text"
              placeholder="Contoh: Surat Jalan SJ-2026-098, kondisi barang segar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-xs text-slate-500 block">Total Nilai Penerimaan:</span>
              <strong className="text-sm font-mono font-black text-slate-900">
                {formatCurrency(totalReceivedValue)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || items.length === 0}
                className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Masuk Gudang'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
