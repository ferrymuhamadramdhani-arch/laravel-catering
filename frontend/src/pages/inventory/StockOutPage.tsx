import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  ArrowUpRight,
  Search,
  RefreshCw,
  Clock,
  User,
  Plus,
  Boxes,
  Filter,
  ChevronDown,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { StockLedger } from '../../types/inventory';
import { StockOutModal } from './StockOutModal';

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

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

const formatReferenceType = (ref: string) => {
  switch (ref) {
    case 'waste_damage':
      return { label: 'Bahan Rusak/Busuk', bg: 'bg-rose-100 text-rose-800' };
    case 'expired':
      return { label: 'Kadaluarsa', bg: 'bg-red-100 text-red-800' };
    case 'order_usage':
      return { label: 'Pemakaian Masak', bg: 'bg-amber-100 text-amber-800' };
    default:
      return { label: 'Pengeluaran Manual', bg: 'bg-slate-100 text-slate-800' };
  }
};

export const StockOutPage: React.FC = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [historyLedgers, setHistoryLedgers] = useState<StockLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modal Popup State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRawMaterials = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/raw-materials', { params: { all: true } });
      setRawMaterials(res.data.data || []);
    } catch (err) {
      console.error('Fetch raw materials error:', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        type: 'out',
        page,
        per_page: perPage,
      };
      if (search.trim()) {
        params.search = search.trim();
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }

      const res = await apiClient.get('/tenant/inventory/ledgers', { params });
      let items: StockLedger[] = res.data.data || [];

      if (reasonFilter !== 'all') {
        items = items.filter((it) => it.reference_type === reasonFilter);
      }

      setHistoryLedgers(items);
      if (res.data.meta) {
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search, dateFrom, dateTo, reasonFilter]);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = () => {
    fetchRawMaterials();
    fetchHistory();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ArrowUpRight className="w-7 h-7 text-rose-600" /> Pencatatan Stok Keluar (Stock Out)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar riwayat pengeluaran bahan baku akibat pemakaian dapur, barang rusak/busuk, atau kadaluarsa
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Catat Stok Keluar
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama bahan, kode SKU, keterangan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Reason Filter */}
          <div className="md:col-span-3 relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 appearance-none font-medium text-slate-700"
            >
              <option value="all">Semua Alasan Keluar</option>
              <option value="waste_damage">Bahan Rusak / Busuk</option>
              <option value="expired">Kadaluarsa / Basi</option>
              <option value="order_usage">Pemakaian Masak</option>
              <option value="manual">Manual / Lainnya</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>

          {/* Date From */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 text-slate-700 font-medium"
              title="Dari Tanggal"
            />
          </div>

          {/* Date To */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 text-slate-700 font-medium"
              title="Sampai Tanggal"
            />
          </div>
        </div>
      </Card>

      {/* Full-width Table List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Waktu Transaksi</th>
                <th className="px-6 py-3.5">Bahan Baku</th>
                <th className="px-6 py-3.5 text-center">Alasan Pengeluaran</th>
                <th className="px-6 py-3.5 text-center">Jumlah Keluar</th>
                <th className="px-6 py-3.5 text-center">Saldo Stok</th>
                <th className="px-6 py-3.5 text-right">Nilai Estimasi</th>
                <th className="px-6 py-3.5">Keterangan / Kronologi</th>
                <th className="px-6 py-3.5">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Memuat riwayat stok keluar...
                  </td>
                </tr>
              ) : historyLedgers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat pengeluaran stok yang tercatat.
                  </td>
                </tr>
              ) : (
                historyLedgers.map((item) => {
                  const refCfg = formatReferenceType(item.reference_type);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateIndo(item.created_at)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-200 flex-shrink-0">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">
                              {item.raw_material?.name || 'Bahan Dihapus'}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {item.raw_material?.category || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${refCfg.bg}`}>
                          {refCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          -{item.quantity} {item.raw_material?.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-xs">
                        <span className="text-slate-400">{item.stock_before}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <strong className="text-slate-800">{item.stock_after} {item.raw_material?.unit}</strong>
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-slate-800 text-xs">
                        {item.total_cost ? formatCurrency(item.total_cost) : '—'}
                      </td>

                      <td className="px-6 py-4 text-xs max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={item.notes || ''}>
                          {item.notes || 'Tanpa catatan'}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-xs whitespace-nowrap text-slate-500">
                        {item.creator ? (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <User className="w-3 h-3 text-slate-400" /> {item.creator.name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </Card>

      {/* POPUP MODAL STOK KELUAR */}
      <StockOutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        rawMaterials={rawMaterials}
      />
    </div>
  );
};
