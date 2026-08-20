import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  ShoppingBag,
  ChefHat,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Clock,
  CreditCard,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Calendar,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDateIndo } from '../../lib/utils';
import { Link } from 'react-router-dom';
import apiClient from '../../api/axios';
import type { DashboardMetrics } from '../../types/dashboard';
import type { Order } from '../../types/order';
import { OrderDetailModal } from '../orders/OrderDetailModal';

export const DashboardPage: React.FC = () => {
  const { currentTenant, user } = useAuthStore();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchDashboardMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/tenant/dashboard/metrics');
      if (res.data?.data) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const getOrderStatusConfig = (status: string) => {
    switch (status) {
      case 'in_production':
        return { label: 'Sedang Dimasak', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: ChefHat };
      case 'ready':
        return { label: 'Siap Kirim', bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: Package };
      case 'delivering':
        return { label: 'Dalam Pengantaran', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Truck };
      case 'completed':
        return { label: 'Selesai', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 };
      case 'confirmed':
        return { label: 'Terkonfirmasi', bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle2 };
      default:
        return { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting & Quick Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Selamat Datang, {user?.name || 'Owner'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Workspace: <span className="font-semibold text-slate-800">{currentTenant?.name || 'Catering Workspace'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={fetchDashboardMetrics}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Pesanan Baru
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue This Month */}
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Kas Masuk Bulan Ini
            </p>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics?.revenue_this_month || 0)}
          </p>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-400">Total Piutang:</span>
            <span className="font-bold text-rose-600">
              {formatCurrency(metrics?.total_receivables || 0)}
            </span>
          </div>
        </Card>

        {/* Active Orders */}
        <Card className="p-5 border-l-4 border-l-blue-500 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pesanan Aktif Berjalan
            </p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.active_orders_count || 0}{' '}
            <span className="text-sm font-normal text-slate-500">Pesanan</span>
          </p>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-400">Selesai Bulan Ini:</span>
            <span className="font-bold text-emerald-600">
              {metrics?.completed_orders_this_month || 0} Pesanan
            </span>
          </div>
        </Card>

        {/* Kitchen Production Today */}
        <Card className="p-5 border-l-4 border-l-purple-500 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Jadwal Dapur Hari Ini
            </p>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.today_portions_count || 0}{' '}
            <span className="text-sm font-normal text-slate-500">Porsi</span>
          </p>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-400">Total Pengiriman:</span>
            <span className="font-bold text-purple-700">
              {metrics?.today_orders_count || 0} Order Hari Ini
            </span>
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Peringatan Stok Menipis
            </p>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.low_stock_materials_count || 0}{' '}
            <span className="text-sm font-normal text-slate-500">Bahan</span>
          </p>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-400">PO Aktif:</span>
            <span className="font-bold text-amber-700">
              {metrics?.pending_po_count || 0} Menunggu Masuk
            </span>
          </div>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/orders"
          className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Kelola Pesanan</span>
            <span className="text-[10px] text-slate-400">List &amp; Kalender</span>
          </div>
        </Link>

        <Link
          to="/procurement/purchase-orders"
          className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Pengadaan (PO)</span>
            <span className="text-[10px] text-slate-400">Beli Bahan Baku</span>
          </div>
        </Link>

        <Link
          to="/inventory/stock-in"
          className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Stok &amp; Gudang</span>
            <span className="text-[10px] text-slate-400">Mutasi &amp; Opname</span>
          </div>
        </Link>

        <Link
          to="/finance"
          className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Faktur &amp; Piutang</span>
            <span className="text-[10px] text-slate-400">Monitoring Bayar</span>
          </div>
        </Link>
      </div>

      {/* Main Content 2-Column: Priority Orders (Left) & Alerts/Payments (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Priority / Upcoming Orders */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Jadwal Pesanan Prioritas
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Pesanan hari ini dan terdekat yang membutuhkan persiapan dapur &amp; pengiriman
                  </p>
                </div>
              </div>

              <Link
                to="/orders"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">No. Order</th>
                    <th className="px-5 py-3">Acara &amp; Pelanggan</th>
                    <th className="px-5 py-3">Jadwal Kirim</th>
                    <th className="px-5 py-3 text-center">Porsi</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Pembayaran</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.priority_orders && metrics.priority_orders.length > 0 ? (
                    metrics.priority_orders.map((ord) => {
                      const statusCfg = getOrderStatusConfig(ord.status);
                      const totalPortions = ord.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {ord.order_number}
                          </td>

                          <td className="px-5 py-3.5">
                            <strong className="text-slate-800 block">{ord.event_name || ord.event_type}</strong>
                            <span className="text-[10px] text-slate-400">{ord.customer?.name || 'Pelanggan'}</span>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{formatDateIndo(ord.delivery_date)}</div>
                            <span className="text-[10px] text-slate-400">
                              {ord.delivery_time ? `pk ${ord.delivery_time}` : '—'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                            {totalPortions > 0 ? `${totalPortions} pax` : '—'}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <Badge
                              variant={
                                ord.payment_status === 'paid'
                                  ? 'success'
                                  : ord.payment_status === 'partially_paid'
                                  ? 'default'
                                  : 'outline'
                              }
                              className="text-[10px] capitalize font-bold"
                            >
                              {ord.payment_status === 'paid'
                                ? 'Lunas'
                                : ord.payment_status === 'partially_paid'
                                ? 'DP Masuk'
                                : 'Belum Bayar'}
                            </Badge>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOrderDetail(ord)}
                              className="gap-1 text-xs py-1 px-2.5 h-auto text-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detail
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingBag className="w-7 h-7 text-slate-300" />
                          <p className="text-xs font-medium text-slate-600">Belum ada jadwal pesanan aktif.</p>
                          <Link to="/orders" className="text-xs text-amber-600 font-semibold hover:underline">
                            + Buat Pesanan Sekarang
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Low Stock Alerts & Recent Payments Log */}
        <div className="lg:col-span-4 space-y-6">
          {/* Low Stock Alert Box */}
          <Card className="p-5 border border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bahan Baku Menipis
                </h3>
              </div>
              <Link
                to="/procurement/purchase-orders"
                className="text-[11px] font-bold text-amber-700 hover:underline"
              >
                + Buat PO
              </Link>
            </div>

            {metrics?.low_stock_items && metrics.low_stock_items.length > 0 ? (
              <div className="space-y-2.5">
                {metrics.low_stock_items.map((mat) => {
                  const current = Number(mat.current_stock);
                  const min = Number(mat.minimum_stock);
                  const isZero = current <= 0;

                  return (
                    <div
                      key={mat.id}
                      className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block">{mat.name}</strong>
                        <span className="text-[10px] text-slate-400">
                          Min. Stok: {min} {mat.unit}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-md ${
                            isZero
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {current} {mat.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="font-semibold">Semua Stok Bahan Aman</p>
                <span className="text-[10px] text-slate-500">Tidak ada bahan di bawah batas minimum</span>
              </div>
            )}
          </Card>

          {/* Recent Received Payments Log */}
          <Card className="p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Kas Masuk Terbaru
                </h3>
              </div>
              <Link to="/finance" className="text-[11px] font-bold text-amber-600 hover:underline">
                Keuangan
              </Link>
            </div>

            {metrics?.recent_payments && metrics.recent_payments.length > 0 ? (
              <div className="space-y-2.5">
                {metrics.recent_payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-xs font-bold text-slate-800 block">
                        {p.customer?.name || 'Pelanggan'}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {p.payment_number} • {formatDateIndo(p.payment_date)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700 block">
                        +{formatCurrency(Number(p.amount))}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat pembayaran.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onStatusUpdated={() => {
          fetchDashboardMetrics();
          if (selectedOrder) {
            apiClient.get(`/tenant/orders/${selectedOrder.id}`).then((res) => {
              if (res.data?.data) setSelectedOrder(res.data.data);
            });
          }
        }}
      />
    </div>
  );
};
