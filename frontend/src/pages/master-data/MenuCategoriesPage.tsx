import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  UtensilsCrossed
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { ModalPortal } from '../../components/ui/Modal';
import type { MenuCategory } from '../../types/menu';

export const MenuCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number | string>('0');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await apiClient.get('/tenant/menu-categories', { params });
      setCategories(res.data.data || []);
      if (res.data.meta) {
        setPaginationMeta(res.data.meta);
      } else {
        setPaginationMeta({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: (res.data.data || []).length,
        });
      }
    } catch (err: any) {
      console.error('Fetch categories error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data kategori menu.');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCategories();
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setSortOrder((paginationMeta.total + 1).toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        description: description || undefined,
        sort_order: Number(sortOrder) || 0,
      };

      if (editingCategory) {
        await apiClient.put(`/tenant/menu-categories/${editingCategory.id}`, payload);
        toast.success(`Kategori menu "${name}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/menu-categories', payload);
        toast.success(`Kategori menu baru "${name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Save category error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan kategori menu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: MenuCategory) => {
    if (cat.menu_items_count && cat.menu_items_count > 0) {
      toast.warning(`Kategori "${cat.name}" masih memiliki ${cat.menu_items_count} item menu. Pindahkan menu terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/menu-categories/${cat.id}`);
      toast.success(`Kategori "${cat.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-amber-600" /> Kategori Menu
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola klasifikasi dan pengelompokan hidangan katering (Olahan Ayam, Daging, Sayuran, Snack, dll.)
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Kategori
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
                placeholder="Cari nama kategori..."
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

      {/* Categories Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama Kategori</th>
                <th className="px-6 py-3.5">Deskripsi</th>
                <th className="px-6 py-3.5 text-center">Urutan Tampil</th>
                <th className="px-6 py-3.5 text-center">Jumlah Menu</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Memuat data kategori menu...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Belum ada kategori menu yang dibuat.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{cat.name}</p>
                        <span className="text-xs text-slate-400 font-mono">{cat.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs">
                      {cat.description ? (
                        <p className="line-clamp-2">{cat.description}</p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tidak ada keterangan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="text-xs font-semibold">
                        Urutan {cat.sort_order}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-900">{cat.menu_items_count || 0}</strong> Item
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Kategori"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Kategori"
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

        {/* Pagination */}
        <Pagination
          meta={paginationMeta}
          onPageChange={(newPage) => setPage(newPage)}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setPage(1);
          }}
        />
      </Card>

      {/* MODAL TAMBAH / EDIT KATEGORI */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 my-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg">
              {editingCategory ? `Edit Kategori: ${editingCategory.name}` : 'Tambah Kategori Baru'}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3 my-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <Input
              label="Nama Kategori"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Olahan Daging Sapi"
              required
            />

            <Input
              label="Deskripsi Kategori (Opsional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Aneka masakan rendang, empal, dan lada hitam"
            />

            <Input
              label="Urutan Tampil (Sort Order)"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="1"
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </Button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
};
