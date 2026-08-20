import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/ui/Modal';
import {
  ArrowDownLeft,
  X,
  Boxes,
  DollarSign,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { RawMaterial } from '../../types/menu';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rawMaterials: RawMaterial[];
  preselectedMaterialId?: number | null;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rawMaterials,
  preselectedMaterialId,
}) => {
  const [materialId, setMaterialId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [unitCost, setUnitCost] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setQuantity('');
      setNotes('');
      if (preselectedMaterialId) {
        setMaterialId(preselectedMaterialId);
        const mat = rawMaterials.find((m) => m.id === preselectedMaterialId);
        if (mat) setUnitCost(mat.default_purchase_price || '');
      } else if (rawMaterials.length > 0) {
        setMaterialId(rawMaterials[0].id);
        setUnitCost(rawMaterials[0].default_purchase_price || '');
      }
    }
  }, [isOpen, preselectedMaterialId, rawMaterials]);

  const selectedMaterial = rawMaterials.find((m) => m.id === Number(materialId));

  const handleMaterialChange = (idStr: string) => {
    const id = Number(idStr);
    setMaterialId(id);
    const mat = rawMaterials.find((m) => m.id === id);
    if (mat) {
      setUnitCost(mat.default_purchase_price || '');
    }
  };

  const totalCost = (Number(quantity) || 0) * (Number(unitCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !quantity || Number(quantity) <= 0) {
      setError('Pilih bahan baku dan masukkan kuantitas yang valid (lebih dari 0).');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/tenant/inventory/stock-in', {
        raw_material_id: Number(materialId),
        quantity: Number(quantity),
        unit_cost: unitCost ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
        reference_type: 'purchase_receipt',
      });

      toast.success(
        `Stok masuk untuk "${selectedMaterial?.name}" sebanyak ${quantity} ${selectedMaterial?.unit} berhasil dicatat!`,
        'Stok Masuk Tersimpan'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Stock in error:', err);
      setError(err.response?.data?.message || 'Gagal mencatat stok masuk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Input Stok Masuk</h3>
              <p className="text-xs text-slate-500">Penerimaan belanja bahan baku dari supplier atau pasar</p>
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
              onChange={(e) => handleMaterialChange(e.target.value)}
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
                <span>Stok Sistem Saat Ini:</span>
              </div>
              <span className="font-bold text-slate-900">
                {selectedMaterial.current_stock} {selectedMaterial.unit}
              </span>
            </div>
          )}

          {/* Quantity and Unit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label={`Jumlah Masuk (${selectedMaterial?.unit || 'unit'}) *`}
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Contoh: 10"
                required
              />
            </div>

            <div>
              <Input
                label={`Harga Beli (Rp/${selectedMaterial?.unit || 'unit'})`}
                type="number"
                step="100"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Contoh: 48000"
              />
            </div>
          </div>

          {/* Live Total Cost Preview */}
          {totalCost > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 flex items-center justify-between text-xs">
              <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Total Nilai Belanja:
              </span>
              <strong className="text-amber-900 text-sm font-extrabold">{formatCurrency(totalCost)}</strong>
            </div>
          )}

          {/* Notes / Supplier info */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Keterangan / No. Nota / Supplier
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Belanja Pasar Kramat Jati, Nota #9810, Supplier Toko Beras Jaya..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
              <TrendingUp className="w-4 h-4" /> Simpan Stok Masuk
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
