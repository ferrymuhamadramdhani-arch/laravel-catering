import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AutoSuggestPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SuggestionItem {
  raw_material_id: number;
  material_name: string;
  material_code: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  required_for_production: number;
  suggested_quantity: number;
  unit_price: number;
  estimated_subtotal: number;
}

interface SupplierGroupSuggestion {
  supplier_id: number | null;
  supplier_name: string;
  supplier_phone?: string;
  supplier_email?: string;
  items: SuggestionItem[];
  total_estimated_amount: number;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const AutoSuggestPoModal: React.FC<AutoSuggestPoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetDate, setTargetDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow by default
  );
  const [suggestions, setSuggestions] = useState<SupplierGroupSuggestion[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSuggestions = async (dateStr: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/purchase-orders/suggestions', {
        params: { target_date: dateStr },
      });
      if (res.data?.data?.suggestions_by_supplier) {
        const groups: SupplierGroupSuggestion[] = res.data.data.suggestions_by_supplier;
        setSuggestions(groups);
        // Select all suppliers with IDs by default
        setSelectedSupplierIds(groups.map((g) => g.supplier_id || 0));
      }
    } catch (err: any) {
      console.error('Failed to fetch PO suggestions:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menghitung rekomendasi pengadaan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions(targetDate);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSupplier = (suppId: number) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(suppId) ? prev.filter((id) => id !== suppId) : [...prev, suppId]
    );
  };

  const handleCreatePOs = async () => {
    const selectedGroups = suggestions.filter((g) =>
      selectedSupplierIds.includes(g.supplier_id || 0)
    );

    if (selectedGroups.length === 0) {
      alert('Pilih setidaknya satu supplier untuk dibuatkan draft PO.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.post('/purchase-orders/from-suggestions', {
        suggestions: selectedGroups,
      });

      if (res.data?.success) {
        alert(res.data?.message || 'Draft Purchase Order berhasil dibuat.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to create POs from suggestions:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal membuat draft PO otomatis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSelectedItems = suggestions
    .filter((g) => selectedSupplierIds.includes(g.supplier_id || 0))
    .reduce((acc, g) => acc + g.items.length, 0);

  const totalSelectedAmount = suggestions
    .filter((g) => selectedSupplierIds.includes(g.supplier_id || 0))
    .reduce((acc, g) => acc + g.total_estimated_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Rekomendasi Pengadaan Otomatis (Auto-Suggest PO)
              </h2>
              <p className="text-xs text-slate-500">
                Kalkulasi otomatis dari: <code>(Kebutuhan Dapur + Minimum Stok) - Stok Gudang</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Filter & Control Bar */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Target Kebutuhan Hingga:</span>
            <input
              type="date"
              value={targetDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setTargetDate(e.target.value);
                fetchSuggestions(e.target.value);
              }}
              className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchSuggestions(targetDate)}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 bg-white border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Hitung Ulang
          </Button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-500">
              <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Menghitung kekurangan stok bahan baku &amp; resep produksi...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Stok Bahan Baku Aman!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seluruh kebutuhan masak pesanan terjadwal dan batas stok minimum saat ini telah terpenuhi di gudang.
              </p>
            </div>
          ) : (
            suggestions.map((group) => {
              const suppId = group.supplier_id || 0;
              const isChecked = selectedSupplierIds.includes(suppId);

              return (
                <Card
                  key={suppId}
                  className={`p-4 border rounded-2xl transition-all space-y-3 ${
                    isChecked ? 'bg-white border-amber-400 shadow-xs' : 'bg-slate-50/60 border-slate-200 opacity-70'
                  }`}
                >
                  {/* Supplier Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSupplier(suppId)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                      />
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <strong className="text-xs font-bold text-slate-900">
                          {group.supplier_name}
                        </strong>
                        {group.supplier_phone && (
                          <span className="text-[11px] text-slate-400">({group.supplier_phone})</span>
                        )}
                      </div>
                    </label>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Estimasi PO:</span>
                      <strong className="text-xs font-mono font-bold text-slate-900">
                        {formatCurrency(group.total_estimated_amount)}
                      </strong>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-3">Bahan Baku</th>
                          <th className="py-2 px-3 text-right">Stok Gudang</th>
                          <th className="py-2 px-3 text-right">Kebutuhan Dapur</th>
                          <th className="py-2 px-3 text-right">Min. Stok</th>
                          <th className="py-2 px-3 text-right">Saran Beli</th>
                          <th className="py-2 px-3 text-right">Harga Satuan</th>
                          <th className="py-2 px-3 text-right">Estimasi Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((it) => (
                          <tr key={it.raw_material_id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {it.material_name}
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {it.material_code}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {it.current_stock} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-purple-700 font-bold">
                              {it.required_for_production} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              {it.min_stock} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 bg-amber-50/50">
                              {it.suggested_quantity} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(it.unit_price)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.estimated_subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {suggestions.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-xs text-slate-500 block">
                Terpilih: <strong>{selectedSupplierIds.length} Supplier</strong> ({totalSelectedItems} item bahan baku)
              </span>
              <strong className="text-sm font-mono font-black text-slate-900">
                Total Estimasi: {formatCurrency(totalSelectedAmount)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePOs}
                disabled={isSubmitting || totalSelectedItems === 0}
                className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSubmitting ? 'Memproses PO...' : `Buat ${selectedSupplierIds.length} Draft PO Otomatis`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
