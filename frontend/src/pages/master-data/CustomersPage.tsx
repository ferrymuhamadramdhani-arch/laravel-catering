import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  Users,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { RegionSelect } from '../../components/ui/RegionSelect';
import { ModalPortal } from '../../components/ui/Modal';
import type { Customer } from '../../types/crm';

const CUSTOMER_TYPES = [
  { value: 'all', label: 'Semua Tipe Pelanggan' },
  { value: 'individual', label: 'Pelanggan Individu' },
  { value: 'corporate', label: 'Pelanggan Korporat / Instansi' },
];

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  const [form, setForm] = useState({
    name: '',
    type: 'individual' as 'individual' | 'corporate',
    phone: '',
    email: '',
    address: '',
    city: '',
    pic_name: '',
    npwp: '',
    notes: '',
  });

  const fetchCustomers = useCallback(async () => {
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
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const res = await apiClient.get('/tenant/customers', { params });
      setCustomers(res.data.data || []);
      if (res.data.meta) {
        setPaginationMeta(res.data.meta);
      }
    } catch (err: any) {
      console.error('Fetch customers error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data master pelanggan.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery, typeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'individual',
      phone: '',
      email: '',
      address: '',
      city: '',
      pic_name: '',
      npwp: '',
      notes: '',
    });
    setFormError(null);
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      type: c.type,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      pic_name: c.pic_name || '',
      npwp: c.npwp || '',
      notes: c.notes || '',
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
        type: form.type,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        pic_name: form.pic_name || undefined,
        npwp: form.npwp || undefined,
        notes: form.notes || undefined,
      };

      if (editingCustomer) {
        await apiClient.put(`/tenant/customers/${editingCustomer.id}`, payload);
        toast.success(`Data pelanggan "${form.name}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/customers', payload);
        toast.success(`Pelanggan baru "${form.name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error('Save customer error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan "${c.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/customers/${c.id}`);
      toast.success(`Pelanggan "${c.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pelanggan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-600" /> Master Pelanggan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola database pelanggan: individu, instansi korporat, dan preferensi khusus mereka
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama, email, telepon, kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>

          {/* Type Filter Dropdown */}
          <div className="relative flex items-center w-full md:w-72">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-medium cursor-pointer appearance-none shadow-2xs hover:border-slate-300"
            >
              {CUSTOMER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Profil Pelanggan</th>
                <th className="px-6 py-3.5">Tipe</th>
                <th className="px-6 py-3.5">Kontak</th>
                <th className="px-6 py-3.5">Kota / Lokasi</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada data pelanggan yang terdaftar.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                            c.type === 'corporate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.type === 'corporate' ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{c.name}</p>
                          {c.pic_name ? (
                            <span className="text-xs text-slate-400 block mt-0.5">
                              PIC: {c.pic_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 block mt-0.5">
                              {c.type === 'corporate' ? 'Pelanggan Korporat' : 'Pelanggan Individu'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={
                          c.type === 'corporate'
                            ? 'bg-amber-50 border-amber-200 text-amber-800 font-medium text-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 font-normal text-xs'
                        }
                      >
                        {c.type === 'corporate' ? 'Korporat' : 'Individu'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[160px]">{c.email}</span>
                          </div>
                        )}
                        {!c.phone && !c.email && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {c.city ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.city}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Badge variant={c.is_active ? 'success' : 'outline'} className="text-xs">
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Pelanggan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Pelanggan"
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

      {/* MODAL TAMBAH / EDIT PELANGGAN */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                {editingCustomer ? `Edit Pelanggan: ${editingCustomer.name}` : 'Tambah Pelanggan Baru'}
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
              {/* Tipe Pelanggan Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tipe Pelanggan
                </label>
                <div className="flex gap-3">
                  {(['individual', 'corporate'] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                        form.type === t
                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={form.type === t}
                        onChange={() => setForm((f) => ({ ...f, type: t }))}
                        className="sr-only"
                      />
                      {t === 'individual' ? (
                        <User className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-amber-600" />
                      )}
                      {t === 'individual' ? 'Individu' : 'Korporat / Instansi'}
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Nama Pelanggan / Perusahaan *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  form.type === 'corporate' ? 'PT. Maju Bersama Indonesia' : 'Budi Santoso'
                }
                required
              />

              {form.type === 'corporate' && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nama PIC"
                    value={form.pic_name}
                    onChange={(e) => setForm((f) => ({ ...f, pic_name: e.target.value }))}
                    placeholder="Nama penanggung jawab"
                  />
                  <Input
                    label="NPWP"
                    value={form.npwp}
                    onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
                    placeholder="12.345.678.9-012.345"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nomor Telepon / WhatsApp"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@domain.com"
                />
              </div>

              <RegionSelect
                city={form.city}
                onCityChange={(c) => setForm((f) => ({ ...f, city: c }))}
                showDistrict={false}
                showPostalCode={false}
                cityLabel="Kota / Wilayah"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Alamat Lengkap
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  placeholder="Jl. Sudirman No. 12, Gedung X Lantai 5..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" /> Catatan / Preferensi
                    Khusus
                  </span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Contoh: tidak suka pedas, preferensi menu halal, alergi seafood..."
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
                  {editingCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </Button>
              </div>
            </form>
          </div>
      </ModalPortal>
    </div>
  );
};
