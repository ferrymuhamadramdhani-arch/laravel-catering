import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Users,
  Clock,
  Truck,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle2,
  Phone,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import type { OptimizedRouteResult } from '../../types/route';
import type { Branch } from '../../types/branch';

export const DeliveryRouteMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const [routeData, setRouteData] = useState<OptimizedRouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Batch Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | ''>('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/branches');
      setBranches(res.data.data || []);
    } catch (err) {
      console.error('Fetch branches failed:', err);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/users');
      const users = res.data.data?.data || res.data.data || [];
      setStaffList(users);
      if (users.length > 0) {
        setSelectedCourierId(users[0].id);
      }
    } catch (err) {
      console.error('Fetch staff failed:', err);
    }
  }, []);

  const fetchOptimizedRoute = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { date: selectedDate };
      if (selectedBranchId) params.branch_id = selectedBranchId;

      const res = await apiClient.get('/tenant/deliveries/routes/optimize', { params });
      setRouteData(res.data.data || null);
    } catch (err) {
      console.error('Fetch optimized route failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedBranchId]);

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, [fetchBranches, fetchStaff]);

  useEffect(() => {
    fetchOptimizedRoute();
  }, [fetchOptimizedRoute]);

  const handleBatchAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeData || routeData.ordered_stops.length === 0) return;
    if (!selectedCourierId) {
      setAssignError('Pilih kurir lapangan.');
      return;
    }

    setIsSubmitting(true);
    setAssignError('');

    try {
      const deliveryIds = routeData.ordered_stops.map((s) => s.delivery_id);
      await apiClient.post('/tenant/deliveries/routes/batch-assign', {
        delivery_ids: deliveryIds,
        courier_user_id: Number(selectedCourierId),
        vehicle_type: vehicleType,
        vehicle_license_plate: licensePlate.trim() || undefined,
      });

      setIsAssignModalOpen(false);
      fetchOptimizedRoute();
    } catch (err: any) {
      console.error('Batch assign failed:', err);
      setAssignError(err.response?.data?.message || 'Gagal menugaskan kurir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/deliveries')}
              className="text-xs py-1 px-2.5 h-auto gap-1 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Pengiriman
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Navigation className="w-7 h-7 text-amber-600" /> Peta &amp; Optimasi Rute Pengantaran Kurir
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Algoritma pengurutan rute multi-stop efisien dari dapur asal ke semua titik singgah alamat pemesan
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOptimizedRoute}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Hitung Ulang Rute"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </Button>

          {routeData?.google_maps_directions_url && (
            <a
              href={routeData.google_maps_directions_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Buka Google Maps Multi-Stop
            </a>
          )}

          {routeData && routeData.ordered_stops.length > 0 && (
            <Button
              onClick={() => setIsAssignModalOpen(true)}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs text-xs"
            >
              <Users className="w-4 h-4" /> Tugaskan Batch ke Kurir
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Tanggal Pengiriman:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Dapur Asal:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="">Semua Lokasi Dapur (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_main ? '(HQ)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg self-end sm:self-auto">
            {routeData?.total_stops || 0} Titik Singgah Hari Ini
          </span>
        </div>
      </Card>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Titik Antar</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {routeData?.total_stops || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">titik alamat</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Estimasi Total Jarak</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800 font-bold">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {routeData?.total_estimated_distance_km || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">kilometer</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimasi Waktu Tempuh</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {routeData?.total_estimated_duration_minutes || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">menit perjalanan</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Titik Dapur Asal (HQ)</span>
            <div className="p-2 rounded-xl bg-slate-200 text-slate-700 font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-800 truncate" title={routeData?.origin.name}>
            {routeData?.origin.name || 'Central Kitchen'}
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5" title={routeData?.origin.address}>
            {routeData?.origin.address || '—'}
          </p>
        </Card>
      </div>

      {/* Ordered Route Stops Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              Urutan Singgah Pengantaran Teroptimasi (Optimal Sequence)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rute disusun berurutan berdasarkan efisiensi radius jarak dan jam target tiba makanan
            </p>
          </div>

          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Titik Dapur Awal $\rightarrow$ Titik Terakhir
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-amber-600" />
            Menghitung optimasi rute terbaik...
          </div>
        ) : !routeData || routeData.ordered_stops.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-7 h-7" />
            </div>
            <p className="font-bold text-slate-800 text-base">Tidak Ada Pengiriman Pada Tanggal Ini</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Pilih tanggal pengiriman lain dengan pesanan aktif atau jadwalkan kurir pengiriman katering.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-amber-200">
            {/* Origin Point Marker */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 sm:-left-8 w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs ring-4 ring-white shadow-xs">
                A
              </div>
              <div className="flex-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">TITIK AWAL (START)</span>
                  <span className="text-xs font-bold text-slate-700">Dapur Keberangkatan</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{routeData.origin.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{routeData.origin.address}</p>
              </div>
            </div>

            {/* Destination Stops */}
            {routeData.ordered_stops.map((stop) => (
              <div key={stop.delivery_id} className="relative flex items-start gap-4">
                <div className="absolute -left-6 sm:-left-8 w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-xs ring-4 ring-white shadow-xs">
                  {stop.stop_number}
                </div>

                <div className="flex-1 p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-colors shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-mono font-bold text-slate-800">
                        Stop #{stop.stop_number} &bull; #{stop.delivery_number}
                      </strong>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Target: {stop.target_delivery_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span>Est. Jarak: <strong className="text-slate-800 font-mono">{stop.leg_estimated_distance_km} km</strong></span>
                      <span>&bull;</span>
                      <span>Est. Waktu: <strong className="text-slate-800 font-mono">~{stop.leg_estimated_duration_minutes} mnt</strong></span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Penerima &amp; Kontak:</span>
                      <p className="text-xs font-bold text-slate-900">{stop.recipient_name}</p>
                      {stop.recipient_phone && (
                        <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {stop.recipient_phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Alamat Tujuan Pengiriman:</span>
                      <p className="text-xs text-slate-700 line-clamp-2">{stop.destination_address}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Kurir: <strong>{stop.courier_name}</strong></span>
                    </div>

                    <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      Status: {stop.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* BATCH ASSIGN MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tugaskan Rute ke Kurir
                  </h3>
                  <p className="text-xs text-slate-500">
                    {routeData?.ordered_stops.length} pengiriman akan ditugaskan sekaligus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleBatchAssign} className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {assignError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Kurir Lapangan *
                </label>
                <select
                  required
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jenis Kendaraan Operasional
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="motorcycle">Sepeda Motor (Box Delivery)</option>
                  <option value="car">Mobil Penumpang</option>
                  <option value="van">Mobil Blind Van (Katering Box Besar)</option>
                  <option value="truck">Mobil Truk Box / Pickup</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nomor Plat Kendaraan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="mis: B 1234 GOG"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
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
                  {isSubmitting ? 'Menugaskan...' : 'Konfirmasi Tugas'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
