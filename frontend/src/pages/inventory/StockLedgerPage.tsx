import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Clock,
  User,
  RotateCcw,
  Boxes,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { StockLedger, StockMovementType } from '../../types/inventory';

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

export const StockLedgerPage: React.FC = () => {
  const [ledgers, setLedgers] = useState<StockLedger[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockMovementType>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const isFiltered = Boolean(
    search.trim() ||
    typeFilter !== 'all' ||
    materialFilter !== 'all' ||
    dateFrom ||
    dateTo
  );

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/raw-materials', { params: { all: true } });
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error('Fetch materials error:', err);
    }
  }, []);

  const fetchLedgers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (materialFilter !== 'all') {
        params.raw_material_id = materialFilter;
      }
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
      setLedgers(res.data.data || []);
      if (res.data.meta) {
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch ledgers error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, typeFilter, materialFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setMaterialFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-amber-600" /> Riwayat Mutasi Stok (Stock Ledger)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit trail lengkap pergerakan stok keluar, masuk, dan penyesuaian opname secara kronologis
          </p>
        </div>

        <button
          onClick={fetchLedgers}
          className="self-start sm:self-auto p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Jurnal
        </button>
      </div>

      {/* Filter Card (Single Row Layout) */}
      <Card className="p-3">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari bahan, nomor nota, catatan transaksi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {/* Type Filter */}
          <div className="relative w-full lg:w-48">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Jenis Mutasi</option>
              <option value="in">↓ Stok Masuk (IN)</option>
              <option value="out">↑ Stok Keluar (OUT)</option>
              <option value="adjustment">⚖ Penyesuaian (OPNAME)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Material Filter */}
          <div className="relative w-full lg:w-48">
            <Boxes className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={materialFilter}
              onChange={(e) => {
                setMaterialFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Bahan Baku</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-700 w-full lg:w-32"
              title="Dari tanggal"
            />
            <span className="text-slate-400 text-xs font-medium">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-700 w-full lg:w-32"
              title="Sampai tanggal"
            />
          </div>

          {/* Reset button */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs py-1.5 px-2.5 h-auto text-slate-600 hover:text-slate-900 border-slate-200 flex-shrink-0"
              title="Reset Semua Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Waktu Transaksi</th>
                <th className="px-6 py-3.5">Bahan Baku</th>
                <th className="px-6 py-3.5 text-center">Jenis Mutasi</th>
                <th className="px-6 py-3.5 text-center">Perubahan Kuantitas</th>
                <th className="px-6 py-3.5 text-center">Saldo Stok</th>
                <th className="px-6 py-3.5 text-right">Nilai Mutasi</th>
                <th className="px-6 py-3.5">Keterangan / Referensi</th>
                <th className="px-6 py-3.5">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Memuat riwayat mutasi stok...
                  </td>
                </tr>
              ) : ledgers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada riwayat mutasi stok yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                ledgers.map((item) => {
                  let typeBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Masuk (IN)
                    </span>
                  );

                  if (item.type === 'out') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Keluar (OUT)
                      </span>
                    );
                  } else if (item.type === 'adjustment') {
                    typeBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        <ClipboardCheck className="w-3.5 h-3.5" /> Opname
                      </span>
                    );
                  }

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
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs border border-amber-200 flex-shrink-0">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">
                              {item.raw_material?.name || 'Bahan Dihapus'}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {item.raw_material?.category || '-'} {item.raw_material?.code ? `• (${item.raw_material.code})` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">{typeBadge}</td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-extrabold text-sm ${
                            item.type === 'in'
                              ? 'text-emerald-700'
                              : item.type === 'out'
                              ? 'text-rose-700'
                              : 'text-indigo-700'
                          }`}
                        >
                          {item.type === 'in' ? '+' : item.type === 'out' ? '-' : '±'}
                          {item.quantity} {item.raw_material?.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-xs">
                        <span className="text-slate-400">{item.stock_before}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <strong className="text-slate-800">{item.stock_after} {item.raw_material?.unit}</strong>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {item.total_cost ? (
                          <div>
                            <span className="font-bold text-slate-800 text-xs">
                              {formatCurrency(item.total_cost)}
                            </span>
                            {item.unit_cost && (
                              <span className="text-[10px] text-slate-400 block">
                                @{formatCurrency(item.unit_cost)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={item.notes || ''}>
                          {item.notes || 'Tanpa keterangan'}
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
    </div>
  );
};
