import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/ui/Modal';
import {
  ClipboardCheck,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { RawMaterial } from '../../types/menu';

interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rawMaterials: RawMaterial[];
  preselectedMaterialId?: number | null;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rawMaterials,
  preselectedMaterialId,
}) => {
  const [materialId, setMaterialId] = useState<number | ''>('');
  const [physicalStock, setPhysicalStock] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes('');
      if (preselectedMaterialId) {
        setMaterialId(preselectedMaterialId);
        const mat = rawMaterials.find((m) => m.id === preselectedMaterialId);
        if (mat) setPhysicalStock(mat.current_stock);
      } else if (rawMaterials.length > 0) {
        setMaterialId(rawMaterials[0].id);
        setPhysicalStock(rawMaterials[0].current_stock);
      }
    }
  }, [isOpen, preselectedMaterialId, rawMaterials]);

  const selectedMaterial = rawMaterials.find((m) => m.id === Number(materialId));
  const currentStock = Number(selectedMaterial?.current_stock) || 0;
  const physStockNum = physicalStock === '' ? currentStock : Number(physicalStock);
  const difference = physStockNum - currentStock;

  const handleMaterialChange = (idStr: string) => {
    const id = Number(idStr);
    setMaterialId(id);
    const mat = rawMaterials.find((m) => m.id === id);
    if (mat) {
      setPhysicalStock(mat.current_stock);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || physicalStock === '' || Number(physicalStock) < 0) {
      setError('Masukkan angka stok fisik aktual yang valid (minimal 0).');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/tenant/inventory/adjust', {
        raw_material_id: Number(materialId),
        physical_stock: Number(physicalStock),
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Stok opname "${selectedMaterial?.name}" berhasil disesuaikan menjadi ${physicalStock} ${selectedMaterial?.unit}.`,
        'Stock Opname Tersimpan'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Stock adjust error:', err);
      setError(err.response?.data?.message || 'Gagal menyimpan penyesuaian stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Stock Opname / Penyesuaian</h3>
              <p className="text-xs text-slate-500">Penyesuaian stok sistem dengan hasil hitung fisik di gudang</p>
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
                  {m.name} {m.code ? `(${m.code})` : ''} - Sistem: {m.current_stock} {m.unit}
                </option>
              ))}
            </Select>
          </div>

          {/* Stock Comparison Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* System Stock Card */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                Stok Sistem Saat Ini
              </span>
              <p className="text-lg font-bold text-slate-800">
                {currentStock} <span className="text-xs font-medium text-slate-500">{selectedMaterial?.unit}</span>
              </p>
            </div>

            {/* Physical Stock Input */}
            <div>
              <Input
                label={`Hitung Fisik Aktual (${selectedMaterial?.unit || 'unit'}) *`}
                type="number"
                step="0.01"
                min="0"
                value={physicalStock}
                onChange={(e) => setPhysicalStock(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Difference Calculation Badge */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              difference === 0
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : difference > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">Selisih Stok (Fisik - Sistem):</span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-sm">
              {difference === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span>0 {selectedMaterial?.unit} (Sesuai)</span>
                </>
              ) : difference > 0 ? (
                <>
                  <span className="text-emerald-700">
                    +{difference.toFixed(2)} {selectedMaterial?.unit} (Kelebihan Fisik)
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">
                    {difference.toFixed(2)} {selectedMaterial?.unit} (Kekurangan Fisik)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Alasan Penyesuaian / Catatan Audit
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Audit fisik stok akhir bulan, penyesuaian susut timbangan, salah input sebelumnya..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-1.5">
              <ClipboardCheck className="w-4 h-4" /> Simpan Penyesuaian
            </Button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
