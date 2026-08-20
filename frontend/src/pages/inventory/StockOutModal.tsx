import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/ui/Modal';
import {
  ArrowUpRight,
  X,
  Boxes,
  FileText,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { RawMaterial } from '../../types/menu';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rawMaterials: RawMaterial[];
  preselectedMaterialId?: number | null;
}

const OUT_REASONS = [
  { value: 'waste_damage', label: 'Bahan Rusak / Busuk / Cacat' },
  { value: 'expired', label: 'Kadaluarsa / Basi' },
  { value: 'order_usage', label: 'Pemakaian Produksi / Masak' },
  { value: 'manual', label: 'Pengurangan Manual / Lain-lain' },
];

export const StockOutModal: React.FC<StockOutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rawMaterials,
  preselectedMaterialId,
}) => {
  const [materialId, setMaterialId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [reason, setReason] = useState('waste_damage');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setQuantity('');
      setReason('waste_damage');
      setNotes('');
      if (preselectedMaterialId) {
        setMaterialId(preselectedMaterialId);
      } else if (rawMaterials.length > 0) {
        setMaterialId(rawMaterials[0].id);
      }
    }
  }, [isOpen, preselectedMaterialId, rawMaterials]);

  const selectedMaterial = rawMaterials.find((m) => m.id === Number(materialId));
  const currentStock = Number(selectedMaterial?.current_stock) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(quantity);
    if (!materialId || !qtyNum || qtyNum <= 0) {
      setError('Pilih bahan baku dan masukkan kuantitas pengeluaran yang valid.');
      return;
    }

    if (qtyNum > currentStock) {
      if (
        !confirm(
          `Peringatan: Jumlah keluar (${qtyNum} ${selectedMaterial?.unit}) melebihi stok yang tercatat di sistem (${currentStock} ${selectedMaterial?.unit}). Stok akan menjadi 0. Lanjutkan?`
        )
      ) {
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/tenant/inventory/stock-out', {
        raw_material_id: Number(materialId),
        quantity: qtyNum,
        reference_type: reason,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Pengeluaran stok "${selectedMaterial?.name}" sebanyak ${qtyNum} ${selectedMaterial?.unit} berhasil dicatat.`,
        'Stok Keluar Dicatat'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Stock out error:', err);
      setError(err.response?.data?.message || 'Gagal mencatat stok keluar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Input Stok Keluar</h3>
              <p className="text-xs text-slate-500">Pencatatan bahan terbuang, rusak, kadaluarsa, atau pemakaian</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Material */}
          <div>
            <Select
              label="Pilih Bahan Baku *"
              value={String(materialId)}
              onChange={(e) => setMaterialId(Number(e.target.value))}
              required
            >
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''} - Stok: {m.current_stock} {m.unit}
                </option>
              ))}
            </Select>
          </div>

          {/* Current Stock Preview Card */}
          {selectedMaterial && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Boxes className="w-4 h-4 text-slate-400" />
                <span>Stok Tersedia Saat Ini:</span>
              </div>
              <span className={`font-bold ${currentStock <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {selectedMaterial.current_stock} {selectedMaterial.unit}
              </span>
            </div>
          )}

          {/* Quantity and Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label={`Jumlah Keluar (${selectedMaterial?.unit || 'unit'}) *`}
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Contoh: 2.5"
                required
              />
            </div>

            <div>
              <Select
                label="Alasan Pengeluaran *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                {OUT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Keterangan / Kronologi
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Daging ayam berlendir saat dibuka dari freezer, sayuran layu..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
              <TrendingDown className="w-4 h-4" /> Simpan Stok Keluar
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
