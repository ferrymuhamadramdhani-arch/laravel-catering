import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Calculator,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { ModalPortal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { MenuItem, MenuCategory, RawMaterial } from '../../types/menu';

interface RecipeFormItem {
  raw_material_id: number;
  quantity: number | string;
  unit: string;
}

export const MenuItemsPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [code, setCode] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  const [portionUnit, setPortionUnit] = useState('porsi');
  const [description, setDescription] = useState('');
  const [recipes, setRecipes] = useState<RecipeFormItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [itemsRes, catsRes, matsRes] = await Promise.all([
        apiClient.get('/tenant/menu-items', { params }),
        apiClient.get('/tenant/menu-categories', { params: { all: true } }),
        apiClient.get('/tenant/raw-materials', { params: { all: true } }),
      ]);

      setMenuItems(itemsRes.data.data || []);
      if (itemsRes.data.meta) {
        setPaginationMeta(itemsRes.data.meta);
      } else {
        setPaginationMeta({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: (itemsRes.data.data || []).length,
        });
      }
      setCategories(catsRes.data.data || []);
      setRawMaterials(matsRes.data.data || []);
    } catch (err: any) {
      console.error('Fetch menu error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data menu item.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, perPage, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setCode('');
    setSellingPrice('');
    setPortionUnit('porsi');
    setDescription('');
    setRecipes([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.menu_category_id || '');
    setCode(item.code || '');
    setSellingPrice(item.selling_price);
    setPortionUnit(item.portion_unit || 'porsi');
    setDescription(item.description || '');

    const initialRecipes: RecipeFormItem[] = (item.recipes || []).map((r) => ({
      raw_material_id: r.raw_material_id,
      quantity: r.quantity,
      unit: r.unit,
    }));
    setRecipes(initialRecipes);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Recipe Builder Handlers
  const handleAddRecipeRow = () => {
    if (rawMaterials.length === 0) {
      alert('Belum ada master bahan baku. Silakan tambahkan bahan baku terlebih dahulu.');
      return;
    }
    const defaultMat = rawMaterials[0];
    setRecipes([
      ...recipes,
      {
        raw_material_id: defaultMat.id,
        quantity: '0.1',
        unit: defaultMat.unit,
      },
    ]);
  };

  const handleRemoveRecipeRow = (index: number) => {
    setRecipes(recipes.filter((_, i) => i !== index));
  };

  const handleRecipeChange = (index: number, field: keyof RecipeFormItem, value: any) => {
    const updated = [...recipes];
    if (field === 'raw_material_id') {
      const mat = rawMaterials.find((m) => m.id === Number(value));
      updated[index] = {
        ...updated[index],
        raw_material_id: Number(value),
        unit: mat ? mat.unit : updated[index].unit,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setRecipes(updated);
  };

  // Live HPP estimation in form
  const estimatedHpp = recipes.reduce((total, r) => {
    const mat = rawMaterials.find((m) => m.id === r.raw_material_id);
    if (!mat) return total;
    const price = Number(mat.default_purchase_price) || 0;
    const qty = Number(r.quantity) || 0;

    let cost = price * qty;
    if (mat.unit === 'kg' && r.unit === 'gram') cost = (price / 1000) * qty;
    if (mat.unit === 'liter' && r.unit === 'ml') cost = (price / 1000) * qty;

    return total + cost;
  }, 0);

  const priceNum = Number(sellingPrice) || 0;
  const estimatedMargin = priceNum > 0 ? ((priceNum - estimatedHpp) / priceNum) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        menu_category_id: categoryId ? Number(categoryId) : null,
        code: code || undefined,
        selling_price: Number(sellingPrice),
        portion_unit: portionUnit,
        description: description || undefined,
        recipes: recipes.map((r) => ({
          raw_material_id: Number(r.raw_material_id),
          quantity: Number(r.quantity),
          unit: r.unit,
        })),
      };

      if (editingItem) {
        await apiClient.put(`/tenant/menu-items/${editingItem.id}`, payload);
        toast.success(`Item menu "${name}" beserta resep BOM berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/menu-items', payload);
        toast.success(`Item menu baru "${name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Save menu item error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan item menu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenant/menu-items/${itemToDelete.id}`);
      toast.success(`Menu "${itemToDelete.name}" berhasil dihapus.`, 'Data Dihapus');
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus menu.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-amber-600" /> Item Menu & Resep (BOM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola katalog masakan, resep takaran bahan baku (BOM), dan kalkulasi HPP otomatis
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Menu Baru
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
                placeholder="Cari nama atau kode menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>

          {/* Category Dropdown Filter */}
          <div className="relative flex items-center w-full md:w-72">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-medium cursor-pointer appearance-none shadow-2xs hover:border-slate-300"
            >
              <option value="all">Semua Kategori Menu ({menuItems.length} Item)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
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

      {/* Menu Items Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Kategori Menu</th>
                <th className="px-6 py-3.5 text-center">Komposisi BOM</th>
                <th className="px-6 py-3.5 text-right">Modal HPP</th>
                <th className="px-6 py-3.5 text-right">Harga Jual</th>
                <th className="px-6 py-3.5 text-center">Margin Laba</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat katalog menu & resep...
                  </td>
                </tr>
              ) : menuItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada menu yang dibuat.
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => {
                  const marginNum = Number(item.margin_percentage) || 0;
                  const hppNum = Number(item.calculated_hpp) || 0;
                  const sellingNum = Number(item.selling_price) || 0;
                  const recipeCount = item.recipes?.length || 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-mono">{item.code || 'MN-00'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-amber-800 font-medium">
                              {item.category?.name || 'Tanpa Kategori'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {recipeCount} Bahan Resep
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        Rp {hppNum.toLocaleString('id-ID')}
                        <span className="text-[11px] text-slate-400 block font-normal">HPP Otomatis</span>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        Rp {sellingNum.toLocaleString('id-ID')}
                        <span className="text-[11px] text-slate-400 block font-normal">per {item.portion_unit}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            marginNum >= 35
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : marginNum >= 20
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {marginNum.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Menu & Resep"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Menu"
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

      {/* MODAL BUILDER MENU & RESEP (BOM) */}
      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingItem ? `Edit Menu & BOM: ${editingItem.name}` : 'Tambah Menu Baru & Resep (BOM)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Lengkapi rincian menu dan tentukan komposisi bahan baku untuk menghitung HPP otomatis
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Menu Masakan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ayam Bakar Madu Spesial"
                  required
                />

                <Select
                  label="Kategori Menu"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Kode SKU (Opsional)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="MN-AYAM-01"
                />

                <Input
                  label="Harga Jual (Rp)"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="25000"
                  required
                />

                <Input
                  label="Satuan Porsi"
                  value={portionUnit}
                  onChange={(e) => setPortionUnit(e.target.value)}
                  placeholder="porsi / pcs / mangkok"
                />
              </div>

              <Input
                label="Deskripsi Menu (Opsional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian rasa, bumbu, dan keunggulan masakan"
              />

              {/* BOM RECIPE BUILDER SECTION */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-600" /> Komposisi Resep / Bill of Materials (BOM)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Bahan yang diperlukan untuk memproduksi 1 {portionUnit || 'porsi'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRecipeRow}
                    className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Bahan Resep
                  </Button>
                </div>

                {recipes.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 bg-slate-50/50">
                    Belum ada bahan baku dalam resep. Klik "+ Tambah Bahan Resep" untuk mulai menghitung HPP otomatis.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipes.map((row, idx) => {
                      const mat = rawMaterials.find((m) => m.id === row.raw_material_id);
                      const price = Number(mat?.default_purchase_price) || 0;
                      const qty = Number(row.quantity) || 0;
                      let subtotal = price * qty;
                      if (mat?.unit === 'kg' && row.unit === 'gram') subtotal = (price / 1000) * qty;
                      if (mat?.unit === 'liter' && row.unit === 'ml') subtotal = (price / 1000) * qty;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
                        >
                          <div className="flex-1 w-full relative">
                            <select
                              value={row.raw_material_id}
                              onChange={(e) => handleRecipeChange(idx, 'raw_material_id', e.target.value)}
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-2.5 pr-8 text-xs focus:border-amber-500 focus:outline-none font-medium appearance-none cursor-pointer"
                            >
                              {rawMaterials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (Rp {Number(m.default_purchase_price).toLocaleString('id-ID')}/{m.unit})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          <div className="w-full sm:w-28">
                            <input
                              type="number"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleRecipeChange(idx, 'quantity', e.target.value)}
                              placeholder="Takaran"
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:border-amber-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="w-full sm:w-24 relative">
                            <select
                              value={row.unit}
                              onChange={(e) => handleRecipeChange(idx, 'unit', e.target.value)}
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-2 pr-7 text-xs focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="gram">gram</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="liter">liter</option>
                              <option value="pcs">pcs</option>
                              <option value="butir">butir</option>
                              <option value="ikat">ikat</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          <div className="w-full sm:w-28 text-right font-semibold text-xs text-slate-800">
                            Rp {Math.round(subtotal).toLocaleString('id-ID')}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Live Calculated HPP & Profit Box */}
                <div className="p-4 mt-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Estimasi Total Modal HPP:</span>
                    <p className="font-bold text-base text-slate-900">
                      Rp {Math.round(estimatedHpp).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Laba Kotor Per {portionUnit || 'Porsi'}:</span>
                    <p className="font-bold text-base text-emerald-700">
                      Rp {Math.max(0, Math.round(priceNum - estimatedHpp)).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Margin Keuntungan:</span>
                    <p
                      className={`font-bold text-base ${
                        estimatedMargin >= 30 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {estimatedMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Menu'}
                </Button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Item Menu"
        message={
          itemToDelete ? (
            <div>
              <p>
                Apakah Anda yakin ingin menghapus item menu <strong className="text-slate-900">{itemToDelete.name}</strong>?
              </p>
              <p className="text-rose-600 mt-2 text-[11px] font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
                ⚠️ Seluruh resep takaran BOM dan relasi paket terkait menu ini akan terhapus.
              </p>
            </div>
          ) : ''
        }
        confirmText="Hapus Menu"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
