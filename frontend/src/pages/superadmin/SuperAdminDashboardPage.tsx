import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Pagination, type PaginationMeta } from '../../components/ui/Pagination';
import { formatCurrency } from '../../lib/utils';
import {
  ShieldCheck,
  TrendingUp,
  Building2,
  CreditCard,
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Zap,
  Layers,
  Edit2,
  ShoppingBag,
  Sparkles,
  Server,
  DollarSign,
  Ban,
  Check,
} from 'lucide-react';
import type { SaaSMetrics, TenantListItem, SubscriptionPlan } from '../../types/saas';

export const SuperAdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'tenants' | 'plans'>('metrics');
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tenant Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Modal Change Plan State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<number | ''>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Edit Plan State
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planPriceMonthly, setPlanPriceMonthly] = useState<number>(0);
  const [planPriceYearly, setPlanPriceYearly] = useState<number>(0);
  const [planMaxOrders, setPlanMaxOrders] = useState<number>(100);
  const [planMaxBranches, setPlanMaxBranches] = useState<number>(1);
  const [planMaxStaff, setPlanMaxStaff] = useState<number>(5);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await apiClient.get('/super-admin/metrics');
      setMetrics(res.data.data || null);
    } catch (err) {
      console.error('Fetch metrics failed:', err);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiClient.get('/super-admin/plans');
      setPlans(res.data.data || []);
    } catch (err) {
      console.error('Fetch plans failed:', err);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get('/super-admin/tenants', { params });
      setTenants(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err) {
      console.error('Fetch tenants failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchMetrics(), fetchPlans(), fetchTenants()]);
    setIsLoading(false);
  }, [fetchMetrics, fetchPlans, fetchTenants]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggleTenantStatus = async (tenant: TenantListItem) => {
    const nextStatus = !tenant.is_active;
    const actionLabel = nextStatus ? 'mengaktifkan kembali' : 'MENONAKTIFKAN (SUSPEND)';

    if (!confirm(`Apakah Anda yakin ingin ${actionLabel} akun tenant "${tenant.name}"?`)) {
      return;
    }

    try {
      await apiClient.patch(`/super-admin/tenants/${tenant.id}/status`, {
        is_active: nextStatus,
      });
      fetchTenants();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah status tenant.');
    }
  };

  const handleOpenPlanModal = (tenant: TenantListItem) => {
    setSelectedTenant(tenant);
    setTargetPlanId(tenant.subscription?.subscription_plan_id || plans[0]?.id || '');
    setBillingCycle(tenant.subscription?.billing_cycle || 'monthly');
    setIsPlanModalOpen(true);
  };

  const handleSubmitAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !targetPlanId) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/super-admin/tenants/${selectedTenant.id}/plan`, {
        subscription_plan_id: Number(targetPlanId),
        billing_cycle: billingCycle,
      });

      setIsPlanModalOpen(false);
      fetchTenants();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengubah paket langganan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanPriceMonthly(Number(plan.price_monthly));
    setPlanPriceYearly(Number(plan.price_yearly));
    setPlanMaxOrders(plan.max_orders_per_month);
    setPlanMaxBranches(plan.max_branches);
    setPlanMaxStaff(plan.max_staff_users);
    setIsEditPlanModalOpen(true);
  };

  const handleSubmitEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setIsSubmitting(true);
    try {
      await apiClient.put(`/super-admin/plans/${editingPlan.id}`, {
        price_monthly: planPriceMonthly,
        price_yearly: planPriceYearly,
        max_orders_per_month: planMaxOrders,
        max_branches: planMaxBranches,
        max_staff_users: planMaxStaff,
      });

      setIsEditPlanModalOpen(false);
      fetchPlans();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui paket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-600" /> Super Admin Panel &amp; SaaS Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pusat monitoring metrik MRR, tata kelola akun tenant katering, paket langganan bertingkat, dan kesehatan platform
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            className="p-2 text-slate-500 hover:text-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Server className="w-3.5 h-3.5 text-indigo-600" /> Multi-Tenant Active
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'metrics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Overview &amp; MRR Metrics
        </button>

        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'tenants'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Manajemen Tenant Katering ({metrics?.total_tenants || 0})
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'plans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Paket Harga &amp; Tiered Plans ({plans.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-indigo-50/80 via-white to-white border-indigo-200/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                  Monthly Recurring Revenue (MRR)
                </span>
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(metrics?.mrr || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ARR Tahunan: <strong>{formatCurrency(metrics?.arr || 0)}</strong>
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-200/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Total Tenant Aktif
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
                {metrics?.active_tenants || 0}
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  / {metrics?.total_tenants || 0} total bisnis
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                Status Operasional 100% Aktif
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-200/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Total Transaksi Platform (GMV)
                </span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(metrics?.total_platform_gmv || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Volume: <strong>{metrics?.total_platform_orders || 0} pesanan katering</strong>
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-slate-50/80 via-white to-white border-slate-200/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Kesehatan Sistem &amp; Uptime
                </span>
                <div className="p-2 rounded-xl bg-slate-200 text-slate-800 font-bold">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-emerald-700 font-mono">
                {metrics?.system_health.uptime || '99.98%'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Database &amp; Queues: <strong className="text-emerald-700">Optimal</strong>
              </p>
            </Card>
          </div>

          {/* Plan Breakdown & Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-indigo-600" /> Distribusi Pelanggan Berdasarkan Paket
              </h3>
              <div className="space-y-3">
                {metrics?.plan_distribution.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                      <span className="text-[11px] font-mono text-slate-400">Slug: {p.slug}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-indigo-700">
                        {p.active_subscribers_count} Tenant
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* System Health */}
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-indigo-600" /> Platform Infrastructure Health
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">PostgreSQL Primary Database:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {metrics?.system_health.database || 'Connected'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Asynchronous Queue Workers:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {metrics?.system_health.queue_workers || 'Running'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Redis Cache &amp; Session Store:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {metrics?.system_health.redis_cache || 'Active'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Monthly SLA Guarantee:</span>
                  <span className="font-mono font-bold text-indigo-800">99.9% Uptime Target</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT MANAGEMENT */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama bisnis, email, slug, atau no. telepon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Hanya Aktif</option>
                  <option value="suspended">Hanya Suspended</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Tenants Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Nama Bisnis &amp; Slug</th>
                    <th className="px-6 py-3.5">Paket Langganan</th>
                    <th className="px-6 py-3.5 text-center">Pengguna / Staff</th>
                    <th className="px-6 py-3.5 text-center">Order Bulan Ini</th>
                    <th className="px-6 py-3.5 text-center">Status Akun</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        Memuat data tenant platform...
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Tidak ada data tenant yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t) => {
                      const planName = t.subscription?.plan?.name || t.subscription_plan || 'Starter Dapur';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-bold text-slate-900 text-xs block">
                                  {t.name}
                                </strong>
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  app.cateros.id/{t.slug}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              {planName}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1 capitalize">
                              Siklus: {t.subscription?.billing_cycle || 'Bulanan'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-800">
                            {t.users_count || 1} User
                          </td>

                          <td className="px-6 py-4 text-center font-mono text-xs font-bold text-amber-900">
                            {t.monthly_orders_count || 0} Order
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                t.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {t.is_active ? 'Aktif' : 'Suspended'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPlanModal(t)}
                                className="text-xs font-semibold gap-1 text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                              >
                                <Zap className="w-3.5 h-3.5" /> Ganti Paket
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleTenantStatus(t)}
                                className={`text-xs font-semibold gap-1 ${
                                  t.is_active
                                    ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                    : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {t.is_active ? (
                                  <>
                                    <Ban className="w-3.5 h-3.5" /> Suspend
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" /> Aktifkan
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={meta}
              onPageChange={(newPage) => setPage(newPage)}
              onPerPageChange={() => {}}
            />
          </Card>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col justify-between relative overflow-hidden ${
                plan.slug === 'growth'
                  ? 'ring-2 ring-indigo-500 bg-gradient-to-b from-indigo-50/50 via-white to-white'
                  : 'bg-white'
              }`}
            >
              {plan.slug === 'growth' && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Paling Populer
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditPlanModal(plan)}
                    className="p-1.5 text-slate-500 hover:text-slate-800"
                    title="Edit Harga & Limit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="mt-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 font-mono">
                      {formatCurrency(plan.price_monthly)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/ bulan</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Atau {formatCurrency(plan.price_yearly)} / tahun (Hemat 2 bulan)
                  </p>
                </div>

                {/* Limits */}
                <div className="py-4 space-y-2 text-xs border-b border-slate-100 font-medium text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Maks. Pesanan / Bulan:</span>
                    <strong className="font-mono text-slate-900">{plan.max_orders_per_month} Order</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Maks. Cabang / Dapur:</span>
                    <strong className="font-mono text-slate-900">{plan.max_branches} Lokasi</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Maks. Akun Staf:</span>
                    <strong className="font-mono text-slate-900">{plan.max_staff_users} Staf</strong>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="pt-4 space-y-2 text-xs text-slate-600">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fitur Unggulan:
                  </span>
                  {plan.features?.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ASSIGN / CHANGE PLAN MODAL */}
      {isPlanModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ganti Paket Langganan Tenant
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bisnis: <strong>{selectedTenant.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAssignPlan} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Paket Baru *
                </label>
                <select
                  required
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price_monthly)}/bln (Max {p.max_orders_per_month} orders)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Siklus Penagihan Billing
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="monthly">Bulanan (Monthly)</option>
                  <option value="yearly">Tahunan (Yearly — Hemat 2 Bulan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Menyimpan...' : 'Terapkan Paket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN LIMITS MODAL */}
      {isEditPlanModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Limit &amp; Harga Paket: {editingPlan.name}
                  </h3>
                  <p className="text-xs text-slate-500">Sesuaikan kuota paket SaaS</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitEditPlan} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Harga Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    value={planPriceMonthly}
                    onChange={(e) => setPlanPriceMonthly(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Harga Tahunan (Rp)
                  </label>
                  <input
                    type="number"
                    value={planPriceYearly}
                    onChange={(e) => setPlanPriceYearly(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Maks. Pesanan Per Bulan
                </label>
                <input
                  type="number"
                  value={planMaxOrders}
                  onChange={(e) => setPlanMaxOrders(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Maks. Cabang Dapur
                  </label>
                  <input
                    type="number"
                    value={planMaxBranches}
                    onChange={(e) => setPlanMaxBranches(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Maks. Akun Staf
                  </label>
                  <input
                    type="number"
                    value={planMaxStaff}
                    onChange={(e) => setPlanMaxStaff(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditPlanModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
