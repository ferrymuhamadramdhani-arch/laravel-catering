import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { ModalPortal } from '../../components/ui/Modal';
import {
  FilePlus,
  X,
  Plus,
  Trash2,
  Boxes,
  Building2,
  Calendar,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { RawMaterial } from '../../types/menu';
import type { Supplier } from '../../types/crm';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rawMaterials: RawMaterial[];
  suppliers: Supplier[];
}

interface ItemRow {
  raw_material_id: number | '';
  quantity_ordered: number | '';
  unit_price: number | '';
  notes: string;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rawMaterials,
  suppliers,
}) => {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { raw_material_id: '', quantity_ordered: '', unit_price: '', notes: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSupplierId('');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setExpectedDeliveryDate('');
      setNotes('');
      setItems([{ raw_material_id: '', quantity_ordered: '', unit_price: '', notes: '' }]);
    }
  }, [isOpen]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { raw_material_id: '', quantity_ordered: '', unit_price: '', notes: '' },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof ItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === 'raw_material_id') {
        const mat = rawMaterials.find((m) => m.id === Number(value));
        if (mat) {
          updated[idx].unit_price = mat.default_purchase_price ? Number(mat.default_purchase_price) : '';
        }
      }

      return updated;
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, it) => {
      const qty = Number(it.quantity_ordered) || 0;
      const price = Number(it.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = items.filter(
      (it) => it.raw_material_id !== '' && Number(it.quantity_ordered) > 0
    );

    if (validItems.length === 0) {
      setError('Harap masukkan minimal 1 bahan baku dengan jumlah pesanan lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId ? Number(supplierId) : undefined,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || undefined,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          raw_material_id: Number(it.raw_material_id),
          quantity_ordered: Number(it.quantity_ordered),
          unit_price: Number(it.unit_price) || 0,
          notes: it.notes.trim() || undefined,
        })),
      };

      const res = await apiClient.post('/tenant/purchase-orders', payload);

      toast.success(
        `Purchase order ${res.data.data.po_number} berhasil dibuat (Status: Draft).`,
        'PO Dibuat'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create PO error:', err);
      setError(err.response?.data?.message || 'Gagal membuat purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center border border-amber-200 shadow-xs">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-none">
                Buat Purchase Order (PO) Baru
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pemesanan bahan baku ke supplier untuk kebutuhan produksi dapur katering
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Dates Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Supplier Rekanan
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800 h-9"
              >
                <option value="">Pilih Supplier (Opsional)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.contact_person ? `(${s.contact_person})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Order *
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800 h-9"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Estimasi Tiba Gudang
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800 h-9"
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-600" /> Daftar Bahan Baku Dipesan *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 gap-1 py-1 h-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Bahan
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 w-5/12">Bahan Baku &amp; Stok Saat Ini</th>
                    <th className="px-4 py-2.5 text-center w-3/12">Jumlah Pesan *</th>
                    <th className="px-4 py-2.5 text-right w-3/12">Harga Beli Satuan (Rp)</th>
                    <th className="px-4 py-2.5 text-right w-2/12">Subtotal</th>
                    <th className="px-3 py-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((it, idx) => {
                    const selectedMat = rawMaterials.find((m) => m.id === Number(it.raw_material_id));
                    const subtotal = (Number(it.quantity_ordered) || 0) * (Number(it.unit_price) || 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        {/* Select Material */}
                        <td className="px-4 py-2.5">
                          <select
                            value={it.raw_material_id}
                            onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-medium text-slate-800 truncate"
                            required
                          >
                            <option value="">Pilih Bahan Baku...</option>
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit}) — Sisa Stok: {m.current_stock} {m.unit}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity Input */}
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0"
                              value={it.quantity_ordered}
                              onChange={(e) => handleItemChange(idx, 'quantity_ordered', e.target.value)}
                              className="w-20 px-2 py-1 text-center text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                              required
                            />
                            <span className="text-[11px] font-semibold text-slate-500 min-w-8 text-left">
                              {selectedMat?.unit || 'unit'}
                            </span>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            step="100"
                            min="0"
                            placeholder="Rp 0"
                            value={it.unit_price}
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            className="w-28 px-2 py-1 text-right text-xs font-medium text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                            required
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 text-xs">
                          {formatCurrency(subtotal)}
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors rounded"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan / Instruksi Khusus ke Supplier (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Tolong kirim sebelum jam 07:00 pagi..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 resize-none transition"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" /> Total Jenis Bahan:
                </span>
                <strong className="text-slate-900 font-bold">
                  {items.filter((i) => i.raw_material_id !== '').length} Jenis
                </strong>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="font-semibold text-slate-800">Estimasi Total PO:</span>
                <strong className="text-amber-700 font-extrabold text-base">
                  {formatCurrency(calculateTotal())}
                </strong>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <FilePlus className="w-4 h-4" /> Buat Purchase Order (Draft)
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
