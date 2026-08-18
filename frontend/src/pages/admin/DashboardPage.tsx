import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  PlusCircle,
  ChefHat,
  ArrowUpRight
} from 'lucide-react';
import { formatRupiah } from '../../lib/utils';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { currentTenant, user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Selamat Datang, {user?.name || 'Owner'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Workspace: <span className="font-semibold text-slate-800">{currentTenant?.name || 'Catering Workspace'}</span> (Subdomain: {currentTenant?.slug || 'demo'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Input Pesanan Baru
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pendapatan Bulan Ini
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatRupiah(0)}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Fase 0 Fondasi Aktif</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pesanan Aktif
            </p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">0 Order</p>
          <p className="text-xs text-slate-500 mt-1">Siap untuk Fase 1 MVP</p>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Jadwal Produksi Hari Ini
            </p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">0 Porsi</p>
          <p className="text-xs text-slate-500 mt-1">Belum ada produksi</p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Peringatan Stok Menipis
            </p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">0 Item</p>
          <p className="text-xs text-slate-500 mt-1">Stok terpantau aman</p>
        </Card>
      </div>

      {/* Quick Status / Milestone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status Fondasi Sistem (Fase 0)</CardTitle>
                <CardDescription>
                  Arsitektur Multi-Tenant, REST API Laravel, dan SPA React siap pakai
                </CardDescription>
              </div>
              <Badge variant="success">Setup Selesai</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Multi-Tenancy Engine</p>
                    <p className="text-xs text-slate-500">Row-level security via header X-Tenant-ID & BelongsToTenant scope</p>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Autentikasi Token (Sanctum)</p>
                    <p className="text-xs text-slate-500">Registrasi tenant otomatis & SPA API token authentication</p>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">DevOps & Database</p>
                    <p className="text-xs text-slate-500">Docker Compose (PostgreSQL, Redis, Mailpit, Nginx) + CI/CD Workflow</p>
                  </div>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Step: Fase 1 MVP</CardTitle>
            <CardDescription>Modul operasional inti yang akan dibangun</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                <span>Master Bahan Baku & Resep / BOM (Bill of Materials)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <span>Kalkulasi Otomatis HPP per Menu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                <span>Order Management (Input CS & Kalender Pesanan)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
                <span>Stok Real-Time & Ledger Mutasi Bahan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">5</span>
                <span>Invoice PDF & Pencatatan Pembayaran</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
