import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Clock,
  User,
  Plus,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { StockLedger } from '../../types/inventory';
import { StockOpnameModal } from './StockOpnameModal';

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

export const StockOpnamePage: React.FC = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [historyLedgers, setHistoryLedgers] = useState<StockLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
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
        type: 'adjustment',
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
      setHistoryLedgers(res.data.data || []);
      if (res.data.meta) {
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search, dateFrom, dateTo]);

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
            <ClipboardCheck className="w-7 h-7 text-indigo-600" /> Stock Opname &amp; Penyesuaian Fisik
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar riwayat audit fisik gudang &amp; rekonsiliasi catatan sistem dengan stok aktual di lapangan
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
            <Plus className="w-4 h-4" /> Input Stock Opname
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama bahan, kode SKU, catatan audit..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date From */}
          <div className="md:col-span-3">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
              title="Dari Tanggal"
            />
          </div>

          {/* Date To */}
          <div className="md:col-span-3">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
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
                <th className="px-6 py-3.5">Waktu Audit</th>
                <th className="px-6 py-3.5">Bahan Baku</th>
                <th className="px-6 py-3.5 text-center">Selisih Kuantitas</th>
                <th className="px-6 py-3.5 text-center">Sistem → Fisik</th>
                <th className="px-6 py-3.5 text-center">Status Audit</th>
                <th className="px-6 py-3.5">Keterangan / Alasan Audit</th>
                <th className="px-6 py-3.5">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Memuat riwayat stock opname...
                  </td>
                </tr>
              ) : historyLedgers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat penyesuaian stock opname yang tercatat.
                  </td>
                </tr>
              ) : (
                historyLedgers.map((item) => {
                  const before = Number(item.stock_before) || 0;
                  const after = Number(item.stock_after) || 0;
                  const diff = after - before;

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sesuai
                    </span>
                  );

                  if (diff > 0) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Plus className="w-3.5 h-3.5" /> Kelebihan Fisik
                      </span>
                    );
                  } else if (diff < 0) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Kekurangan Fisik
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
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200 flex-shrink-0">
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
                        <span className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Scale className="w-3.5 h-3.5 mr-0.5" />
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? `${diff.toFixed(2)}` : '0'} {item.raw_material?.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-xs">
                        <span className="text-slate-400">{item.stock_before}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <strong className="text-slate-800">{item.stock_after} {item.raw_material?.unit}</strong>
                      </td>

                      <td className="px-6 py-4 text-center">{statusBadge}</td>

                      <td className="px-6 py-4 text-xs max-w-xs">
                        <p className="text-slate-700 line-clamp-2" title={item.notes || ''}>
                          {item.notes || 'Tanpa catatan audit'}
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

      {/* POPUP MODAL STOCK OPNAME */}
      <StockOpnameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        rawMaterials={rawMaterials}
      />
    </div>
  );
};
