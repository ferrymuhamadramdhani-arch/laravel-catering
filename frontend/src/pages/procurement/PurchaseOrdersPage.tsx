import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  FileText,
  Search,
  RefreshCw,
  Plus,
  Building2,
  Filter,
  Eye,
  CheckCircle2,
  Sparkles,
  PackageCheck,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { Supplier } from '../../types/crm';
import type { PurchaseOrder } from '../../types/procurement';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { PurchaseOrderDetailModal } from './PurchaseOrderDetailModal';
import { AutoSuggestPoModal } from './AutoSuggestPoModal';
import { GoodsReceiptModal } from './GoodsReceiptModal';

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

const formatDateIndo = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return { label: 'Draft / Pengajuan', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'approved':
      return { label: 'Disetujui (Approved)', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'partially_received':
      return { label: 'Diterima Sebagian', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'completed':
      return { label: 'Selesai (Done)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'cancelled':
      return { label: 'Dibatalkan', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAutoSuggestOpen, setIsAutoSuggestOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const fetchDependencies = useCallback(async () => {
    try {
      const [suppRes, matRes] = await Promise.all([
        apiClient.get('/tenant/suppliers', { params: { all: true } }),
        apiClient.get('/tenant/raw-materials', { params: { all: true } }),
      ]);
      setSuppliers(suppRes.data.data || []);
      setRawMaterials(matRes.data.data || []);
    } catch (err) {
      console.error('Fetch dependencies error:', err);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (supplierFilter !== 'all') params.supplier_id = supplierFilter;

      const res = await apiClient.get('/tenant/purchase-orders', { params });
      setPurchaseOrders(res.data.data || []);
      if (res.data.meta) {
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch PO error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search, statusFilter, supplierFilter]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleRefresh = () => {
    fetchDependencies();
    fetchPurchaseOrders();
  };

  const handleOpenDetail = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setIsDetailOpen(true);
  };

  const handleOpenReceipt = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-amber-600" /> Pengadaan Bahan Baku (Purchase Orders)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola pesanan pembelian bahan baku ke supplier rekanan, rekomendasi pengadaan otomatis, dan penerimaan barang gudang
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            onClick={() => setIsAutoSuggestOpen(true)}
            className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs font-bold"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Rekomendasi Auto PO
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Buat PO Manual
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nomor PO, nama supplier, catatan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative w-full lg:w-48">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Status PO</option>
              <option value="draft">Draft / Pengajuan</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="partially_received">Diterima Sebagian</option>
              <option value="completed">Selesai (Done)</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="relative w-full lg:w-56">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700 truncate"
            >
              <option value="all">Semua Rekanan Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nomor PO</th>
                <th className="px-6 py-3.5">Supplier Rekanan</th>
                <th className="px-6 py-3.5">Tgl Pesan</th>
                <th className="px-6 py-3.5">Est. Tiba</th>
                <th className="px-6 py-3.5 text-center">Bahan</th>
                <th className="px-6 py-3.5 text-right">Total Nilai</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Memuat data purchase order...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">Belum ada Purchase Order (PO)</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Buat PO pengadaan bahan baku manual atau gunakan fitur Rekomendasi Auto PO untuk menghitung kekurangan stok secara otomatis.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => setIsAutoSuggestOpen(true)}
                          className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Rekomendasi Auto PO
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCreateOpen(true)}
                          className="text-xs gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Buat PO Manual
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const statusCfg = getStatusBadge(po.status);

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="font-bold text-slate-900 leading-snug">{po.po_number}</strong>
                            <span className="text-[10px] text-slate-400 block">
                              Oleh: {po.creator?.name || 'Staff'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{po.supplier?.name || 'Tanpa Supplier'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {formatDateIndo(po.order_date)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {po.expected_delivery_date ? formatDateIndo(po.expected_delivery_date) : '—'}
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-slate-800 text-xs">
                        {po.items?.length || 0} Jenis
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm font-mono">
                        {formatCurrency(po.total_amount)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(po)}
                            className="gap-1 text-xs py-1 px-2.5 h-auto text-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </Button>

                          {po.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenDetail(po)}
                              className="gap-1 text-xs py-1 px-2.5 h-auto font-bold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                          )}

                          {(po.status === 'approved' || po.status === 'partially_received') && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReceipt(po)}
                              className="gap-1 text-xs py-1 px-2.5 h-auto font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Terima Barang
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
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </Card>

      {/* POPUP MODALS */}
      <CreatePurchaseOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleRefresh}
        rawMaterials={rawMaterials}
        suppliers={suppliers}
      />

      <PurchaseOrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSuccess={handleRefresh}
        po={selectedPo}
      />

      <AutoSuggestPoModal
        isOpen={isAutoSuggestOpen}
        onClose={() => setIsAutoSuggestOpen(false)}
        onSuccess={handleRefresh}
      />

      <GoodsReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onSuccess={handleRefresh}
        purchaseOrder={selectedPo}
      />
    </div>
  );
};
