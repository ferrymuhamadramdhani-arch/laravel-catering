import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  UtensilsCrossed,
  Layers
} from 'lucide-react';
import type { MenuCategory } from '../../types/menu';

export const MenuCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number | string>('0');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/tenant/menu-categories');
      setCategories(res.data.data || []);
    } catch (err: any) {
      console.error('Fetch categories error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data kategori menu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setSortOrder((categories.length + 1).toString());
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
      } else {
        await apiClient.post('/tenant/menu-categories', payload);
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
      alert(`Kategori "${cat.name}" masih memiliki ${cat.menu_items_count} item menu. Pindahkan menu terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/menu-categories/${cat.id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus kategori.');
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Memuat data kategori menu...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Belum ada kategori menu yang dibuat.
          </div>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{cat.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">{cat.slug}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Urutan: {cat.sort_order}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 mt-3 line-clamp-2">
                  {cat.description || 'Tidak ada keterangan tambahan'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-800">{cat.menu_items_count || 0}</strong> Item Menu
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-slate-50 transition-colors"
                    title="Edit Kategori"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-colors"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODAL TAMBAH / EDIT KATEGORI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
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
        </div>
      )}
    </div>
  );
};
