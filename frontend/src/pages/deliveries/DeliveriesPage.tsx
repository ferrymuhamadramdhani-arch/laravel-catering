import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  Truck,
  Search,
  RefreshCw,
  Plus,
  MapPin,
  Clock,
  User,
  Phone,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smartphone,
  LayoutGrid,
  Wifi,
  WifiOff,
  Navigation,
  Check,
  PackageCheck,
  Send,
  Calendar,
} from 'lucide-react';
import type { Delivery, OfflineDeliveryRecord } from '../../types/delivery';
import type { Order } from '../../types/order';
import { AssignCourierModal } from './AssignCourierModal';
import { ProofOfDeliveryModal } from './ProofOfDeliveryModal';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'assigned':
      return { label: 'Kurir Ditugaskan', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'dispatched':
      return { label: 'Dalam Perjalanan', bg: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' };
    case 'arrived':
      return { label: 'Tiba di Lokasi', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
    case 'delivered':
      return { label: 'Terkirim (Selesai)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'failed':
      return { label: 'Gagal Kirim', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const DeliveriesPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'driver'>('admin');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Offline PWA Queue State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isPodOpen, setIsPodOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [previewProof, setPreviewProof] = useState<Delivery | null>(null);

  // Offline queue key
  const getOfflineKey = () => `cateros_offline_deliveries_active`;

  const checkOfflineQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(getOfflineKey());
      if (raw) {
        const queue: OfflineDeliveryRecord[] = JSON.parse(raw);
        setOfflineQueueCount(queue.filter((q) => !q.synced).length);
      } else {
        setOfflineQueueCount(0);
      }
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    const raw = localStorage.getItem(getOfflineKey());
    if (!raw) return;

    try {
      const queue: OfflineDeliveryRecord[] = JSON.parse(raw);
      const pending = queue.filter((q) => !q.synced);
      if (pending.length === 0) return;

      setIsSyncing(true);
      const res = await apiClient.post('/tenant/deliveries/sync-offline', {
        records: pending,
      });

      if (res.data?.success) {
        // Clear synced items
        localStorage.removeItem(getOfflineKey());
        setOfflineQueueCount(0);
        alert(`Berhasil menyinkronkan ${res.data.data?.synced_count || pending.length} data pengiriman offline ke server!`);
        fetchDeliveries();
      }
    } catch (err) {
      console.error('Offline sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkOfflineQueue, syncOfflineData]);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'driver') {
        const res = await apiClient.get('/tenant/deliveries/today', {
          params: { date: selectedDate },
        });
        setDeliveries(res.data.data?.deliveries || []);
        setUnassignedOrders(res.data.data?.unassigned_orders || []);
      } else {
        const params: any = {
          page,
          per_page: perPage,
          date: selectedDate,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== 'all') params.status = statusFilter;

        const [listRes, todayRes] = await Promise.all([
          apiClient.get('/tenant/deliveries', { params }),
          apiClient.get('/tenant/deliveries/today', { params: { date: selectedDate } }),
        ]);

        setDeliveries(listRes.data.data || []);
        if (listRes.data.meta) setMeta(listRes.data.meta);
        setUnassignedOrders(todayRes.data.data?.unassigned_orders || []);
      }
    } catch (err) {
      console.error('Fetch deliveries error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search, statusFilter, selectedDate, viewMode]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleUpdateStatus = async (delivery: Delivery, newStatus: string) => {
    if (!navigator.onLine) {
      // Offline status update
      const record: OfflineDeliveryRecord = {
        id: 'status_' + Date.now(),
        delivery_id: delivery.id,
        order_id: delivery.order_id,
        order_number: delivery.order?.order_number,
        status: newStatus as any,
        synced: false,
        timestamp: Date.now(),
      };
      const raw = localStorage.getItem(getOfflineKey());
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(record);
      localStorage.setItem(getOfflineKey(), JSON.stringify(queue));
      checkOfflineQueue();
      setDeliveries((prev) =>
        prev.map((d) => (d.id === delivery.id ? { ...d, status: newStatus as any } : d))
      );
      alert(`Mode Offline: Status berhasil diubah ke '${newStatus}'. Akan disinkronkan saat online.`);
      return;
    }

    try {
      await apiClient.patch(`/tenant/deliveries/${delivery.id}/status`, {
        status: newStatus,
      });
      fetchDeliveries();
    } catch (err: any) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || 'Gagal mengubah status pengiriman.');
    }
  };

  const handleOpenAssign = (order?: Order, delivery?: Delivery) => {
    setSelectedOrderForAssign(order || null);
    setSelectedDelivery(delivery || null);
    setIsAssignOpen(true);
  };

  const handleOpenPod = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsPodOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-amber-600" /> Pengiriman &amp; Logistik Kurir
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Penugasan armada driver, pelacakan live pengiriman catering, dan bukti serah terima (POD PWA)
          </p>
        </div>

        {/* View Mode Switcher & Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {offlineQueueCount > 0 && (
            <Button
              size="sm"
              onClick={syncOfflineData}
              disabled={!isOnline || isSyncing}
              className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Offline ({offlineQueueCount})
            </Button>
          )}

          {/* View Toggle */}
          <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Admin Dispatch
            </button>

            <button
              onClick={() => setViewMode('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'driver'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Kurir Mobile View
            </button>
          </div>

          <Link
            to="/deliveries/routes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5 text-amber-600" /> Peta &amp; Optimasi Rute
          </Link>

          <Button
            onClick={fetchDeliveries}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Date & Search Bar */}
      <Card className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Tanggal Pengiriman:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          {viewMode === 'admin' && (
            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari kurir, no order, alamat..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div className="relative w-40">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-6 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="assigned">Ditugaskan</option>
                  <option value="dispatched">Dalam Perjalanan</option>
                  <option value="arrived">Tiba di Lokasi</option>
                  <option value="delivered">Terkirim (Selesai)</option>
                  <option value="failed">Gagal Kirim</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Unassigned Orders Warning Banner (if any) */}
      {unassignedOrders.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Ada {unassignedOrders.length} Pesanan Hari Ini Belum Memiliki Kurir!
              </h3>
              <p className="text-xs text-amber-800">
                Tugaskan driver sekarang agar pesanan dapat dikirim tepat waktu sesuai target jam tiba.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {unassignedOrders.slice(0, 3).map((ord) => (
              <Button
                key={ord.id}
                size="sm"
                onClick={() => handleOpenAssign(ord)}
                className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg whitespace-nowrap shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Tugaskan {ord.order_number} ({ord.delivery_time})
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* DRIVER / COURIER MOBILE VIEW */}
      {viewMode === 'driver' ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <div>
                <strong className="text-xs font-bold block">Tampilan Kurir Aktif</strong>
                <span className="text-[10px] text-slate-400">
                  {deliveries.length} Pengiriman Terjadwal ({selectedDate})
                </span>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-lg text-emerald-400 font-mono">
              {deliveries.filter((d) => d.status === 'delivered').length} / {deliveries.length} Selesai
            </span>
          </div>

          {deliveries.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Tidak ada pengiriman kurir untuk tanggal ini.</p>
            </Card>
          ) : (
            deliveries.map((del) => {
              const statusCfg = getStatusBadge(del.status);
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                del.destination_address || ''
              )}`;

              return (
                <Card
                  key={del.id}
                  className={`p-4.5 rounded-2xl border transition-all space-y-3.5 ${
                    del.status === 'delivered'
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : del.status === 'dispatched'
                      ? 'bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {del.delivery_number}
                      </span>
                      <strong className="text-sm font-bold text-slate-900">
                        {del.order?.order_number || 'Pesanan'}
                      </strong>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Recipient & Target Time */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{del.recipient_name || del.order?.customer?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        <span>Tiba: {del.delivery_time_target || del.order?.delivery_time}</span>
                      </div>
                    </div>

                    {del.recipient_phone && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${del.recipient_phone}`}
                          className="flex items-center gap-1 text-slate-600 hover:text-amber-600 text-[11px]"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{del.recipient_phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/${del.recipient_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
                        >
                          WhatsApp Penerima
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Destination Address */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 text-slate-700">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{del.destination_address}</span>
                      </div>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 p-1.5 bg-white border border-slate-200 rounded-lg text-blue-600 hover:bg-blue-50 shadow-2xs"
                        title="Buka di Google Maps"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Driver Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    {del.status === 'assigned' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(del, 'dispatched')}
                        className="w-full text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs py-2"
                      >
                        <Send className="w-3.5 h-3.5" /> Mulai Berangkat (Dispatched)
                      </Button>
                    )}

                    {del.status === 'dispatched' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(del, 'arrived')}
                        className="w-full text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs py-2"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Tiba di Alamat Lokasi
                      </Button>
                    )}

                    {(del.status === 'arrived' || del.status === 'dispatched' || del.status === 'assigned') && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenPod(del)}
                        className="w-full text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs py-2"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Upload Bukti Terima (POD)
                      </Button>
                    )}

                    {del.status === 'delivered' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewProof(del)}
                        className="w-full text-xs font-bold gap-1.5 text-emerald-700 bg-emerald-50/50 border-emerald-200 rounded-xl"
                      >
                        <Check className="w-3.5 h-3.5" /> Lihat Bukti POD
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* ADMIN DISPATCH TABLE VIEW */
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">No. Pengiriman</th>
                  <th className="px-6 py-3.5">Pesanan &amp; Penerima</th>
                  <th className="px-6 py-3.5">Alamat Tujuan</th>
                  <th className="px-6 py-3.5">Kurir &amp; Armada</th>
                  <th className="px-6 py-3.5 text-center">Target Jam</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      Memuat data pengiriman...
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                      {unassignedOrders.length > 0 ? (
                        <div className="space-y-4 max-w-2xl mx-auto text-left">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">Pesanan Siap Kirim (Belum Ditugaskan Kurir)</p>
                              <p className="text-xs text-slate-500">Terdapat {unassignedOrders.length} pesanan yang siap ditugaskan ke armada driver hari ini:</p>
                            </div>
                            <Link
                              to="/deliveries/routes"
                              className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
                            >
                              <Navigation className="w-3.5 h-3.5" /> Buka Optimasi Rute
                            </Link>
                          </div>

                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                            {unassignedOrders.map((ord) => (
                              <div key={ord.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-xs font-mono font-bold text-slate-900">{ord.order_number}</strong>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs font-semibold text-slate-800">{ord.customer?.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                                      {ord.status === 'ready' ? 'Siap Kirim' : ord.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    {ord.delivery_address || 'Alamat katering'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                    Jam: {ord.delivery_time || '11:30'}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenAssign(ord)}
                                    className="text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Tugaskan Kurir
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                            <Truck className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-800 text-sm">Belum Ada Penugasan Pengiriman</p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Tidak ada pesanan aktif yang perlu dikirim untuk tanggal yang dipilih.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del) => {
                    const statusCfg = getStatusBadge(del.status);

                    return (
                      <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <strong className="font-bold text-slate-900 font-mono text-xs block">
                            {del.delivery_number}
                          </strong>
                          {del.delivery_batch_code && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {del.delivery_batch_code}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <strong className="font-bold text-slate-900 text-xs block">
                            {del.order?.order_number || 'N/A'}
                          </strong>
                          <span className="text-xs text-slate-600">
                            {del.recipient_name || del.order?.customer?.name}
                          </span>
                        </td>

                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex items-start gap-1.5 text-xs text-slate-700 line-clamp-2">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{del.destination_address}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-xs">
                              <strong className="font-bold text-slate-900 block">
                                {del.courier_name}
                              </strong>
                              <span className="text-[11px] text-slate-400 capitalize">
                                {del.vehicle_type} {del.vehicle_plate_number ? `(${del.vehicle_plate_number})` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-mono font-bold text-xs text-slate-800">
                          {del.delivery_time_target || '11:30'}
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
                              onClick={() => handleOpenAssign(undefined, del)}
                              className="gap-1 text-xs py-1 px-2.5 h-auto text-slate-700"
                              title="Edit Penugasan Kurir"
                            >
                              Edit Kurir
                            </Button>

                            {del.status !== 'delivered' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPod(del)}
                                className="gap-1 text-xs py-1 px-2.5 h-auto font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <PackageCheck className="w-3.5 h-3.5" /> Input POD
                              </Button>
                            )}

                            {del.proof && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewProof(del)}
                                className="gap-1 text-xs py-1 px-2.5 h-auto text-blue-700 bg-blue-50/50 border-blue-200"
                              >
                                <Eye className="w-3.5 h-3.5" /> Bukti POD
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
      )}

      {/* MODALS */}
      <AssignCourierModal
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
          setSelectedOrderForAssign(null);
          setSelectedDelivery(null);
        }}
        order={selectedOrderForAssign}
        delivery={selectedDelivery}
        onSuccess={fetchDeliveries}
      />

      <ProofOfDeliveryModal
        isOpen={isPodOpen}
        onClose={() => {
          setIsPodOpen(false);
          setSelectedDelivery(null);
        }}
        delivery={selectedDelivery}
        onSuccess={(isOffline) => {
          if (isOffline) checkOfflineQueue();
          fetchDeliveries();
        }}
      />

      {/* Proof of Delivery Preview Modal */}
      {previewProof && previewProof.proof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Bukti Serah Terima (POD)</h2>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p>
                  <strong>Penerima:</strong> {previewProof.proof.receiver_name}
                </p>
                <p>
                  <strong>Waktu Terima:</strong> {previewProof.proof.delivered_at || 'Tercatat'}
                </p>
                {previewProof.proof.notes && (
                  <p>
                    <strong>Catatan:</strong> {previewProof.proof.notes}
                  </p>
                )}
              </div>

              {previewProof.proof.photo_url && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Foto Serah Terima:</span>
                  <img
                    src={previewProof.proof.photo_url}
                    alt="Foto POD"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {previewProof.proof.signature_data && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Tanda Tangan Digital:</span>
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center">
                    <img
                      src={previewProof.proof.signature_data}
                      alt="Signature"
                      className="max-h-24 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewProof(null)}
                className="w-full text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
