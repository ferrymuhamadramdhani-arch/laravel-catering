import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Bike,
  Car,
  Truck,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { ModalPortal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { Courier, VehicleType } from '../../types/fleet';

const VEHICLE_TYPES: Record<VehicleType, { label: string; icon: React.FC<any> }> = {
  motorcycle: { label: 'Sepeda Motor (Box)', icon: Bike },
  car: { label: 'Mobil Pribadi / MPV', icon: Car },
  van: { label: 'Blind Van / Box', icon: Truck },
  truck: { label: 'Truk Box Ekspedisi', icon: Truck },
};

export const CouriersPage: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_type: 'SIM C',
    license_number: '',
    vehicle_type_preference: 'motorcycle' as VehicleType,
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
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active' ? 1 : 0;

      const res = await apiClient.get('/tenant/couriers', { params });
      if (res.data?.data) {
        if (Array.isArray(res.data.data)) {
          setCouriers(res.data.data);
        } else {
          setCouriers(res.data.data.data || []);
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
      console.error('Fetch couriers error:', err);
      toast.error(err.response?.data?.message || 'Gagal memuat data kurir.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = () => {
    setEditingCourier(null);
    setFormData({
      name: '',
      phone: '',
      license_type: 'SIM C',
      license_number: '',
      vehicle_type_preference: 'motorcycle',
      is_active: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      phone: courier.phone,
      license_type: courier.license_type || 'SIM C',
      license_number: courier.license_number || '',
      vehicle_type_preference: courier.vehicle_type_preference || 'motorcycle',
      is_active: courier.is_active,
      notes: courier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Nama dan Nomor Telepon wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCourier) {
        await apiClient.put(`/tenant/couriers/${editingCourier.id}`, formData);
        toast.success(`Data kurir "${formData.name}" berhasil diperbarui.`, 'Data Diperbarui');
      } else {
        await apiClient.post('/tenant/couriers', formData);
        toast.success(`Kurir "${formData.name}" berhasil didaftarkan.`, 'Kurir Ditambahkan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data kurir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courierToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenant/couriers/${courierToDelete.id}`);
      toast.success(`Kurir "${courierToDelete.name}" berhasil dihapus.`, 'Data Dihapus');
      setCourierToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data kurir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCouriersCount = couriers.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-600" /> Master Data Kurir &amp; Driver
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data driver internal ekspedisi catering, kontak WhatsApp, nomor SIM, dan preferensi kendaraan.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs">
          <Plus className="w-4 h-4" /> Tambah Kurir Baru
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500">Total Kurir Terdaftar</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{couriers.length} Driver</h3>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500">Status Aktif Bekerja</p>
          <h3 className="text-xl font-bold text-emerald-700 mt-1">{activeCouriersCount} Driver Standby</h3>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500">Preferensi Armada</p>
          <h3 className="text-xl font-bold text-amber-800 mt-1">
            {couriers.filter((c) => c.vehicle_type_preference === 'motorcycle').length} Motor •{' '}
            {couriers.filter((c) => c.vehicle_type_preference !== 'motorcycle').length} Mobil/Van
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
              placeholder="Cari nama driver, no. telepon, nomor SIM..."
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Bekerja</option>
              <option value="inactive">Non-Aktif / Cuti</option>
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
                <th className="px-6 py-3.5">Nama Kurir &amp; Domisili</th>
                <th className="px-6 py-3.5">No. WhatsApp / Kontak</th>
                <th className="px-6 py-3.5">Lisensi Mengemudi (SIM)</th>
                <th className="px-6 py-3.5">Preferensi Kendaraan</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master kurir...
                  </td>
                </tr>
              ) : couriers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada kurir driver yang terdaftar.
                  </td>
                </tr>
              ) : (
                couriers.map((c) => {
                  const vType = VEHICLE_TYPES[c.vehicle_type_preference] || VEHICLE_TYPES.motorcycle;
                  const Icon = vType.icon;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{c.name}</p>
                          {c.notes ? (
                            <span className="text-xs text-slate-400 block mt-0.5 line-clamp-1 italic">
                              "{c.notes}"
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 block mt-0.5">Driver Ekspedisi</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-slate-800">{c.phone}</span>
                          <a
                            href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.license_type || 'SIM C'}</span>
                          {c.license_number && (
                            <span className="text-slate-400 font-mono text-[11px]">({c.license_number})</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                          <Icon className="w-3.5 h-3.5 text-amber-600" />
                          <span>{vType.label}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            c.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.is_active ? 'Aktif Bekerja' : 'Non-Aktif / Cuti'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Driver"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCourierToDelete(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Driver"
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

      {/* Modal Add/Edit Courier */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              {editingCourier ? 'Edit Data Kurir & Driver' : 'Tambah Kurir Driver Baru'}
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
              <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Kurir *</label>
              <Input
                type="text"
                required
                placeholder="Contoh: Rahmat Hidayat"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp / HP Aktif *</label>
              <Input
                type="text"
                required
                placeholder="Contoh: 081234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenis SIM</label>
                <select
                  value={formData.license_type}
                  onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="SIM C">SIM C (Motor)</option>
                  <option value="SIM A">SIM A (Mobil/Van)</option>
                  <option value="SIM B1">SIM B1 (Truk)</option>
                  <option value="SIM B2">SIM B2 (Truk Berat)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor SIM</label>
                <Input
                  type="text"
                  placeholder="Nomor SIM (Opsional)"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Preferensi Jenis Kendaraan</label>
              <select
                value={formData.vehicle_type_preference}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_type_preference: e.target.value as VehicleType })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="motorcycle">Sepeda Motor (Box)</option>
                <option value="car">Mobil Pribadi / MPV</option>
                <option value="van">Blind Van / GranMax Box</option>
                <option value="truck">Truk Box Ekspedisi</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="is_active" className="font-medium text-slate-700 cursor-pointer">
                Kurir aktif dan siap menerima penugasan pengantaran
              </label>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan / Domisili Driver</label>
              <textarea
                rows={2}
                placeholder="Misal: Spesialis rute Jakarta Selatan & Depok, stand by shift pagi..."
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
                {editingCourier ? 'Simpan Perubahan' : 'Simpan Kurir'}
              </Button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!courierToDelete}
        onClose={() => setCourierToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Kurir"
        message={
          courierToDelete ? (
            <div>
              <p>
                Apakah Anda yakin ingin menghapus data kurir driver{' '}
                <strong className="text-slate-900">{courierToDelete.name}</strong> ({courierToDelete.phone})?
              </p>
            </div>
          ) : ''
        }
        confirmText="Hapus Kurir"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
