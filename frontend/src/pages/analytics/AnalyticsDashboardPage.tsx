import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Users,
  UtensilsCrossed,
  Sparkles,
  Download,
  RefreshCw,
  Layers,
  Award,
  Boxes,
} from 'lucide-react';
import type {
  AnalyticsOverview,
  MenuItemPerformance,
  CustomerAnalytics,
  DemandForecast,
  FinancialReport,
} from '../../types/analytics';

export const AnalyticsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'menus' | 'customers' | 'forecasting'>('financial');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'this_month' | 'this_year'>('30d');
  const [forecastDays, setForecastDays] = useState<number>(14);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [menus, setMenus] = useState<MenuItemPerformance[]>([]);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);

  // Compute start/end dates from dateRange
  const getDateParams = useCallback(() => {
    const now = new Date();
    let start = new Date();

    if (dateRange === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (dateRange === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (dateRange === '90d') {
      start.setDate(now.getDate() - 90);
    } else if (dateRange === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
    }

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start_date, end_date } = getDateParams();
      const params = { start_date, end_date };

      if (activeTab === 'financial') {
        const [ovRes, finRes] = await Promise.all([
          apiClient.get('/tenant/analytics/overview', { params }),
          apiClient.get('/tenant/analytics/financial-report', { params }),
        ]);
        setOverview(ovRes.data.data);
        setFinancialReport(finRes.data.data);
      } else if (activeTab === 'menus') {
        const res = await apiClient.get('/tenant/analytics/menus', { params });
        setMenus(res.data.data?.all_menus || []);
      } else if (activeTab === 'customers') {
        const res = await apiClient.get('/tenant/analytics/customers', { params });
        setCustomers(res.data.data);
      } else if (activeTab === 'forecasting') {
        const res = await apiClient.get('/tenant/analytics/forecasting', {
          params: { days: forecastDays },
        });
        setForecast(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, getDateParams, forecastDays]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const { start_date, end_date } = getDateParams();
      const res = await apiClient.get('/tenant/analytics/export', {
        params: { start_date, end_date },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Finansial_${start_date}_sd_${end_date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export CSV failed:', err);
      alert('Gagal mengunduh laporan CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Find max daily revenue for chart scaling
  const maxRevenue = overview?.daily_trends?.reduce((max, d) => Math.max(max, d.total_revenue), 0) || 1;
  const maxForecastPortion = forecast?.daily_timeline?.reduce((max, d) => Math.max(max, d.estimated_portions), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-amber-600" /> Analitik Bisnis &amp; Forecasting
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau laporan laba rugi, margin HPP resep BOM, tren retensi pelanggan repeat order, dan prediksi kebutuhan bahan dapur
          </p>
        </div>

        {/* Global Controls: Period Range, Export, Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          {/* Period Selector */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            {(
              [
                { key: '7d', label: '7 Hari' },
                { key: '30d', label: '30 Hari' },
                { key: '90d', label: '90 Hari' },
                { key: 'this_month', label: 'Bulan Ini' },
                { key: 'this_year', label: 'Tahun Ini' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setDateRange(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === p.key
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </Button>

          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Mengekspor...' : 'Export Laporan (CSV)'}
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2 sm:gap-6 overflow-x-auto pb-px">
          {[
            { key: 'financial', label: 'Laporan Laba Rugi & Finansial', icon: DollarSign },
            { key: 'menus', label: 'Analitik Menu & Profit Margin', icon: UtensilsCrossed },
            { key: 'customers', label: 'Retensi Pelanggan (CRM)', icon: Users },
            { key: 'forecasting', label: 'Prediksi Kebutuhan (Forecasting)', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: FINANCIAL & P&L OVERVIEW */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Gross Revenue */}
            <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Omzet (Gross Revenue)
                  </span>
                  <strong className="text-2xl font-black text-slate-900 mt-1 block">
                    {formatCurrency(overview?.gross_revenue || 0)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {overview?.total_orders || 0} Total Pesanan Diterima
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Total HPP / COGS */}
            <Card className="p-5 border-l-4 border-l-rose-500 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Total HPP Bahan Baku (COGS)
                  </span>
                  <strong className="text-2xl font-black text-rose-600 mt-1 block">
                    {formatCurrency(overview?.total_hpp || 0)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Kalkulasi Resep BOM Aktual
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Boxes className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Gross Profit */}
            <Card className="p-5 border-l-4 border-l-emerald-500 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Laba Kotor (Gross Profit)
                  </span>
                  <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                    {formatCurrency(overview?.gross_profit || 0)}
                  </strong>
                  <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">
                    Gross Margin: {overview?.gross_margin_percentage || 0}%
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Realized Cash Inflow & AOV */}
            <Card className="p-5 border-l-4 border-l-blue-500 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Kas Masuk Realisasi
                  </span>
                  <strong className="text-2xl font-black text-blue-600 mt-1 block">
                    {formatCurrency(overview?.paid_revenue || 0)}
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Rata-rata Order: {formatCurrency(overview?.average_order_value || 0)}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Daily Sales Trend Chart Visualization */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Visualisasi Tren Penjualan Harian
                </h2>
                <p className="text-xs text-slate-500">
                  Pergerakan omzet dan kuantitas transaksi pesanan selama periode yang dipilih
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {overview?.daily_trends?.length || 0} Titik Data
              </span>
            </div>

            {overview?.daily_trends && overview.daily_trends.length > 0 ? (
              <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 overflow-x-auto">
                {overview.daily_trends.map((day, idx) => {
                  const heightPercent = maxRevenue > 0 ? Math.max((day.total_revenue / maxRevenue) * 100, 6) : 6;
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                          <p className="font-bold">{day.date}</p>
                          <p className="text-amber-300">{formatCurrency(day.total_revenue)}</p>
                          <p className="text-slate-300">{day.total_orders} Pesanan</p>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md hover:from-amber-700 hover:to-amber-500 transition-all cursor-pointer shadow-2xs"
                      />
                      {/* Date Label */}
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                        {day.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada transaksi pesanan pada rentang tanggal ini.
              </div>
            )}
          </Card>

          {/* Income Statement / P&L Table */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" /> Rincian Laporan Laba Rugi (Income Statement)
            </h2>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Akun Finansial &amp; Pos Biaya</th>
                      <th className="px-6 py-3.5 text-center">Porsi (%)</th>
                      <th className="px-6 py-3.5 text-right">Jumlah Nominal (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Revenue Section */}
                    <tr className="bg-slate-50/50 font-bold text-slate-900">
                      <td colSpan={3} className="px-6 py-2.5 text-xs text-amber-800 uppercase tracking-wider">
                        1. Pendapatan Usaha (Revenue)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 text-xs pl-10">Total Penjualan Kotor (Gross Sales)</td>
                      <td className="px-6 py-3 text-center text-xs font-medium">100.0%</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(financialReport?.revenue?.gross_sales || 0)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 text-xs pl-10 text-slate-500">Kas Masuk Terverifikasi</td>
                      <td className="px-6 py-3 text-center text-xs text-slate-400">
                        {financialReport?.revenue?.gross_sales
                          ? (
                              (financialReport.revenue.realized_cash_in /
                                financialReport.revenue.gross_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-emerald-600 text-xs">
                        {formatCurrency(financialReport?.revenue?.realized_cash_in || 0)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-6 py-3 text-xs pl-10 text-slate-500">Piutang Pelanggan Belum Lunas (AR)</td>
                      <td className="px-6 py-3 text-center text-xs text-slate-400">
                        {financialReport?.revenue?.gross_sales
                          ? (
                              (financialReport.revenue.accounts_receivable /
                                financialReport.revenue.gross_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-rose-600 text-xs">
                        {formatCurrency(financialReport?.revenue?.accounts_receivable || 0)}
                      </td>
                    </tr>

                    {/* COGS Section */}
                    <tr className="bg-slate-50/50 font-bold text-slate-900">
                      <td colSpan={3} className="px-6 py-2.5 text-xs text-rose-800 uppercase tracking-wider">
                        2. Harga Pokok Penjualan (HPP / COGS)
                      </td>
                    </tr>
                    {financialReport?.cost_of_goods_sold?.breakdown_by_category?.map((cogs, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 text-xs pl-10">Bahan Baku: {cogs.category}</td>
                        <td className="px-6 py-3 text-center text-xs text-slate-500">{cogs.percentage}%</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700 text-xs">
                          {formatCurrency(cogs.total_cost)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50/40 font-bold">
                      <td className="px-6 py-3 text-xs text-rose-900 pl-6">Total Biaya HPP Resep</td>
                      <td className="px-6 py-3 text-center text-xs text-rose-900">
                        {financialReport?.revenue?.gross_sales
                          ? (
                              (financialReport.cost_of_goods_sold.total_cogs /
                                financialReport.revenue.gross_sales) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-rose-700 text-sm">
                        {formatCurrency(financialReport?.cost_of_goods_sold?.total_cogs || 0)}
                      </td>
                    </tr>

                    {/* Gross Profit */}
                    <tr className="bg-emerald-50 font-extrabold text-emerald-950">
                      <td className="px-6 py-4 text-sm">3. LABA KOTOR OPERASIONAL (GROSS PROFIT)</td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-emerald-700">
                        {financialReport?.profitability?.gross_margin_percentage || 0}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-base text-emerald-700">
                        {formatCurrency(financialReport?.profitability?.gross_profit || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MENU PERFORMANCE & PROFITABILITY */}
      {activeTab === 'menus' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Peringkat Performa &amp; Margin Menu
              </h2>
              <p className="text-xs text-slate-500">
                Analisis menu terlaris berdasarkan kuantitas porsi terjual, omzet total, dan persentase margin keuntungan
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {menus.length} Menu Dianalisis
            </span>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Nama Menu &amp; Tipe</th>
                    <th className="px-6 py-3.5 text-center">Porsi Terjual</th>
                    <th className="px-6 py-3.5 text-right">Harga Jual / Porsi</th>
                    <th className="px-6 py-3.5 text-right">HPP Resep / Porsi</th>
                    <th className="px-6 py-3.5 text-right">Total Omzet</th>
                    <th className="px-6 py-3.5 text-right">Total Laba Kotor</th>
                    <th className="px-6 py-3.5 text-center">Margin (%)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                        Memuat data analitik menu...
                      </td>
                    </tr>
                  ) : menus.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        Belum ada data penjualan menu pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    menus.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </span>
                            <div>
                              <strong className="font-bold text-slate-900 text-xs block">{m.name}</strong>
                              <span className="text-[10px] font-mono text-slate-400">{m.type}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-slate-900 text-xs">
                          {m.total_portions_sold} Porsi
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-700">
                          {formatCurrency(m.selling_price)}
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-xs text-rose-600">
                          {formatCurrency(m.unit_hpp)}
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(m.total_revenue)}
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 text-xs">
                          {formatCurrency(m.total_profit)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              m.margin_percentage >= 40
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : m.margin_percentage >= 25
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {m.margin_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: CUSTOMER RETENTION & VIP CRM */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Retention Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-indigo-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Database Pelanggan
              </span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">
                {customers?.total_customers || 0}
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {customers?.active_customers || 0} Pelanggan Aktif Bertransaksi
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-emerald-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Tingkat Repeat Order (Retensi)
              </span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                {customers?.repeat_order_rate_percentage || 0}%
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {customers?.repeat_customers || 0} Pelanggan Pesan &gt; 1 Kali
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Pelanggan Pesan Pertama (New)
              </span>
              <strong className="text-2xl font-black text-amber-600 mt-1 block">
                {customers?.single_order_customers || 0}
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Peluang Program Loyalty / Re-engagement
              </span>
            </Card>
          </div>

          {/* Top VIP Clients Table */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" /> Klien VIP &amp; Pelanggan Korporat Terbesar
            </h2>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Nama Klien / Perusahaan</th>
                      <th className="px-6 py-3.5">Kontak WhatsApp</th>
                      <th className="px-6 py-3.5 text-center">Total Transaksi</th>
                      <th className="px-6 py-3.5 text-right">Rata-rata Nilai Order</th>
                      <th className="px-6 py-3.5 text-right">Total Omzet Belanja</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                          Memuat data pelanggan VIP...
                        </td>
                      </tr>
                    ) : !customers?.top_vip_clients || customers.top_vip_clients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          Belum ada data pelanggan yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      customers.top_vip_clients.map((vip, idx) => (
                        <tr key={vip.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                #{idx + 1}
                              </div>
                              <div>
                                <strong className="font-bold text-slate-900 text-xs block">{vip.name}</strong>
                                {vip.company_name && (
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    {vip.company_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {vip.phone}
                          </td>

                          <td className="px-6 py-4 text-center font-bold text-slate-900 text-xs">
                            {vip.total_orders} Pesanan
                          </td>

                          <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">
                            {formatCurrency(vip.average_spend_per_order)}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-extrabold text-amber-700 text-sm">
                            {formatCurrency(vip.total_spend)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: DEMAND FORECASTING */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          {/* Forecasting Control Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Algoritma Prediksi Kebutuhan Dapur (Demand Forecasting)
              </h2>
              <p className="text-xs text-purple-700 mt-0.5">
                Memproyeksikan estimasi porsi dan kebutuhan belanja bahan baku berdasarkan tren pesanan 30 hari terakhir
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-900 whitespace-nowrap">Proyeksi ke depan:</span>
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-purple-900"
              >
                <option value={7}>7 Hari Mendatang</option>
                <option value={14}>14 Hari Mendatang</option>
                <option value={30}>30 Hari Mendatang</option>
              </select>
            </div>
          </div>

          {/* Metric Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-purple-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Rata-rata Porsi Historis
              </span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">
                {forecast?.historical_avg_daily_portions || 0} Porsi / Hari
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Baseline data pesanan 30 hari terakhir
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-indigo-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Target Proyeksi Harian
              </span>
              <strong className="text-2xl font-black text-indigo-600 mt-1 block">
                {forecast?.forecast_daily_portions_baseline || 0} Porsi / Hari
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Termasuk buffer keamanan operasional +5%
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Estimasi Total Belanja Bahan
              </span>
              <strong className="text-2xl font-black text-amber-600 mt-1 block">
                {formatCurrency(forecast?.total_estimated_procurement_cost || 0)}
              </strong>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Untuk periode {forecastDays} hari ke depan
              </span>
            </Card>
          </div>

          {/* Projected Portions Daily Timeline Chart */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Proyeksi Permintaan Porsi Harian ({forecastDays} Hari Ke Depan)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Termasuk penyesuaian faktor puncak akhir pekan (*Weekend multiplier 1.35x*)
            </p>

            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 overflow-x-auto">
              {forecast?.daily_timeline?.map((day, idx) => {
                const heightPercent = maxForecastPortion > 0 ? Math.max((day.estimated_portions / maxForecastPortion) * 100, 8) : 8;
                const isWeekend = ['Sabtu', 'Minggu', 'Jumat'].includes(day.day_name);

                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[32px] flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                        <p className="font-bold">{day.day_name}, {day.date}</p>
                        <p className="text-purple-300 font-extrabold">{day.estimated_portions} Porsi</p>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all cursor-pointer shadow-2xs ${
                        isWeekend
                          ? 'bg-gradient-to-t from-purple-600 to-pink-500'
                          : 'bg-gradient-to-t from-indigo-500 to-indigo-300'
                      }`}
                    />

                    {/* Date */}
                    <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                      {day.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Forecasted Raw Materials Procurement Needs */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-purple-600" />
              Rekomendasi Alokasi Belanja Bahan Baku ({forecast?.forecasted_materials?.length || 0} Bahan)
            </h2>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Nama Bahan Baku</th>
                      <th className="px-6 py-3.5 text-center">Rata-rata Pakai / Hari</th>
                      <th className="px-6 py-3.5 text-center">Total Kebutuhan ({forecastDays} Hari)</th>
                      <th className="px-6 py-3.5 text-right">Harga Standar / Satuan</th>
                      <th className="px-6 py-3.5 text-right">Estimasi Anggaran Belanja</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                          Menghitung rekomendasi bahan...
                        </td>
                      </tr>
                    ) : !forecast?.forecasted_materials || forecast.forecasted_materials.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          Belum ada data historis BOM resep untuk menghitung prediksi bahan.
                        </td>
                      </tr>
                    ) : (
                      forecast.forecasted_materials.map((mat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <strong className="font-bold text-slate-900 text-xs block">{mat.material_name}</strong>
                          </td>

                          <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                            {mat.daily_average_usage} {mat.unit}
                          </td>

                          <td className="px-6 py-4 text-center font-bold text-purple-900 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200">
                              {mat.projected_total_quantity} {mat.unit}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">
                            {formatCurrency(mat.unit_price)} / {mat.unit}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-extrabold text-purple-700 text-sm">
                            {formatCurrency(mat.estimated_total_cost)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
