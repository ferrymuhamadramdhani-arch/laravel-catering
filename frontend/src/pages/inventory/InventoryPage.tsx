import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import type { RawMaterial } from '../../types/menu';
import type { InventorySummary } from '../../types/inventory';
import { StockInModal } from './StockInModal';
import { StockOutModal } from './StockOutModal';
import { StockOpnameModal } from './StockOpnameModal';

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

export const InventoryPage: React.FC = () => {
  // Summary State
  const [summary, setSummary] = useState<InventorySummary>({
    total_items: 0,
    total_valuation: 0,
    safe_items_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  });

  // Stocks State
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [allMaterialsList, setAllMaterialsList] = useState<RawMaterial[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'safe' | 'low' | 'empty'>('all');
  const [stockPage, setStockPage] = useState(1);
  const [stockPerPage, setStockPerPage] = useState(10);
  const [stockMeta, setStockMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Quick Action Modals
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isOpnameOpen, setIsOpnameOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/inventory/summary');
      if (res.data.data) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Fetch summary error:', err);
    }
  }, []);

  // Fetch All Materials for dropdowns
  const fetchAllMaterials = useCallback(async () => {
    try {
      const res = await apiClient.get('/tenant/raw-materials', { params: { all: true } });
      setAllMaterialsList(res.data.data || []);
    } catch (err) {
      console.error('Fetch all materials error:', err);
    }
  }, []);

  // Fetch Materials List
  const fetchStocks = useCallback(async () => {
    setIsLoadingStocks(true);
    try {
      const params: any = {
        page: stockPage,
        per_page: stockPerPage,
      };

      if (stockCategoryFilter !== 'all') {
        params.category = stockCategoryFilter;
      }
      if (stockSearch.trim()) {
        params.search = stockSearch.trim();
      }

      const res = await apiClient.get('/tenant/raw-materials', { params });
      let items: RawMaterial[] = res.data.data || [];

      // Filter by stock status
      if (stockStatusFilter === 'safe') {
        items = items.filter((m) => Number(m.current_stock) > Number(m.minimum_stock));
      } else if (stockStatusFilter === 'low') {
        items = items.filter(
          (m) => Number(m.current_stock) <= Number(m.minimum_stock) && Number(m.current_stock) > 0
        );
      } else if (stockStatusFilter === 'empty') {
        items = items.filter((m) => Number(m.current_stock) <= 0);
      }

      setMaterials(items);
      if (res.data.meta) {
        setStockMeta(res.data.meta);
      } else {
        setStockMeta({
          current_page: 1,
          last_page: 1,
          per_page: stockPerPage,
          total: items.length,
        });
      }
    } catch (err) {
      console.error('Fetch stocks error:', err);
    } finally {
      setIsLoadingStocks(false);
    }
  }, [stockPage, stockPerPage, stockCategoryFilter, stockSearch, stockStatusFilter]);

  useEffect(() => {
    fetchSummary();
    fetchAllMaterials();
    fetchStocks();
  }, [fetchSummary, fetchAllMaterials, fetchStocks]);

  const handleRefreshAll = () => {
    fetchSummary();
    fetchAllMaterials();
    fetchStocks();
  };

  const handleOpenStockIn = (matId?: number) => {
    setSelectedMaterialId(matId || null);
    setIsStockInOpen(true);
  };

  const handleOpenStockOut = (matId?: number) => {
    setSelectedMaterialId(matId || null);
    setIsStockOutOpen(true);
  };

  const handleOpenOpname = (matId?: number) => {
    setSelectedMaterialId(matId || null);
    setIsOpnameOpen(true);
  };

  const distinctCategories = Array.from(new Set(allMaterialsList.map((m) => m.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-amber-600" /> Saldo &amp; Status Stok Bahan Baku
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau stok bahan dapur real-time, valuasi nilai aset, dan peringatan batas minimum persediaan
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            onClick={() => handleOpenStockIn()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" /> Stok Masuk
          </Button>

          <Button
            onClick={() => handleOpenStockOut()}
            variant="outline"
            className="gap-2 text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <ArrowUpRight className="w-4 h-4" /> Stok Keluar
          </Button>

          <Button
            onClick={() => handleOpenOpname()}
            variant="outline"
            className="gap-2 text-indigo-700 hover:bg-indigo-50 border-indigo-200"
          >
            <ClipboardCheck className="w-4 h-4" /> Stock Opname
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Bahan */}
        <Card className="p-4 flex flex-col justify-between border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Item Bahan</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-slate-900 leading-none">{summary.total_items}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">Katalog master bahan baku</span>
          </div>
        </Card>

        {/* Card 2: Total Valuasi */}
        <Card className="p-4 flex flex-col justify-between border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Total Valuasi Stok</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-amber-900 leading-tight truncate">
              {formatCurrency(summary.total_valuation)}
            </p>
            <span className="text-[11px] text-amber-600/90 mt-1 block">Estimasi nilai aset gudang</span>
          </div>
        </Card>

        {/* Card 3: Stok Aman */}
        <Card
          onClick={() => setStockStatusFilter('safe')}
          className="p-4 flex flex-col justify-between border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 to-white cursor-pointer hover:shadow-xs transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Stok Aman</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-700 leading-none">{summary.safe_items_count}</p>
            <span className="text-[11px] text-emerald-600 mt-1 block">Di atas batas minimum</span>
          </div>
        </Card>

        {/* Card 4: Stok Menipis */}
        <Card
          onClick={() => setStockStatusFilter('low')}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-all ${
            summary.low_stock_count > 0
              ? 'border-amber-300 bg-amber-50/60 shadow-xs hover:border-amber-400'
              : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Stok Menipis</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-600 leading-none">{summary.low_stock_count}</p>
            <span className="text-[11px] text-amber-700 font-medium mt-1 block">Perlu segera belanja</span>
          </div>
        </Card>

        {/* Card 5: Stok Habis */}
        <Card
          onClick={() => setStockStatusFilter('empty')}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-all ${
            summary.out_of_stock_count > 0
              ? 'border-rose-300 bg-rose-50/60 shadow-xs hover:border-rose-400'
              : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Stok Habis (0)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-rose-600 leading-none">{summary.out_of_stock_count}</p>
            <span className="text-[11px] text-rose-700 font-medium mt-1 block">Kritis / Kosong</span>
          </div>
        </Card>
      </div>

      {/* Stocks Table Section */}
      <div className="space-y-4">
        {/* Filters Bar */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-3 items-center">
            {/* Search input */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama bahan, kode SKU, kategori..."
                value={stockSearch}
                onChange={(e) => {
                  setStockSearch(e.target.value);
                  setStockPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-4 relative flex items-center">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={stockCategoryFilter}
                onChange={(e) => {
                  setStockCategoryFilter(e.target.value);
                  setStockPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700"
              >
                <option value="all">Semua Kategori Bahan</option>
                {distinctCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-3 relative flex items-center">
              <select
                value={stockStatusFilter}
                onChange={(e) => {
                  setStockStatusFilter(e.target.value as any);
                  setStockPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 appearance-none font-medium text-slate-700"
              >
                <option value="all">Semua Status Stok</option>
                <option value="safe">● Stok Aman</option>
                <option value="low">▲ Stok Menipis</option>
                <option value="empty">✖ Stok Habis (0)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* Stocks Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nama &amp; Kategori Bahan</th>
                  <th className="px-6 py-3.5 text-center">Stok Saat Ini</th>
                  <th className="px-6 py-3.5 text-center">Batas Min. Stok</th>
                  <th className="px-6 py-3.5 text-right">Harga Beli Standar</th>
                  <th className="px-6 py-3.5 text-right">Total Valuasi</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingStocks ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Memuat data inventaris &amp; stok...
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Tidak ada data bahan baku yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => {
                    const current = Number(m.current_stock) || 0;
                    const min = Number(m.minimum_stock) || 0;
                    const price = Number(m.default_purchase_price) || 0;
                    const valuation = current * price;

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aman
                      </span>
                    );

                    if (current <= 0) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" /> Habis
                        </span>
                      );
                    } else if (current <= min) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Menipis
                        </span>
                      );
                    }

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200 flex-shrink-0">
                              <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-snug">{m.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-medium">{m.category}</span>
                                {m.code && (
                                  <span className="text-[11px] text-slate-400 font-mono">({m.code})</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="text-base font-extrabold text-slate-900">
                            {m.current_stock}
                          </span>
                          <span className="text-xs text-slate-500 ml-1 font-medium">{m.unit}</span>
                        </td>

                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">
                          {m.minimum_stock} {m.unit}
                        </td>

                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-700">
                          {formatCurrency(price)}
                          <span className="text-[10px] text-slate-400 block font-normal">per {m.unit}</span>
                        </td>

                        <td className="px-6 py-4 text-right font-extrabold text-slate-900 text-sm">
                          {formatCurrency(valuation)}
                        </td>

                        <td className="px-6 py-4 text-center">{statusBadge}</td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenStockIn(m.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Input Stok Masuk"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" /> Masuk
                            </button>

                            <button
                              onClick={() => handleOpenStockOut(m.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                              title="Input Stok Keluar"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" /> Keluar
                            </button>

                            <button
                              onClick={() => handleOpenOpname(m.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1"
                              title="Stock Opname"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" /> Opname
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
            meta={stockMeta}
            onPageChange={(newPage) => setStockPage(newPage)}
            onPerPageChange={(newPerPage) => {
              setStockPerPage(newPerPage);
              setStockPage(1);
            }}
          />
        </Card>
      </div>

      {/* Quick Action Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={handleRefreshAll}
        rawMaterials={allMaterialsList}
        preselectedMaterialId={selectedMaterialId}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        onSuccess={handleRefreshAll}
        rawMaterials={allMaterialsList}
        preselectedMaterialId={selectedMaterialId}
      />

      <StockOpnameModal
        isOpen={isOpnameOpen}
        onClose={() => setIsOpnameOpen(false)}
        onSuccess={handleRefreshAll}
        rawMaterials={allMaterialsList}
        preselectedMaterialId={selectedMaterialId}
      />
    </div>
  );
};
