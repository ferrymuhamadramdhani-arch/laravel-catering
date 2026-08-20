import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  List,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  MapPin,
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Package,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import type { Order, OrderStatus } from '../../types/order';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderDetailModal } from './OrderDetailModal';
import { OrderCalendarView } from './OrderCalendarView';

const STATUS_TABS: { key: string; label: string; countKey?: string }[] = [
  { key: 'all', label: 'Semua Pesanan' },
  { key: 'draft', label: 'Draft' },
  { key: 'confirmed', label: 'Terkonfirmasi' },
  { key: 'in_production', label: 'Sedang Dimasak' },
  { key: 'ready', label: 'Siap Kirim' },
  { key: 'delivering', label: 'Dalam Pengiriman' },
  { key: 'delivered', label: 'Sampai di Lokasi' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
];

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<any> }
> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: FileText },
  confirmed: { label: 'Terkonfirmasi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2 },
  in_production: { label: 'Dapur (Masak)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: ChefHat },
  ready: { label: 'Siap Kirim', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Package },
  delivering: { label: 'Kurir (Kirim)', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Truck },
  delivered: { label: 'Sampai', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: MapPin },
  completed: { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Batal', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
};

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Table vs Calendar
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination (Default 10)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }

      const res = await apiClient.get('/tenant/orders', { params });
      setOrders(res.data.data || []);
      if (res.data.meta) {
        setPaginationMeta(res.data.meta);
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data pesanan katering.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, statusFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    if (viewMode === 'table') {
      fetchOrders();
    }
  }, [fetchOrders, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleOpenDetailById = async (orderId: number) => {
    try {
      const res = await apiClient.get(`/tenant/orders/${orderId}`);
      setSelectedOrder(res.data.data);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memuat detail pesanan.');
    }
  };

  const handleOpenDetail = (order: Order) => {
    handleOpenDetailById(order.id);
  };

  const handleDelete = async (order: Order) => {
    const isDraft = order.status === 'draft';
    const confirmMsg = isDraft
      ? `Hapus permanen pesanan draft "${order.order_number}"?`
      : `Batalkan pesanan "${order.order_number}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await apiClient.delete(`/tenant/orders/${order.id}`);
      toast.success(
        isDraft
          ? `Pesanan draft ${order.order_number} berhasil dihapus.`
          : `Pesanan ${order.order_number} berhasil dibatalkan.`,
        'Pesanan Dihapus'
      );
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan pesanan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-amber-600" /> Manajemen Pemesanan (Orders)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola alur pemesanan katering: input cepat sales, tracking status dapur &amp; kurir, hingga pelunasan
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle: Table vs Calendar */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabel
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Kalender
            </button>
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Input Pesanan Baru
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RENDER VIEW ACCORDING TO VIEW MODE */}
      {viewMode === 'calendar' ? (
        <OrderCalendarView onSelectOrder={handleOpenDetailById} />
      ) : (
        <div className="space-y-4">
          {/* Status Tabs Filter Bar */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-xl w-max min-w-full">
              {STATUS_TABS.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full lg:w-96">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Cari no. order, customer, acara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Cari
                </Button>
              </form>

              {/* Date Range Filter */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Kirim:</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  title="Dari tanggal"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                  title="Sampai tanggal"
                />
                {(startDate || endDate || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="text-xs py-1 px-2 h-auto"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Orders Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">No. Order &amp; Acara</th>
                    <th className="px-6 py-3.5">Pelanggan</th>
                    <th className="px-6 py-3.5">Jadwal Kirim</th>
                    <th className="px-6 py-3.5 text-center">Menu / Porsi</th>
                    <th className="px-6 py-3.5 text-right">Total Tagihan</th>
                    <th className="px-6 py-3.5 text-center">Status Alur</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Memuat daftar pesanan katering...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Belum ada pesanan yang terdaftar dengan kriteria filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => {
                      const statusCfg = STATUS_CONFIG[ord.status] || STATUS_CONFIG.draft;
                      const totalQty = ord.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                      const remaining = Math.max(0, Number(ord.total_amount) - Number(ord.down_payment_amount));

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => handleOpenDetail(ord)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-mono font-bold text-amber-800 text-xs block">
                                {ord.order_number}
                              </span>
                              <p className="font-semibold text-slate-900 leading-snug mt-0.5">
                                {ord.event_name || ord.event_type}
                              </p>
                              <span className="text-[11px] text-slate-400 block">
                                {ord.event_type}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">
                                {ord.customer?.name || '—'}
                              </p>
                              {ord.customer?.phone && (
                                <span className="text-xs text-slate-400 block mt-0.5">
                                  {ord.customer.phone}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-slate-50 text-slate-600 mt-1 font-normal"
                              >
                                {ord.customer?.type === 'corporate' ? 'Korporat' : 'Individu'}
                              </Badge>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                {formatDateIndo(ord.delivery_date)}
                              </span>
                              {ord.delivery_time && (
                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  Pukul {ord.delivery_time}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-slate-900 text-sm">{totalQty}</span>
                            <span className="text-xs text-slate-400 block">
                              {ord.items?.length || 0} item menu
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-900 block">
                              {formatCurrency(ord.total_amount)}
                            </span>
                            <span
                              className={`text-[11px] font-medium block mt-0.5 ${
                                ord.payment_status === 'paid'
                                  ? 'text-emerald-600'
                                  : ord.payment_status === 'partially_paid'
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {ord.payment_status === 'paid'
                                ? '● Lunas'
                                : ord.payment_status === 'partially_paid'
                                ? `● Sisa ${formatCurrency(remaining)}`
                                : '● Belum Bayar'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <Badge
                              variant="outline"
                              className={`${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} font-semibold text-xs py-1`}
                            >
                              {statusCfg.label}
                            </Badge>
                          </td>

                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDetail(ord)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Lihat Detail Pesanan"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(ord)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title={ord.status === 'draft' ? 'Hapus Draft' : 'Batalkan Pesanan'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {paginationMeta.last_page > 1 && (
              <Pagination
                meta={paginationMeta}
                onPageChange={(p) => setPage(p)}
                onPerPageChange={(pp) => {
                  setPerPage(pp);
                  setPage(1);
                }}
              />
            )}
          </Card>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />

      {/* ORDER DETAIL MODAL */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        onStatusUpdated={() => {
          fetchOrders();
          if (selectedOrder) {
            handleOpenDetailById(selectedOrder.id);
          }
        }}
      />
    </div>
  );
};
