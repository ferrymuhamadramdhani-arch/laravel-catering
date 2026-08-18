import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Package,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Percent,
  UtensilsCrossed
} from 'lucide-react';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import type { MenuPackage, MenuItem } from '../../types/menu';

const PACKAGE_TYPES: Record<string, string> = {
  nasi_kotak: 'Nasi Kotak / Box',
  prasmanan: 'Prasmanan / Buffet',
  snack_box: 'Snack Box',
  tumpeng: 'Nasi Tumpeng',
  custom: 'Paket Custom',
};

interface PackageFormItem {
  menu_item_id: number;
  quantity: number;
  notes?: string;
}

export const MenuPackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<MenuPackage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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
  const [editingPackage, setEditingPackage] = useState<MenuPackage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [packageType, setPackageType] = useState('nasi_kotak');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  const [minOrder, setMinOrder] = useState<number | string>('10');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<PackageFormItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (typeFilter !== 'all') params.package_type = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [pkgsRes, itemsRes] = await Promise.all([
        apiClient.get('/tenant/menu-packages', { params }),
        apiClient.get('/tenant/menu-items', { params: { all: true } }),
      ]);

      setPackages(pkgsRes.data.data || []);
      if (pkgsRes.data.meta) {
        setPaginationMeta(pkgsRes.data.meta);
      } else {
        setPaginationMeta({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: (pkgsRes.data.data || []).length,
        });
      }
      setMenuItems(itemsRes.data.data || []);
    } catch (err: any) {
      console.error('Fetch packages error:', err);
      setError(err.response?.data?.message || 'Gagal memuat data paket menu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, perPage, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setName('');
    setCode('');
    setPackageType('nasi_kotak');
    setSellingPrice('');
    setMinOrder('10');
    setDescription('');
    setSelectedItems([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: MenuPackage) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setCode(pkg.code || '');
    setPackageType(pkg.package_type);
    setSellingPrice(pkg.selling_price);
    setMinOrder(pkg.min_order_quantity.toString());
    setDescription(pkg.description || '');

    const initialItems: PackageFormItem[] = (pkg.package_items || []).map((pi) => ({
      menu_item_id: pi.menu_item_id,
      quantity: pi.quantity,
      notes: pi.notes || '',
    }));
    setSelectedItems(initialItems);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (menuItems.length === 0) {
      alert('Belum ada item menu masakan. Buat item menu terlebih dahulu.');
      return;
    }
    const defaultItem = menuItems[0];
    setSelectedItems([
      ...selectedItems,
      {
        menu_item_id: defaultItem.id,
        quantity: 1,
        notes: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PackageFormItem, value: any) => {
    const updated = [...selectedItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'quantity' || field === 'menu_item_id' ? Number(value) : value,
    };
    setSelectedItems(updated);
  };

  // Live total HPP calculation for package in modal
  const estimatedPackageHpp = selectedItems.reduce((total, pi) => {
    const item = menuItems.find((m) => m.id === pi.menu_item_id);
    const itemHpp = Number(item?.calculated_hpp) || 0;
    const qty = Number(pi.quantity) || 1;
    return total + itemHpp * qty;
  }, 0);

  const priceNum = Number(sellingPrice) || 0;
  const estimatedMargin = priceNum > 0 ? ((priceNum - estimatedPackageHpp) / priceNum) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setFormError('Pilih minimal 1 menu masakan untuk menyusun paket ini.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        package_type: packageType,
        code: code || undefined,
        selling_price: Number(sellingPrice),
        min_order_quantity: Number(minOrder) || 1,
        description: description || undefined,
        items: selectedItems.map((pi) => ({
          menu_item_id: Number(pi.menu_item_id),
          quantity: Number(pi.quantity) || 1,
          notes: pi.notes || undefined,
        })),
      };

      if (editingPackage) {
        await apiClient.put(`/tenant/menu-packages/${editingPackage.id}`, payload);
      } else {
        await apiClient.post('/tenant/menu-packages', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Save package error:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan paket menu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pkg: MenuPackage) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus paket "${pkg.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/tenant/menu-packages/${pkg.id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus paket menu.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-amber-600" /> Paket Menu & Bundling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola paket bundling katering (Nasi Kotak, Prasmanan, Snack Box) dan kalkulasi total modal HPP
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Buat Paket Baru
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
                placeholder="Cari nama atau kode paket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>

          {/* Package Type Dropdown Filter */}
          <div className="relative flex items-center w-full md:w-72">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-medium cursor-pointer appearance-none shadow-2xs hover:border-slate-300"
            >
              <option value="all">Semua Tipe Paket ({packages.length} Paket)</option>
              {Object.entries(PACKAGE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
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

      {/* Packages Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Tipe Paket</th>
                <th className="px-6 py-3.5">Komponen Menu Penyusun</th>
                <th className="px-6 py-3.5 text-right">Total Modal HPP</th>
                <th className="px-6 py-3.5 text-right">Harga Jual</th>
                <th className="px-6 py-3.5 text-center">Margin Laba</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat katalog paket menu...
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada paket menu yang dibuat.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => {
                  const marginNum = Number(pkg.margin_percentage) || 0;
                  const hppNum = Number(pkg.calculated_hpp) || 0;
                  const sellingNum = Number(pkg.selling_price) || 0;
                  const itemsList = pkg.package_items || [];

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-snug">{pkg.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] py-0 bg-slate-50">
                                {PACKAGE_TYPES[pkg.package_type] || pkg.package_type}
                              </Badge>
                              <span className="text-xs text-slate-400">Min. {pkg.min_order_quantity} porsi</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {itemsList.slice(0, 3).map((pi, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{pi.menu_item?.name || 'Menu'}</span>
                              {pi.quantity > 1 && (
                                <span className="text-[10px] text-slate-400">({pi.quantity}x)</span>
                              )}
                            </div>
                          ))}
                          {itemsList.length > 3 && (
                            <span className="text-[11px] text-amber-700 font-medium pl-3">
                              +{itemsList.length - 3} item menu lainnya
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        Rp {hppNum.toLocaleString('id-ID')}
                        <span className="text-[11px] text-slate-400 block font-normal">Akumulasi HPP</span>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        Rp {sellingNum.toLocaleString('id-ID')}
                        <span className="text-[11px] text-slate-400 block font-normal">per box / pax</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            marginNum >= 35
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : marginNum >= 20
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <Percent className="w-3 h-3" /> {marginNum.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(pkg)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Paket"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pkg)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Paket"
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

      {/* MODAL BUILDER PAKET MENU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingPackage ? `Edit Paket: ${editingPackage.name}` : 'Buat Paket Menu Bundling Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Gabungkan beberapa menu masakan menjadi paket lengkap (Nasi Kotak, Prasmanan, dll.)
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Paket Menu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Paket Nasi Kotak Ayam Bakar Komplit"
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipe Paket
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(PACKAGE_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Kode Paket (Opsional)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PKG-NK-01"
                />

                <Input
                  label="Harga Jual Paket (Rp)"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="35000"
                  required
                />

                <Input
                  label="Minimal Pesan (Porsi/Box)"
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>

              <Input
                label="Deskripsi & Kelengkapan (Opsional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian paket termasuk nasi, lauk, sambal, kerupuk, dan sendok tisu"
              />

              {/* ITEM BUNDLING SELECTOR */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4 text-amber-600" /> Komponen Menu Penyusun Paket
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih menu-menu masakan yang dimasukkan ke dalam 1 paket ini
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItemRow}
                    className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Komponen Menu
                  </Button>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 bg-slate-50/50">
                    Belum ada menu dalam paket. Klik "+ Tambah Komponen Menu" untuk menyusun isi paket katering.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map((row, idx) => {
                      const item = menuItems.find((m) => m.id === row.menu_item_id);
                      const hpp = Number(item?.calculated_hpp) || 0;
                      const subtotalHpp = hpp * (Number(row.quantity) || 1);

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
                        >
                          <div className="flex-1 w-full">
                            <select
                              value={row.menu_item_id}
                              onChange={(e) => handleItemChange(idx, 'menu_item_id', e.target.value)}
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs focus:border-amber-500 focus:outline-none font-medium"
                            >
                              {menuItems.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (HPP: Rp {Number(m.calculated_hpp).toLocaleString('id-ID')})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-20">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:border-amber-500 focus:outline-none text-center"
                              required
                            />
                          </div>

                          <div className="w-full sm:w-36">
                            <input
                              type="text"
                              value={row.notes || ''}
                              onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                              placeholder="Catatan (Paha/Dada)"
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          <div className="w-full sm:w-28 text-right font-semibold text-xs text-slate-800">
                            Rp {Math.round(subtotalHpp).toLocaleString('id-ID')}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Hapus Komponen"
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
                    <span className="text-slate-500">Total Modal HPP Paket:</span>
                    <p className="font-bold text-base text-slate-900">
                      Rp {Math.round(estimatedPackageHpp).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500">Laba Kotor Per Box/Pax:</span>
                    <p className="font-bold text-base text-emerald-700">
                      Rp {Math.max(0, Math.round(priceNum - estimatedPackageHpp)).toLocaleString('id-ID')}
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
                  {editingPackage ? 'Simpan Perubahan' : 'Simpan Paket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
