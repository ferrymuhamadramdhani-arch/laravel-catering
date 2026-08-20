import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  ArrowDownLeft,
  Search,
  RefreshCw,
  Clock,
  User,
  Plus,
  Boxes,
  PackageCheck,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { StockLedger } from '../../types/inventory';
import type { GoodsReceipt } from '../../types/procurement';
import { StockInModal } from './StockInModal';
import { ProcessGoodsReceiptModal } from './ProcessGoodsReceiptModal';

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

export const StockInPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Raw Materials List
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Tab 1: Pending Goods Receipts (PO Approved)
  const [pendingReceipts, setPendingReceipts] = useState<GoodsReceipt[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPerPage, setPendingPerPage] = useState(10);
  const [pendingMeta, setPendingMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Tab 2: Stock-In History (Ledgers)
  const [historyLedgers, setHistoryLedgers] = useState<StockLedger[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [historyMeta, setHistoryMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modals State
  const [isManualStockInOpen, setIsManualStockInOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  const fetchRawMaterials = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/raw-materials', { params: { all: true } });
      setRawMaterials(res.data.data || []);
    } catch (err) {
      console.error('Fetch raw materials error:', err);
    }
  }, []);

  const fetchPendingReceipts = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const params: any = {
        status: 'draft',
        page: pendingPage,
        per_page: pendingPerPage,
      };
      const res = await apiClient.get('/tenant/inventory/goods-receipts', { params });
      setPendingReceipts(res.data.data || []);
      if (res.data.meta) {
        setPendingMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch pending receipts error:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [pendingPage, pendingPerPage]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const params: any = {
        type: 'in',
        page: historyPage,
        per_page: historyPerPage,
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
        setHistoryMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyPage, historyPerPage, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingReceipts();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchPendingReceipts, fetchHistory]);

  const handleRefresh = () => {
    fetchRawMaterials();
    if (activeTab === 'pending') fetchPendingReceipts();
    else fetchHistory();
  };

  const handleOpenProcessReceipt = (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setIsProcessModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ArrowDownLeft className="w-7 h-7 text-emerald-600" /> Penerimaan Stok Masuk (Stock In)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Penerimaan barang belanja berbasis PO yang sudah di-approve &amp; pencatatan stok masuk langsung
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
            onClick={() => setIsManualStockInOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Input Stok Masuk Langsung
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors relative ${
            activeTab === 'pending'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Menunggu Penerimaan PO
          {pendingReceipts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold ml-1">
              {pendingReceipts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Riwayat Penerimaan Selesai
        </button>
      </div>

      {/* TAB 1: MENUNGGU PENERIMAAN PO (PENDING RECEIPTS) */}
      {activeTab === 'pending' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">No. Dokumen Receipt</th>
                  <th className="px-6 py-3.5">Purchase Order (PO)</th>
                  <th className="px-6 py-3.5">Supplier Rekanan</th>
                  <th className="px-6 py-3.5 text-center">Jumlah Item</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingPending ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Memuat daftar pengiriman PO yang menunggu penerimaan...
                    </td>
                  </tr>
                ) : pendingReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageCheck className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">Tidak ada pengiriman PO yang menunggu penerimaan.</p>
                        <span className="text-xs text-slate-400">
                          Ketika Purchase Order (PO) di-approve di menu Pengadaan, draft penerimaan barang akan otomatis muncul di sini.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingReceipts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            <PackageCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="font-bold text-slate-900 leading-snug">{item.receipt_number}</strong>
                            <span className="text-[10px] text-slate-400 block">{formatDateIndo(item.created_at)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {item.purchase_order ? (
                          <div>
                            <strong className="text-slate-800 text-xs font-semibold">{item.purchase_order.po_number}</strong>
                            <span className="text-[10px] text-slate-400 block">
                              Order: {item.purchase_order.order_date}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.supplier?.name || item.purchase_order?.supplier?.name || 'Supplier'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-800 text-xs">
                        {item.items?.length || 0} Bahan Baku
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Menunggu Barang Tiba
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenProcessReceipt(item)}
                          className="gap-1.5 text-xs py-1 px-2.5 h-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> Terima Barang (Gudang)
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            meta={pendingMeta}
            onPageChange={(newPage) => setPendingPage(newPage)}
            onPerPageChange={(newPerPage) => {
              setPendingPerPage(newPerPage);
              setPendingPage(1);
            }}
          />
        </Card>
      )}

      {/* TAB 2: RIWAYAT PENERIMAAN SELESAI */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Input */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari nama bahan, kode SKU, nomor nota, PO..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date From */}
              <div className="md:col-span-3">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-700 font-medium"
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
                    setHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-700 font-medium"
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
                    <th className="px-6 py-3.5 text-center">Jumlah Masuk</th>
                    <th className="px-6 py-3.5 text-center">Saldo Stok</th>
                    <th className="px-6 py-3.5 text-right">Harga Beli</th>
                    <th className="px-6 py-3.5 text-right">Total Belanja</th>
                    <th className="px-6 py-3.5">Keterangan / Referensi</th>
                    <th className="px-6 py-3.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Memuat riwayat stok masuk...
                      </td>
                    </tr>
                  ) : historyLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Belum ada riwayat penerimaan stok masuk yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    historyLedgers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateIndo(item.created_at)}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200 flex-shrink-0">
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

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-0.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            +{item.quantity} {item.raw_material?.unit}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center text-xs">
                          <span className="text-slate-400">{item.stock_before}</span>
                          <span className="mx-1 text-slate-300">→</span>
                          <strong className="text-slate-800">{item.stock_after} {item.raw_material?.unit}</strong>
                        </td>

                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-700">
                          {item.unit_cost ? formatCurrency(item.unit_cost) : '—'}
                        </td>

                        <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={historyMeta}
              onPageChange={(newPage) => setHistoryPage(newPage)}
              onPerPageChange={(newPerPage) => {
                setHistoryPerPage(newPerPage);
                setHistoryPage(1);
              }}
            />
          </Card>
        </div>
      )}

      {/* MODAL PROSES TERIMA BARANG PO */}
      <ProcessGoodsReceiptModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        onSuccess={handleRefresh}
        receipt={selectedReceipt}
      />

      {/* POPUP MODAL STOK MASUK LANGSUNG (MANUAL) */}
      <StockInModal
        isOpen={isManualStockInOpen}
        onClose={() => setIsManualStockInOpen(false)}
        onSuccess={handleRefresh}
        rawMaterials={rawMaterials}
      />
    </div>
  );
};
