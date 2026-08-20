import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ChefHat,
  RefreshCw,
  CheckCircle2,
  Printer,
  Check,
  ArrowRight,
  User,
} from 'lucide-react';
import type {
  ProductionTask,
  ProductionPlanDetailResponse,
} from '../../types/production';
import { KitchenLabelModal } from '../../components/kitchen/KitchenLabelModal';

export const KitchenKdsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [detailData, setDetailData] = useState<ProductionPlanDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'kanban' | 'bom' | 'orders'>('kanban');

  // Label Modal
  const [labelOrderId, setLabelOrderId] = useState<number | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Load production plan for selected date (with auto-sync)
  const loadPlanForDate = useCallback(async (dateToLoad: string) => {
    setIsLoading(true);
    try {
      // First, get list of plans for this date
      const res = await apiClient.get('/production/plans', {
        params: { start_date: dateToLoad, end_date: dateToLoad },
      });

      const plans = res.data?.data?.data || [];
      if (plans.length > 0) {
        const planId = plans[0].id;
        const detailRes = await apiClient.get(`/production/plans/${planId}`);
        if (detailRes.data?.data) {
          setDetailData(detailRes.data.data);
        }
      } else {
        // Auto-generate plan for the selected date so newly created orders appear immediately
        const syncRes = await apiClient.post('/production/plans/generate', {
          plan_date: dateToLoad,
        });
        if (syncRes.data?.data?.plan?.id) {
          const detailRes = await apiClient.get(`/production/plans/${syncRes.data.data.plan.id}`);
          if (detailRes.data?.data) {
            setDetailData(detailRes.data.data);
          }
        } else {
          setDetailData(null);
        }
      }
    } catch (err) {
      console.error('Failed to load production plan:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanForDate(selectedDate);
  }, [selectedDate, loadPlanForDate]);

  // Generate / Sync Plan
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/production/plans/generate', {
        plan_date: selectedDate,
      });
      if (res.data?.data?.plan?.id) {
        const detailRes = await apiClient.get(`/production/plans/${res.data.data.plan.id}`);
        if (detailRes.data?.data) {
          setDetailData(detailRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
      alert('Gagal menyinkronkan rencana produksi dapur.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Advance Task Stage
  const handleAdvanceTask = async (task: ProductionTask) => {
    const nextStages: Record<string, 'prep' | 'cooking' | 'packing' | 'qc' | 'completed'> = {
      prep: 'cooking',
      cooking: 'packing',
      packing: 'qc',
      qc: 'completed',
    };

    const nextStage = nextStages[task.stage];
    if (!nextStage) return;

    try {
      const res = await apiClient.patch(`/production/tasks/${task.id}/stage`, {
        stage: nextStage,
      });
      if (res.data?.data) {
        setDetailData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === task.id ? res.data.data : t)),
          };
        });
      }
    } catch (err) {
      console.error('Failed to advance task stage:', err);
    }
  };

  // Complete entire plan and auto-deduct inventory
  const handleCompletePlan = async () => {
    if (!detailData?.plan) return;
    const confirm = window.confirm(
      'Apakah Anda yakin ingin menyelesaikan rencana produksi ini? Stok bahan baku akan otomatis terpotong sesuai kebutuhan resep (BOM)!'
    );
    if (!confirm) return;

    setIsCompleting(true);
    try {
      const res = await apiClient.post(`/production/plans/${detailData.plan.id}/complete`);
      if (res.data?.success) {
        alert('Produksi selesai! Seluruh pesanan telah berstatus Siap dan stok bahan baku telah terpotong.');
        loadPlanForDate(selectedDate);
      }
    } catch (err) {
      console.error('Failed to complete plan:', err);
      alert('Gagal menyelesaikan produksi.');
    } finally {
      setIsCompleting(false);
    }
  };

  const tasks = detailData?.tasks || [];
  const prepTasks = tasks.filter((t) => t.stage === 'prep');
  const cookingTasks = tasks.filter((t) => t.stage === 'cooking');
  const packingTasks = tasks.filter((t) => t.stage === 'packing');
  const qcTasks = tasks.filter((t) => t.stage === 'qc' || t.stage === 'completed');

  const completedCount = tasks.filter((t) => t.stage === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Extract unique orders from tasks
  const uniqueOrders = Array.from(
    new Map(
      tasks
        .filter((t) => t.order)
        .map((t) => [t.order!.id, t.order!])
    ).values()
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Date Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Dapur Produksi &amp; KDS
              {detailData?.plan && (
                <Badge
                  className={`text-[10px] uppercase font-bold ${
                    detailData.plan.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {detailData.plan.status === 'completed' ? 'Selesai' : 'Sedang Diproses'}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              Kitchen Display System, agregasi resep BOM, checklist masak, dan cetak label
            </p>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                setSelectedDate(tomorrow);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Besok
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Sinkronisasi...' : 'Sinkron Order Dapur'}
          </Button>

          {detailData?.plan && detailData.plan.status !== 'completed' && (
            <Button
              size="sm"
              onClick={handleCompletePlan}
              disabled={isCompleting}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              {isCompleting ? 'Memproses...' : 'Selesaikan & Potong Stok'}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      {detailData?.plan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Target Porsi Masak
              </span>
              <strong className="text-2xl font-black text-slate-900 font-mono">
                {detailData.plan.total_portions}
              </strong>
              <span className="text-[10px] text-slate-500 block">Porsi makanan &amp; paket</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              🍛
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Pesanan Terjadwal
              </span>
              <strong className="text-2xl font-black text-slate-900 font-mono">
                {detailData.orders_count || detailData.plan.total_orders}
              </strong>
              <span className="text-[10px] text-slate-500 block">Order confirmed/processing</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              📋
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Varian Bahan Baku (BOM)
              </span>
              <strong className="text-2xl font-black text-slate-900 font-mono">
                {detailData.bom_requirements?.length || 0}
              </strong>
              <span className="text-[10px] text-slate-500 block">Item bahan siap disiapkan</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              🥕
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                Progres Dapur
              </span>
              <strong className="text-sm font-black text-slate-900 font-mono">
                {progressPercent}%
              </strong>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {completedCount} dari {tasks.length} tahapan selesai
            </span>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'kanban'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🍳 Tahapan Dapur (KDS Kanban) ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'bom'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📦 Kebutuhan Bahan Baku (BOM) ({detailData?.bom_requirements?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🏷️ Cetak Label Kemasan ({uniqueOrders.length})
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Memuat Data Produksi...</p>
        </div>
      ) : !detailData?.plan ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Belum Ada Rencana Produksi pada {selectedDate}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Klik tombol di bawah untuk mengagregasi pesanan yang telah dikonfirmasi menjadi daftar tugas masak dan kalkulasi bahan baku.
          </p>
          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Buat Rencana Produksi Tanggal Ini
          </Button>
        </div>
      ) : (
        <>
          {/* TAB 1: KDS Kanban Board */}
          {activeTab === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {/* Column 1: Prep */}
              <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    1. Persiapan (Prep)
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                    {prepTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {prepTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-6">
                      Tidak ada tugas prep
                    </p>
                  ) : (
                    prepTasks.map((t) => (
                      <Card key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <strong className="text-xs font-bold text-slate-900 block leading-tight">
                          {t.item_name}
                        </strong>
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span>
                            Jumlah: <strong>{t.quantity} {t.portion_unit}</strong>
                          </span>
                          {t.order && (
                            <span className="font-mono text-[10px]">#{t.order.order_number}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceTask(t)}
                          className="w-full text-xs font-bold py-1.5 h-auto bg-amber-500 hover:bg-amber-600 text-white rounded-lg gap-1"
                        >
                          Mulai Masak <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Cooking */}
              <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    2. Memasak (Cooking)
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                    {cookingTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {cookingTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-6">
                      Tidak ada tugas masak
                    </p>
                  ) : (
                    cookingTasks.map((t) => (
                      <Card key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <strong className="text-xs font-bold text-slate-900 block leading-tight">
                          {t.item_name}
                        </strong>
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span>
                            Jumlah: <strong>{t.quantity} {t.portion_unit}</strong>
                          </span>
                          {t.order && (
                            <span className="font-mono text-[10px]">#{t.order.order_number}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceTask(t)}
                          className="w-full text-xs font-bold py-1.5 h-auto bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1"
                        >
                          Kirim ke Packing <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Packing */}
              <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    3. Pengemasan (Packing)
                  </span>
                  <Badge className="bg-purple-100 text-purple-800 text-[10px]">
                    {packingTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {packingTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-6">
                      Tidak ada tugas packing
                    </p>
                  ) : (
                    packingTasks.map((t) => (
                      <Card key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                        <strong className="text-xs font-bold text-slate-900 block leading-tight">
                          {t.item_name}
                        </strong>
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span>
                            Kemas: <strong>{t.quantity} {t.portion_unit}</strong>
                          </span>
                          {t.order && (
                            <span className="font-mono text-[10px]">#{t.order.order_number}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceTask(t)}
                          className="w-full text-xs font-bold py-1.5 h-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                        >
                          Lolos ke QC <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Column 4: QC & Selesai */}
              <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    4. QC &amp; Siap Antar
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                    {qcTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {qcTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-6">
                      Belum ada porsi selesai QC
                    </p>
                  ) : (
                    qcTasks.map((t) => (
                      <Card
                        key={t.id}
                        className={`p-3 border rounded-xl space-y-2 ${
                          t.stage === 'completed'
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <strong className="text-xs font-bold text-slate-900 block leading-tight">
                            {t.item_name}
                          </strong>
                          {t.stage === 'completed' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500">
                          <span>
                            Porsi: <strong>{t.quantity} {t.portion_unit}</strong>
                          </span>
                          {t.order && (
                            <span className="font-mono text-[10px]">#{t.order.order_number}</span>
                          )}
                        </div>
                        {t.stage !== 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => handleAdvanceTask(t)}
                            className="w-full text-xs font-bold py-1.5 h-auto bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1"
                          >
                            Konfirmasi Lolos QC <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOM Ingredients Breakdown Table */}
          {activeTab === 'bom' && (
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Kalkulasi Kebutuhan Bahan Baku (Bill of Materials)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total bahan baku yang dibutuhkan dari kalkulasi resep porsi masak hari ini
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nama Bahan Baku</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Kebutuhan Masak</th>
                      <th className="py-3 px-4 text-right">Stok Gudang</th>
                      <th className="py-3 px-4 text-right">Selisih</th>
                      <th className="py-3 px-4 text-center">Status Ketersediaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailData.bom_requirements?.map((b) => (
                      <tr key={b.raw_material_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{b.name}</td>
                        <td className="py-3 px-4 text-slate-500">{b.category}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          {b.required_qty} {b.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {b.current_stock} {b.unit}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            b.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {b.difference > 0 ? `+${b.difference}` : b.difference} {b.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={`text-[10px] font-bold ${
                              b.status === 'sufficient'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : b.status === 'low_stock'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                          >
                            {b.status === 'sufficient'
                              ? 'Stok Cukup'
                              : b.status === 'low_stock'
                              ? 'Stok Menipis'
                              : 'Stok Habis'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 3: Orders List & 1-Click Thermal Print */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueOrders.map((ord) => (
                  <Card
                    key={ord.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">
                          NO. ORDER
                        </span>
                        <strong className="text-sm font-mono font-bold text-slate-900">
                          {ord.order_number}
                        </strong>
                      </div>
                      <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                        Siap Masak
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ord.customer?.name || 'Pelanggan'} ({ord.customer?.phone})</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setLabelOrderId(ord.id);
                        setIsLabelModalOpen(true);
                      }}
                      className="w-full gap-1.5 text-xs font-bold py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Label Kemasan (Thermal)
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Label Modal Dialog */}
      <KitchenLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => {
          setIsLabelModalOpen(false);
          setLabelOrderId(null);
        }}
        orderId={labelOrderId}
      />
    </div>
  );
};
