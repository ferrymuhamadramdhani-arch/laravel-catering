import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Bike,
  Car,
  Package,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { ModalPortal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { Vehicle, VehicleType, VehicleCondition } from '../../types/fleet';

const VEHICLE_TYPES: Record<VehicleType, { label: string; icon: React.FC<any> }> = {
  motorcycle: { label: 'Sepeda Motor (Box)', icon: Bike },
  car: { label: 'Mobil Pribadi / MPV', icon: Car },
  van: { label: 'Blind Van / Box', icon: Truck },
  truck: { label: 'Truk Box Ekspedisi', icon: Truck },
};

const CONDITION_CONFIG: Record<
  VehicleCondition,
  { label: string; bg: string; text: string; border: string }
> = {
  good: {
    label: 'Kondisi Prima (Siap Jalan)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  maintenance: {
    label: 'Servis / Perawatan Berkala',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  repairing: {
    label: 'Perbaikan Bengkel',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    vehicle_type: 'van' as VehicleType,
    license_plate: '',
    max_capacity_box: 100,
    condition_status: 'good' as VehicleCondition,
    is_active: true,
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeFilter !== 'all') params.vehicle_type = typeFilter;

      const res = await apiClient.get('/tenant/vehicles', { params });
      if (res.data?.data) {
        if (Array.isArray(res.data.data)) {
          setVehicles(res.data.data);
        } else {
          setVehicles(res.data.data.data || []);
          if (res.data.data.current_page) {
            setPaginationMeta({
              current_page: res.data.data.current_page,
              last_page: res.data.data.last_page,
              per_page: res.data.data.per_page,
              total: res.data.data.total,
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch vehicles error:', err);
      toast.error(err.response?.data?.message || 'Gagal memuat data armada.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      name: '',
      vehicle_type: 'van',
      license_plate: '',
      max_capacity_box: 150,
      condition_status: 'good',
      is_active: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      name: v.name,
      vehicle_type: v.vehicle_type,
      license_plate: v.license_plate,
      max_capacity_box: v.max_capacity_box || 100,
      condition_status: v.condition_status || 'good',
      is_active: v.is_active,
      notes: v.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.license_plate.trim()) {
      toast.error('Nama armada dan Plat Nomor Polisi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        await apiClient.put(`/tenant/vehicles/${editingVehicle.id}`, formData);
        toast.success(`Armada "${formData.name}" berhasil diperbarui.`, 'Data Diperbarui');
      } else {
        await apiClient.post('/tenant/vehicles', formData);
        toast.success(`Armada "${formData.name}" berhasil didaftarkan.`, 'Armada Ditambahkan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data armada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenant/vehicles/${vehicleToDelete.id}`);
      toast.success(`Armada "${vehicleToDelete.name}" berhasil dihapus.`, 'Data Dihapus');
      setVehicleToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data armada.');
    } finally {
      setIsDeleting(false);
    }
  };

  const readyVehiclesCount = vehicles.filter(
    (v) => v.is_active && v.condition_status === 'good'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-amber-600" /> Master Data Armada Kendaraan (Fleet)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data kendaraan operasional katering, plat nomor polisi, kapasitas muatan box, dan status kelaikan jalan.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs">
          <Plus className="w-4 h-4" /> Tambah Armada Baru
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500">Total Unit Armada</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{vehicles.length} Kendaraan</h3>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500">Siap Jalan &amp; Prima</p>
          <h3 className="text-xl font-bold text-emerald-700 mt-1">{readyVehiclesCount} Unit Standby</h3>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500">Dalam Perawatan / Servis</p>
          <h3 className="text-xl font-bold text-amber-800 mt-1">
            {vehicles.filter((v) => v.condition_status !== 'good').length} Unit
          </h3>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Cari nama kendaraan, plat nomor polisi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Tipe Kendaraan</option>
              <option value="motorcycle">Sepeda Motor</option>
              <option value="car">Mobil MPV</option>
              <option value="van">Blind Van</option>
              <option value="truck">Truk Box</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama Armada</th>
                <th className="px-6 py-3.5">Tipe Kendaraan</th>
                <th className="px-6 py-3.5">Plat Nomor Polisi</th>
                <th className="px-6 py-3.5 text-center">Kapasitas Muat</th>
                <th className="px-6 py-3.5 text-center">Kondisi Kelaikan</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master armada...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada armada kendaraan yang terdaftar.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const vType = VEHICLE_TYPES[v.vehicle_type] || VEHICLE_TYPES.van;
                  const Icon = vType.icon;
                  const condCfg = CONDITION_CONFIG[v.condition_status] || CONDITION_CONFIG.good;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{v.name}</p>
                          {v.notes ? (
                            <span className="text-xs text-slate-400 block mt-0.5 line-clamp-1 italic">
                              "{v.notes}"
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 block mt-0.5">Armada Logistik</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                          <Icon className="w-3.5 h-3.5 text-amber-600" />
                          <span>{vType.label}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {v.license_plate}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>{v.max_capacity_box} Box</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${condCfg.bg} ${condCfg.text} ${condCfg.border}`}
                        >
                          {condCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(v)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Armada"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setVehicleToDelete(v)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Armada"
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

      {/* Modal Add/Edit Vehicle */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              {editingVehicle ? 'Edit Data Armada Kendaraan' : 'Tambah Armada Kendaraan Baru'}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Armada Kendaraan *</label>
              <Input
                type="text"
                required
                placeholder="Contoh: Daihatsu GranMax Blind Van 01"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenis Kendaraan</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_type: e.target.value as VehicleType })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="motorcycle">Sepeda Motor (Box)</option>
                  <option value="car">Mobil MPV</option>
                  <option value="van">Blind Van / GranMax</option>
                  <option value="truck">Truk Box Pendingin</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Plat Nomor Polisi *</label>
                <Input
                  type="text"
                  required
                  placeholder="Contoh: B 1234 ABC"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  className="text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kapasitas Maksimal (Box/Porsi)</label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={formData.max_capacity_box}
                  onChange={(e) => setFormData({ ...formData, max_capacity_box: Number(e.target.value) })}
                  className="text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kondisi Kelaikan Kendaraan</label>
                <select
                  value={formData.condition_status}
                  onChange={(e) =>
                    setFormData({ ...formData, condition_status: e.target.value as VehicleCondition })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="good">Kondisi Prima (Siap Jalan)</option>
                  <option value="maintenance">Servis / Perawatan Berkala</option>
                  <option value="repairing">Perbaikan Bengkel</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="vehicle_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="vehicle_is_active" className="font-medium text-slate-700 cursor-pointer">
                Kendaraan aktif dalam inventaris operasional
              </label>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan / Riwayat Servis</label>
              <textarea
                rows={2}
                placeholder="Misal: Servis oli setiap 5.000 km, STNK berlaku hingga 2028..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
                {editingVehicle ? 'Simpan Perubahan' : 'Simpan Armada'}
              </Button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Armada Kendaraan"
        message={
          vehicleToDelete ? (
            <div>
              <p>
                Apakah Anda yakin ingin menghapus armada{' '}
                <strong className="text-slate-900">{vehicleToDelete.name}</strong> ({vehicleToDelete.license_plate})?
              </p>
            </div>
          ) : ''
        }
        confirmText="Hapus Armada"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
