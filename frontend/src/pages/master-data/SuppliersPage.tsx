import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  Factory,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Phone,
  Mail,
  FileText,
  User,
  CreditCard,
  Package,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { RegionSelect } from '../../components/ui/RegionSelect';
import { ModalPortal } from '../../components/ui/Modal';
import type { Supplier } from '../../types/crm';

const PAYMENT_TERMS = ['COD', 'NET-7', 'NET-14', 'NET-30', 'NET-45', 'NET-60'];

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    products_supplied: '',
    payment_terms: '',
    notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
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

      const res = await apiClient.get('/tenant/suppliers', { params });
      setSuppliers(res.data.data || []);
      if (res.data.meta) {
        setPaginationMeta(res.data.meta);
      }
    } catch (err: any) {
      console.error('Fetch suppliers error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data master supplier.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const resetForm = () => {
    setForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      products_supplied: '',
      payment_terms: '',
      notes: '',
    });
    setFormError(null);
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      city: s.city || '',
      products_supplied: s.products_supplied || '',
      payment_terms: s.payment_terms || '',
      notes: s.notes || '',
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
        contact_person: form.contact_person || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        products_supplied: form.products_supplied || undefined,
        payment_terms: form.payment_terms || undefined,
        notes: form.notes || undefined,
      };

      if (editingSupplier) {
        await apiClient.put(`/tenant/suppliers/${editingSupplier.id}`, payload);
        toast.success(`Data supplier "${form.name}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/suppliers', payload);
        toast.success(`Supplier baru "${form.name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      console.error('Save supplier error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan data supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus supplier "${s.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/suppliers/${s.id}`);
      toast.success(`Supplier "${s.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus supplier.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Factory className="w-7 h-7 text-amber-600" /> Master Supplier
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data pemasok dan vendor bahan baku dapur: kontak, produk yang disuplai, dan termin pembayaran
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Supplier
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
                placeholder="Cari nama, kota, produk, kontak..."
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

      {/* Suppliers Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Profil Supplier</th>
                <th className="px-6 py-3.5">Kontak & PIC</th>
                <th className="px-6 py-3.5">Produk yang Disuplai</th>
                <th className="px-6 py-3.5">Termin Bayar</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master supplier...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada data supplier yang terdaftar.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{s.name}</p>
                        {s.city ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            {s.city}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 block mt-0.5">Vendor Bahan</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {s.contact_person && (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{s.contact_person}</span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{s.email}</span>
                          </div>
                        )}
                        {!s.contact_person && !s.phone && !s.email && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-[220px]">
                      {s.products_supplied ? (
                        <div className="flex items-start gap-1.5 text-xs text-slate-700">
                          <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.products_supplied}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {s.payment_terms ? (
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium text-xs">
                            {s.payment_terms}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <Badge variant={s.is_active ? 'success' : 'outline'} className="text-xs">
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Supplier"
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

      {/* MODAL TAMBAH / EDIT SUPPLIER */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-600" />
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Tambah Supplier Baru'}
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
                label="Nama Supplier / Toko *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="UD. Pasar Induk Kramat Jati"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nama PIC / Kontak"
                  value={form.contact_person}
                  onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                  placeholder="Pak Rahmat"
                />
                <Input
                  label="Nomor Telepon / WhatsApp"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="0812-xxxx-xxxx"
                />
              </div>

              <RegionSelect
                city={form.city}
                onCityChange={(c) => setForm((f) => ({ ...f, city: c }))}
                showDistrict={false}
                showPostalCode={false}
                cityLabel="Kota / Wilayah Operasional"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="supplier@domain.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Alamat Lengkap
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  placeholder="Pasar Induk Kramat Jati Blok A No. 15..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Produk / Bahan Baku yang Disuplai
                </label>
                <textarea
                  value={form.products_supplied}
                  onChange={(e) => setForm((f) => ({ ...f, products_supplied: e.target.value }))}
                  rows={2}
                  placeholder="Daging ayam segar, sapi, rempah-rempah..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Termin Pembayaran
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_TERMS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, payment_terms: t }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        form.payment_terms === t
                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <input
                    value={form.payment_terms}
                    onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                    placeholder="Atau ketik manual..."
                    className="flex-1 min-w-[120px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" /> Catatan Tambahan
                  </span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Pengiriman setiap pagi jam 06.00, minimum order 10kg..."
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
                  {editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}
                </Button>
              </div>
            </form>
          </div>
      </ModalPortal>
    </div>
  );
};
