import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  TrendingDown
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import type { RawMaterial } from '../../types/menu';

const CATEGORIES = [
  'Bahan Pokok',
  'Daging/Unggas',
  'Daging/Sapi',
  'Ikan & Seafood',
  'Sayuran',
  'Bumbu & Rempah',
  'Sembako',
  'Kemasan',
  'Minuman & Perasa',
];

const UNITS = ['kg', 'gram', 'liter', 'ml', 'pcs', 'butir', 'ikat', 'sachet', 'kaleng', 'box'];

export const RawMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unit, setUnit] = useState('kg');
  const [defaultPrice, setDefaultPrice] = useState<number | string>('');
  const [minStock, setMinStock] = useState<number | string>('');
  const [currentStock, setCurrentStock] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/tenant/raw-materials', { params });
      setMaterials(res.data.data || []);
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
      console.error('Fetch materials error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data master bahan baku.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [page, perPage, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMaterials();
  };

  const handleOpenCreateModal = () => {
    setEditingMaterial(null);
    setName('');
    setCode('');
    setCategory(CATEGORIES[0]);
    setUnit('kg');
    setDefaultPrice('');
    setMinStock('0');
    setCurrentStock('0');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (material: RawMaterial) => {
    setEditingMaterial(material);
    setName(material.name);
    setCode(material.code || '');
    setCategory(material.category);
    setUnit(material.unit);
    setDefaultPrice(material.default_purchase_price);
    setMinStock(material.minimum_stock);
    setCurrentStock(material.current_stock);
    setNotes(material.notes || '');
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
        code: code || undefined,
        category,
        unit,
        default_purchase_price: Number(defaultPrice),
        minimum_stock: Number(minStock) || 0,
        current_stock: Number(currentStock) || 0,
        notes: notes || undefined,
      };

      if (editingMaterial) {
        await apiClient.put(`/tenant/raw-materials/${editingMaterial.id}`, payload);
        toast.success(`Bahan baku "${name}" berhasil diperbarui!`, 'Berhasil Disimpan');
      } else {
        await apiClient.post('/tenant/raw-materials', payload);
        toast.success(`Bahan baku baru "${name}" berhasil ditambahkan!`, 'Berhasil Disimpan');
      }

      setIsModalOpen(false);
      fetchMaterials();
    } catch (err: any) {
      console.error('Save material error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan bahan baku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (material: RawMaterial) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus bahan baku "${material.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/raw-materials/${material.id}`);
      toast.success(`Bahan baku "${material.name}" berhasil dihapus.`, 'Data Dihapus');
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus bahan baku.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-amber-600" /> Master Bahan Baku
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data bahan baku dapur, satuan takaran, dan harga beli standar untuk resep BOM
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Tambah Bahan Baku
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
                placeholder="Cari nama atau kode bahan..."
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
              <option value="all">Semua Kategori Bahan ({materials.length} Item)</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

      {/* Materials Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Kode Bahan</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5 text-right">Harga Beli Standar</th>
                <th className="px-6 py-3.5 text-center">Stok & Satuan</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Memuat data master bahan baku...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Belum ada bahan baku yang terdaftar.
                  </td>
                </tr>
              ) : (
                materials.map((mat) => {
                  const currentStockNum = Number(mat.current_stock);
                  const minStockNum = Number(mat.minimum_stock);
                  const isLowStock = minStockNum > 0 && currentStockNum <= minStockNum;

                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">{mat.name}</p>
                          <span className="text-xs font-mono text-slate-400 mt-0.5 inline-block">
                            {mat.code || 'Tanpa Kode'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-slate-50 font-normal text-slate-700">
                          {mat.category}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        Rp {Number(mat.default_purchase_price).toLocaleString('id-ID')}
                        <span className="text-xs text-slate-400 block">per {mat.unit}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          <span>{currentStockNum}</span>
                          <span className="text-slate-400 text-xs">{mat.unit}</span>
                        </div>
                        {isLowStock && (
                          <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 mx-auto w-fit mt-1">
                            <TrendingDown className="w-3 h-3" /> Stok Rendah (Min: {minStockNum})
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(mat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Bahan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Bahan"
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

      {/* MODAL TAMBAH / EDIT BAHAN BAKU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingMaterial ? `Edit Bahan Baku: ${editingMaterial.name}` : 'Tambah Bahan Baku Baru'}
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
                label="Nama Bahan Baku"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Daging Ayam Fillet Dada"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kode SKU (Opsional)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="RM-AYAM-01"
                />

                <Select
                  label="Kategori Bahan"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Satuan Ukur Standar"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>

                <Input
                  label={`Harga Beli Standar (Rp/${unit})`}
                  type="number"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="48000"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={`Stok Awal (${unit})`}
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                />

                <Input
                  label={`Batas Stok Minimum (${unit})`}
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Input
                label="Catatan / Info Supplier (Opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Supplier Pasar Induk Kramat Jati"
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
                  {editingMaterial ? 'Simpan Perubahan' : 'Tambah Bahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
