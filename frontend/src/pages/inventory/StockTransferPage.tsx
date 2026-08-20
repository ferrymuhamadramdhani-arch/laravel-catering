import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  ArrowLeftRight,
  Plus,
  Send,
  CheckCircle2,
  RefreshCw,
  Boxes,
  Trash2,
} from 'lucide-react';
import type { Branch, StockTransfer } from '../../types/branch';
import type { RawMaterial } from '../../types/inventory';

export const StockTransferPage: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Modal Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fromBranchId, setFromBranchId] = useState<number | ''>('');
  const [toBranchId, setToBranchId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { raw_material_id: number | ''; quantity: number; unit: string; notes: string }[]
  >([{ raw_material_id: '', quantity: 1, unit: 'kg', notes: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/branches');
      const bList: Branch[] = res.data.data || [];
      setBranches(bList);
      if (bList.length >= 2) {
        const main = bList.find((b) => b.is_main) || bList[0];
        const secondary = bList.find((b) => b.id !== main.id) || bList[1];
        setFromBranchId(main.id);
        setToBranchId(secondary.id);
      }
    } catch (err) {
      console.error('Fetch branches failed:', err);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/raw-materials');
      setRawMaterials(res.data.data || []);
    } catch (err) {
      console.error('Fetch materials failed:', err);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get('/tenant/stock-transfers', { params });
      setTransfers(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err) {
      console.error('Fetch transfers failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBranches();
    fetchMaterials();
  }, [fetchBranches, fetchMaterials]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { raw_material_id: '', quantity: 1, unit: 'kg', notes: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'raw_material_id') {
        const selectedMat = rawMaterials.find((m) => m.id === Number(value));
        if (selectedMat) {
          updated[index].unit = selectedMat.unit || 'kg';
        }
      }
      return updated;
    });
  };

  const handleOpenCreateModal = () => {
    setNotes('');
    setItems([{ raw_material_id: '', quantity: 1, unit: 'kg', notes: '' }]);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId) {
      setFormError('Pilih cabang asal dan cabang tujuan.');
      return;
    }
    if (fromBranchId === toBranchId) {
      setFormError('Cabang tujuan tidak boleh sama dengan cabang asal.');
      return;
    }

    const validItems = items.filter((it) => it.raw_material_id && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setFormError('Pilih minimal satu bahan baku dengan kuantitas yang valid.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await apiClient.post('/tenant/stock-transfers', {
        from_branch_id: Number(fromBranchId),
        to_branch_id: Number(toBranchId),
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          raw_material_id: Number(it.raw_material_id),
          quantity: Number(it.quantity),
          unit: it.unit,
          notes: it.notes || undefined,
        })),
      });

      setIsCreateModalOpen(false);
      fetchTransfers();
    } catch (err: any) {
      console.error('Submit transfer failed:', err);
      setFormError(err.response?.data?.message || 'Gagal membuat mutasi transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShipTransfer = async (transfer: StockTransfer) => {
    if (!confirm(`Kirim transfer #${transfer.transfer_number}? Stok cabang asal akan dipotong.`)) {
      return;
    }

    try {
      await apiClient.post(`/tenant/stock-transfers/${transfer.id}/ship`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim transfer stok.');
    }
  };

  const handleReceiveTransfer = async (transfer: StockTransfer) => {
    if (!confirm(`Konfirmasi penerimaan transfer #${transfer.transfer_number}? Stok cabang tujuan akan bertambah.`)) {
      return;
    }

    try {
      await apiClient.post(`/tenant/stock-transfers/${transfer.id}/receive`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menerima transfer stok.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Selesai Diterima', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'in_transit':
        return { label: 'Dalam Perjalanan (In-Transit)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'pending':
        return { label: 'Menunggu Pengiriman', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'cancelled':
        return { label: 'Dibatalkan', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="w-7 h-7 text-amber-600" /> Mutasi &amp; Transfer Stok Antar Cabang
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola perpindahan stok bahan baku antar gudang cabang: Central Kitchen HQ ke dapur satelit daerah operasional
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransfers}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </Button>

          <Button onClick={handleOpenCreateModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs">
            <Plus className="w-4 h-4" /> Buat Mutasi Transfer
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'pending', 'in_transit', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all'
                  ? 'Semua Status'
                  : st === 'pending'
                  ? 'Pending'
                  : st === 'in_transit'
                  ? 'In-Transit'
                  : st === 'completed'
                  ? 'Selesai'
                  : 'Dibatalkan'}
              </button>
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {meta.total} Total Transaksi Transfer
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">No. Mutasi</th>
                <th className="px-6 py-3.5">Asal $\rightarrow$ Tujuan Cabang</th>
                <th className="px-6 py-3.5">Bahan Baku &amp; Kuantitas</th>
                <th className="px-6 py-3.5">Waktu / Petugas</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Memuat riwayat transfer stok...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                        <ArrowLeftRight className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">Belum Ada Riwayat Mutasi Stok</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Kirim bahan baku dari Central Kitchen ke dapur cabang atau sebaliknya saat ada kekurangan stok.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleOpenCreateModal}
                        className="mt-2 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Buat Mutasi Transfer
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => {
                  const statusCfg = getStatusBadge(trf.status);

                  return (
                    <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <strong className="font-bold text-slate-900 text-xs block font-mono">
                          #{trf.transfer_number}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {new Date(trf.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {trf.from_branch?.name || 'Cabang Asal'}
                          </span>
                          <span className="text-slate-400 font-bold">$\rightarrow$</span>
                          <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {trf.to_branch?.name || 'Cabang Tujuan'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {trf.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                              <Boxes className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-800">
                                {it.raw_material?.name || 'Bahan'}
                              </span>
                              <strong className="text-amber-800 font-mono text-[11px]">
                                ({it.quantity} {it.unit})
                              </strong>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <p>Dibuat: {trf.creator?.name || 'Staff'}</p>
                          {trf.receiver && <p className="text-emerald-700">Diterima: {trf.receiver.name}</p>}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {trf.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleShipTransfer(trf)}
                              className="text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Send className="w-3 h-3" /> Kirim Barang
                            </Button>
                          )}

                          {trf.status === 'in_transit' && (
                            <Button
                              size="sm"
                              onClick={() => handleReceiveTransfer(trf)}
                              className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Terima Barang
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={() => {}}
        />
      </Card>

      {/* CREATE TRANSFER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Buat Pengajuan Mutasi Transfer Stok
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pindahkan bahan baku antar gudang/cabang katering
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cabang Asal (Pengirim) *
                  </label>
                  <select
                    required
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">Pilih Cabang Asal</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.is_main ? '(HQ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cabang Tujuan (Penerima) *
                  </label>
                  <select
                    required
                    value={toBranchId}
                    onChange={(e) => setToBranchId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">Pilih Cabang Tujuan</option>
                    {branches
                      .filter((b) => b.id !== fromBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.is_main ? '(HQ)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-600" /> Daftar Bahan Baku yang Ditransfer *
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddItemRow}
                    className="text-xs py-1 px-2.5 h-auto gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah Bahan
                  </Button>
                </div>

                <div className="space-y-2">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          required
                          value={row.raw_material_id}
                          onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                        >
                          <option value="">Pilih Bahan Baku</option>
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Stok: {m.current_stock} {m.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          required
                          min={0.01}
                          placeholder="Jumlah"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono text-right"
                        />
                      </div>

                      <div className="w-16">
                        <span className="px-2 py-1.5 bg-slate-200 rounded-lg text-xs font-bold text-slate-700 block text-center truncate">
                          {row.unit}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / Keterangan Transfer
                </label>
                <textarea
                  rows={2}
                  placeholder="mis: Permintaan darurat bahan daging untuk event akhir pekan"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Menyimpan...' : 'Ajukan Mutasi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
