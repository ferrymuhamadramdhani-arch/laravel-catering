import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Truck,
  Clock,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { RegionSelect } from '../../components/ui/RegionSelect';
import { ModalPortal } from '../../components/ui/Modal';
import type { DeliveryArea } from '../../types/crm';

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

const formatMinutes = (minutes: number | null | undefined): string => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h} jam`;
};

export const DeliveryAreasPage: React.FC = () => {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State (Default 10)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  const [form, setForm] = useState({
    name: '',
    city: '',
    district: '',
    postal_code: '',
    delivery_fee: '',
    min_order_amount: '',
    estimated_delivery_minutes: '',
    notes: '',
  });

  const fetchAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await apiClient.get('/tenant/delivery-areas', { params });
      setAreas(res.data.data || []);
      if (res.data.meta) {
        setPaginationMeta(res.data.meta);
      }
    } catch (err: any) {
      console.error('Fetch delivery areas error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data master area pengiriman.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAreas();
  };

  const resetForm = () => {
    setForm({
      name: '',
      city: '',
      district: '',
      postal_code: '',
      delivery_fee: '',
      min_order_amount: '',
      estimated_delivery_minutes: '',
      notes: '',
    });
    setFormError(null);
  };

  const handleOpenCreate = () => {
    setEditingArea(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: DeliveryArea) => {
    setEditingArea(a);
    setForm({
      name: a.name,
      city: a.city || '',
      district: a.district || '',
      postal_code: a.postal_code || '',
      delivery_fee: String(a.delivery_fee || ''),
      min_order_amount: String(a.min_order_amount || ''),
      estimated_delivery_minutes: a.estimated_delivery_minutes
        ? String(a.estimated_delivery_minutes)
        : '',
      notes: a.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name,
        city: form.city || undefined,
        district: form.district || undefined,
        postal_code: form.postal_code || undefined,
        delivery_fee: form.delivery_fee ? Number(form.delivery_fee) : 0,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        estimated_delivery_minutes: form.estimated_delivery_minutes
          ? Number(form.estimated_delivery_minutes)
          : undefined,
        notes: form.notes || undefined,
      };

      if (editingArea) {
        await apiClient.put(`/tenant/delivery-areas/${editingArea.id}`, payload);
        toast.success(`Data area pengiriman "${form.name}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/delivery-areas', payload);
        toast.success(`Area pengiriman baru "${form.name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchAreas();
    } catch (err: any) {
      console.error('Save delivery area error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan data area pengiriman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (a: DeliveryArea) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus area pengiriman "${a.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/delivery-areas/${a.id}`);
      toast.success(`Area pengiriman "${a.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchAreas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus area pengiriman.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-amber-600" /> Area Layanan Pengiriman
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola zona dan area pengiriman katering, tarif ongkos kirim standar, minimum order, dan estimasi waktu
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Area
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama area, kota, kecamatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Delivery Areas Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama Area & Zona</th>
                <th className="px-6 py-3.5">Kota & Kecamatan</th>
                <th className="px-6 py-3.5 text-right">Ongkos Kirim</th>
                <th className="px-6 py-3.5 text-right">Min. Order</th>
                <th className="px-6 py-3.5 text-center">Estimasi Kirim</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master area pengiriman...
                  </td>
                </tr>
              ) : areas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Belum ada area pengiriman yang terdaftar.
                  </td>
                </tr>
              ) : (
                areas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{a.name}</p>
                        {a.notes ? (
                          <span className="text-xs text-slate-400 block mt-0.5 line-clamp-1 italic">
                            "{a.notes}"
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 block mt-0.5">Zona Pengiriman</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium text-slate-800 text-sm block">
                          {a.city || '—'}
                        </span>
                        {(a.district || a.postal_code) && (
                          <span className="text-xs text-slate-400 mt-0.5 block">
                            {[a.district, a.postal_code ? `(${a.postal_code})` : null]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(a.delivery_fee)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-700">
                      {Number(a.min_order_amount) > 0 ? (
                        formatCurrency(a.min_order_amount)
                      ) : (
                        <span className="text-slate-400 text-xs">Tanpa Min.</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formatMinutes(a.estimated_delivery_minutes)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Badge variant={a.is_active ? 'success' : 'outline'} className="text-xs">
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Area"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Area"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* MODAL TAMBAH / EDIT AREA PENGIRIMAN */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" />
                {editingArea ? `Edit Area: ${editingArea.name}` : 'Tambah Area Pengiriman'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Input
                label="Nama Area / Zona Pengiriman *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Kebayoran Baru, Zona Utara, dll."
                required
              />

              <RegionSelect
                city={form.city}
                district={form.district}
                postalCode={form.postal_code}
                onCityChange={(c) => setForm((f) => ({ ...f, city: c }))}
                onDistrictChange={(d) => setForm((f) => ({ ...f, district: d }))}
                onPostalCodeChange={(p) => setForm((f) => ({ ...f, postal_code: p }))}
              />

              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
                <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-600" /> Detail Tarif & Ketentuan Pengiriman
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Ongkos Kirim (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.delivery_fee}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_fee: e.target.value }))}
                      placeholder="25000"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Minimum Order (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.min_order_amount}
                      onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                      placeholder="500000"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Estimasi Waktu Kirim (menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.estimated_delivery_minutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_delivery_minutes: e.target.value }))
                    }
                    placeholder="45"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Catatan Tambahan
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Perlu 1 jam persiapan sebelum kirim, hanya hari kerja..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingArea ? 'Simpan Perubahan' : 'Tambah Area'}
                </Button>
              </div>
            </form>
          </div>
      </ModalPortal>
    </div>
  );
};
