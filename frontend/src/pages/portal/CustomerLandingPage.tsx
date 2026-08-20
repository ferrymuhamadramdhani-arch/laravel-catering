import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../api/axios';
import { useCartStore } from '../../stores/cartStore';
import { formatCurrency } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Calendar,
  Plus,
  Minus,
  MapPin,
  Clock,
  RotateCcw,
  Filter,
} from 'lucide-react';
import type { PublicCatalogData } from '../../types/portal';

export const CustomerLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const currentSlug = slug || 'berkah-catering';

  const [catalog, setCatalog] = useState<PublicCatalogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'name_asc'>('recommended');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Date Capacity Checker
  const [checkDate, setCheckDate] = useState<string>('');
  const [capacityResult, setCapacityResult] = useState<{
    is_available: boolean;
    available_slots: number;
    max_capacity: number;
  } | null>(null);
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);

  const {
    items,
    setTenantSlug,
    setTenantProfile,
    addItem,
    updateQuantity,
    getTotalPortions,
    getSubtotal,
  } = useCartStore();

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/public/tenant/${currentSlug}/catalog`);
      if (res.data?.data) {
        setCatalog(res.data.data);
        setTenantSlug(currentSlug);
        if (res.data.data.tenant) {
          setTenantProfile(res.data.data.tenant);
        }
      }
    } catch (err) {
      console.error('Failed to load public catalog:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentSlug, setTenantSlug, setTenantProfile]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleCheckCapacity = async () => {
    if (!checkDate) return;
    setIsCheckingCapacity(true);
    try {
      const res = await apiClient.post(`/public/tenant/${currentSlug}/check-capacity`, {
        delivery_date: checkDate,
      });
      if (res.data?.data) {
        setCapacityResult(res.data.data);
      }
    } catch (err) {
      console.error('Failed to check capacity:', err);
    } finally {
      setIsCheckingCapacity(false);
    }
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetAllFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
    setSelectedTypes([]);
    setSortBy('recommended');
  };

  // Helper to check cart item
  const getItemCartQuantity = (itemType: 'menu_package' | 'menu_item', itemId: number) => {
    const found = items.find((it) => it.item_type === itemType && it.item_id === itemId);
    return found ? { id: found.id, quantity: found.quantity } : null;
  };

  // Filtered & Sorted Packages
  const filteredPackages = useMemo(() => {
    if (!catalog?.packages) return [];

    let result = catalog.packages.filter((pkg) => {
      // Category filter
      if (activeCategory !== 'all' && activeCategory !== 'packages') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = pkg.name.toLowerCase().includes(q);
        const matchDesc = pkg.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      // Package Type filter
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(pkg.package_type) && !selectedTypes.includes('packages')) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      const priceA = Number(a.selling_price || 0);
      const priceB = Number(b.selling_price || 0);
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [catalog, activeCategory, searchQuery, selectedTypes, sortBy]);

  // Filtered & Sorted Menu Items
  const filteredMenuItems = useMemo(() => {
    if (!catalog?.menu_items) return [];

    let result = catalog.menu_items.filter((item) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'packages') return false;
        if (item.category?.slug !== activeCategory) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      // Package Type filter
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes('single')) return false;
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      const priceA = Number(a.selling_price || 0);
      const priceB = Number(b.selling_price || 0);
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [catalog, activeCategory, searchQuery, selectedTypes, sortBy]);

  const totalItemsCount = filteredPackages.length + filteredMenuItems.length;
  const totalPortions = getTotalPortions();
  const subtotal = getSubtotal();

  if (isLoading) {
    return (
      <div className="py-36 text-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Memuat Katalog Menu...
        </p>
      </div>
    );
  }

  // Sidebar Filter Component
  const FilterSidebarContent = () => (
    <div className="space-y-6">
      {/* 1. Filter Kategori (Vertical list with counts) */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Kategori Menu
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Semua Menu</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                activeCategory === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {(catalog?.packages.length || 0) + (catalog?.menu_items.length || 0)}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('packages')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
              activeCategory === 'packages'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Paket Bundling</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                activeCategory === 'packages'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {catalog?.packages.length || 0}
            </span>
          </button>

          {catalog?.categories.map((cat) => {
            const count =
              catalog?.menu_items.filter((it) => it.menu_category_id === cat.id).length || 0;
            const isSelected = activeCategory === cat.slug;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                    isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter Tipe Sajian */}
      <div className="space-y-2.5 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Format Sajian
        </h3>
        <div className="space-y-2 text-xs text-slate-700">
          {[
            { id: 'box', label: 'Nasi Kotak (Box)' },
            { id: 'prasmanan', label: 'Prasmanan / Buffet' },
            { id: 'single', label: 'Menu Satuan (A La Carte)' },
          ].map((type) => (
            <label
              key={type.id}
              className="flex items-center gap-2.5 cursor-pointer select-none font-medium hover:text-slate-950"
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={() => toggleTypeFilter(type.id)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Reset Button */}
      {(activeCategory !== 'all' || searchQuery || selectedTypes.length > 0 || sortBy !== 'recommended') && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetAllFilters}
          className="w-full gap-1.5 text-xs text-slate-600 hover:text-amber-700 border-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* 1. Storefront Restaurant Banner (White & Clean) */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Store Information */}
            <div className="flex items-start sm:items-center gap-4">
              {catalog?.tenant.logo_url ? (
                <img
                  src={catalog.tenant.logo_url}
                  alt={catalog.tenant.name}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                  {(catalog?.tenant.name || currentSlug).charAt(0).toUpperCase()}
                </div>
              )}

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {catalog?.tenant.name || 'Catering Nusantara'}
                  </h1>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    Official Catering
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                  {catalog?.tenant.description ||
                    'Prasmanan Premium • Nasi Kotak Rapat • Snack Box Acara • Tumpeng Mini'}
                </p>

                {/* Address & Hours */}
                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{catalog?.tenant.address || 'Wilayah Layanan Terjangkau'}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 text-slate-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>07:00 - 20:00 WIB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Kitchen Availability Bar */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 max-w-md w-full lg:w-80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" /> Cek Ketersediaan Dapur
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={checkDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setCheckDate(e.target.value);
                    setCapacityResult(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                />
                <Button
                  size="sm"
                  onClick={handleCheckCapacity}
                  disabled={!checkDate || isCheckingCapacity}
                  className="text-xs px-3.5 py-1.5 h-auto bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shrink-0 shadow-2xs"
                >
                  {isCheckingCapacity ? '...' : 'Cek'}
                </Button>
              </div>

              {capacityResult && (
                <div className="text-[11px] font-semibold pt-1 border-t border-slate-200 flex items-center gap-1.5">
                  {capacityResult.is_available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700">
                        Slot Tersedia ({capacityResult.available_slots} porsi)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-rose-600">Kuota Dapur Penuh</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Two-Column E-Commerce Storefront Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Sticky Filter Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <FilterSidebarContent />
          </aside>

          {/* RIGHT COLUMN: Products Grid & Search Toolbar */}
          <div className="lg:col-span-9 space-y-6">
            {/* Top Toolbar: Search, Mobile Filter Toggle, & Sorting */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari hidangan / menu katering..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Controls: Mobile Filter Button & Sorting */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden gap-1.5 text-xs rounded-xl border-slate-200"
                >
                  <Filter className="w-3.5 h-3.5 text-amber-600" /> Filter
                </Button>

                {/* Sorting Select */}
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="recommended">Urutkan: Rekomendasi</option>
                  <option value="price_asc">Harga: Termurah</option>
                  <option value="price_desc">Harga: Tertinggi</option>
                  <option value="name_asc">Nama: A - Z</option>
                </select>
              </div>
            </div>

            {/* Active Filters Tag Pills Bar */}
            {(activeCategory !== 'all' || searchQuery || selectedTypes.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-400 font-semibold">Filter aktif:</span>
                {activeCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                    {activeCategory === 'packages'
                      ? 'Paket Bundling'
                      : catalog?.categories.find((c) => c.slug === activeCategory)?.name || activeCategory}
                    <button onClick={() => setActiveCategory('all')} className="hover:text-rose-600 ml-1">
                      ✕
                    </button>
                  </span>
                )}
                {selectedTypes.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold capitalize"
                  >
                    {type}
                    <button onClick={() => toggleTypeFilter(type)} className="hover:text-rose-600 ml-1">
                      ✕
                    </button>
                  </span>
                ))}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 ml-1">
                      ✕
                    </button>
                  </span>
                )}
                <button
                  onClick={resetAllFilters}
                  className="text-xs text-amber-700 hover:text-amber-900 font-bold underline ml-auto"
                >
                  Hapus Semua
                </button>
              </div>
            )}

            {/* Empty State */}
            {totalItemsCount === 0 && (
              <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Tidak ada menu yang sesuai</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Coba ubah kata kunci pencarian atau sesuaikan pilihan filter kategori Anda.
                </p>
                <Button size="sm" onClick={resetAllFilters} className="text-xs font-bold">
                  Reset Filter
                </Button>
              </div>
            )}

            {/* SECTION 1: Paket Menu Bundling */}
            {filteredPackages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Paket Menu Bundling ({filteredPackages.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPackages.map((pkg) => {
                    const price = Number(pkg.selling_price || 0);
                    const inCart = getItemCartQuantity('menu_package', pkg.id);

                    return (
                      <Card
                        key={pkg.id}
                        className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                {pkg.package_type === 'box' ? 'Nasi Kotak' : 'Prasmanan'}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                {pkg.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                              Min. {pkg.min_order_quantity || 1} {pkg.portion_unit || 'pax'}
                            </span>
                          </div>

                          {pkg.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {pkg.description}
                            </p>
                          )}

                          {/* Included items */}
                          {pkg.items && pkg.items.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                                Isi Paket:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {pkg.items.map((it) => (
                                  <span
                                    key={it.id}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                                  >
                                    ✓ {it.menu_item?.name || 'Item'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Price & Direct Add/Quantity Controls */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Harga Satuan:</span>
                            <strong className="text-sm font-black text-slate-900 font-mono">
                              {formatCurrency(price)}
                            </strong>
                            <span className="text-[10px] text-slate-400 ml-1">/{pkg.portion_unit || 'box'}</span>
                          </div>

                          {inCart ? (
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                onClick={() => updateQuantity(inCart.id, inCart.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shadow-2xs transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-slate-900 w-8 text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(inCart.id, inCart.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                addItem({
                                  item_type: 'menu_package',
                                  item_id: pkg.id,
                                  name: pkg.name,
                                  price: price,
                                  portion_unit: pkg.portion_unit || 'box',
                                  quantity: pkg.min_order_quantity || 10,
                                })
                              }
                              className="text-xs font-bold py-1.5 px-3 h-auto bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: Menu Satuan (A La Carte) */}
            {filteredMenuItems.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Menu Satuan &amp; Lauk Pilihan ({filteredMenuItems.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMenuItems.map((item) => {
                    const price = Number(item.selling_price || 0);
                    const inCart = getItemCartQuantity('menu_item', item.id);

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {item.category?.name || 'Menu'}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {formatCurrency(price)}
                              <span className="text-[10px] text-slate-400 font-normal">/{item.portion_unit || 'porsi'}</span>
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>

                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Direct Quantity Controls */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Min. 1 {item.portion_unit || 'porsi'}</span>

                          {inCart ? (
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                onClick={() => updateQuantity(inCart.id, inCart.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shadow-2xs transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-slate-900 w-8 text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(inCart.id, inCart.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                addItem({
                                  item_type: 'menu_item',
                                  item_id: item.id,
                                  name: item.name,
                                  price: price,
                                  portion_unit: item.portion_unit || 'porsi',
                                  quantity: 1,
                                })
                              }
                              className="text-xs py-1.5 px-3 h-auto bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs font-bold"
                            >
                              + Tambah
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Filter Menu</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <FilterSidebarContent />
            <Button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full text-xs font-bold py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalPortions > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-5">
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  {totalPortions} Porsi Dipilih
                </span>
                <strong className="text-sm font-mono font-black text-white">
                  {formatCurrency(subtotal)}
                </strong>
              </div>
            </div>

            <Link
              to={`/p/${currentSlug}/checkout`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition"
            >
              Checkout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
