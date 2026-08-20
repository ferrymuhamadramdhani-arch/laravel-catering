import React, { useState } from 'react';
import apiClient from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  X,
  Calendar,
  MapPin,
  User,
  ShoppingBag,
  Package,
  UtensilsCrossed,
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  History,
  CreditCard,
  ArrowRight,
  FileText,
  Receipt,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { ModalPortal } from '../../components/ui/Modal';
import type { Order, OrderStatus } from '../../types/order';
import type { Invoice } from '../../types/finance';
import { InvoiceDetailModal } from '../finance/InvoiceDetailModal';
import { RecordPaymentModal } from '../finance/RecordPaymentModal';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
}

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Status Definitions with colors and labels
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<any> }
> = {
  draft: {
    label: 'Draft (Konsep)',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: FileText,
  },
  confirmed: {
    label: 'Terkonfirmasi',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: CheckCircle2,
  },
  in_production: {
    label: 'Sedang Dimasak (Dapur)',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: ChefHat,
  },
  ready: {
    label: 'Siap Dikirim (Packing QC)',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Package,
  },
  delivering: {
    label: 'Dalam Pengiriman (Kurir)',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Truck,
  },
  delivered: {
    label: 'Sampai di Lokasi',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: MapPin,
  },
  completed: {
    label: 'Selesai (Completed)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Dibatalkan',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: AlertTriangle,
  },
};

const LIFECYCLE_STEPS: OrderStatus[] = [
  'draft',
  'confirmed',
  'in_production',
  'ready',
  'delivering',
  'delivered',
  'completed',
];

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Invoice & Payment state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  if (!isOpen || !order) return null;

  const handleFetchOrGenerateInvoice = async () => {
    setIsLoadingInvoice(true);
    try {
      const res = await apiClient.get('/tenant/invoices', { params: { order_id: order.id } });
      if (res.data?.data && res.data.data.length > 0) {
        const inv = res.data.data[0];
        const fullRes = await apiClient.get(`/tenant/invoices/${inv.id}`);
        setSelectedInvoice(fullRes.data?.data || inv);
        setIsInvoiceDetailOpen(true);
      } else {
        const createRes = await apiClient.post('/tenant/invoices', {
          order_id: order.id,
          invoice_type: 'full',
        });
        toast.success(`Faktur Invoice baru berhasil diterbitkan untuk pesanan ${order.order_number}!`, 'Faktur Diterbitkan');
        setSelectedInvoice(createRes.data?.data);
        setIsInvoiceDetailOpen(true);
      }
    } catch (err: any) {
      console.error('Invoice error:', err);
      toast.error(err.response?.data?.message || 'Gagal memproses faktur invoice.');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const currentStatus = order.status;
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft;

  const handleAdvanceStatus = async (nextStatus: OrderStatus, customNotes?: string) => {
    setActionError(null);
    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/tenant/orders/${order.id}/status`, {
        status: nextStatus,
        notes: customNotes || statusNotes || undefined,
      });
      const nextLabel = STATUS_CONFIG[nextStatus]?.label || nextStatus;
      toast.success(`Status pesanan ${order.order_number} berhasil diubah ke '${nextLabel}'!`, 'Status Diperbarui');
      setStatusNotes('');
      setShowCancelModal(false);
      onStatusUpdated();
    } catch (err: any) {
      console.error('Update order status error:', err);
      setActionError(err.response?.data?.message || 'Gagal mengubah status pesanan.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Silakan tuliskan alasan pembatalan.');
      return;
    }
    await handleAdvanceStatus('cancelled', `Alasan Pembatalan: ${cancelReason.trim()}`);
  };

  const totalPortions = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const grossProfit = Number(order.subtotal_amount) - Number(order.total_hpp || 0);
  const marginPct =
    Number(order.subtotal_amount) > 0
      ? ((grossProfit / Number(order.subtotal_amount)) * 100).toFixed(1)
      : '0';

  const currentStepIdx = LIFECYCLE_STEPS.indexOf(currentStatus);

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-none">
                  {order.order_number}
                </h2>
                <Badge
                  variant="outline"
                  className={`${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} font-semibold text-xs`}
                >
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {order.event_name || order.event_type} • Dibuat oleh {order.creator?.name || 'Sales/CS'} pada {formatTimeAgo(order.created_at)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {actionError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Lifecycle Stepper (If not cancelled) */}
          {currentStatus !== 'cancelled' ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Alur Lifecycle Pesanan
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const stepConfig = STATUS_CONFIG[step];
                  const isDone = currentStepIdx >= idx;
                  const isCurrent = currentStepIdx === idx;

                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-amber-600 text-white ring-4 ring-amber-100 scale-110 shadow-sm'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isDone && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 line-clamp-1 font-medium ${
                          isCurrent
                            ? 'text-amber-800 font-bold'
                            : isDone
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {stepConfig.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <strong className="block">Pesanan Dibatalkan</strong>
                  <span className="text-xs text-red-600">
                    {order.cancellation_reason || 'Pesanan dibatalkan tanpa alasan tercatat'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAdvanceStatus('draft', 'Membuka kembali pesanan')}
                isLoading={isUpdatingStatus}
                className="text-xs"
              >
                Buka Kembali ke Draft
              </Button>
            </div>
          )}

          {/* Action Transition Bar */}
          {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 block">Langkah Operasional Berikutnya:</span>
                <span className="text-xs text-amber-700">
                  {currentStatus === 'draft' && 'Pesanan telah disepakati pelanggan? Konfirmasikan untuk penjadwalan.'}
                  {currentStatus === 'confirmed' && 'Kirim order ke dapur untuk memulai proses masak & persiapan bahan.'}
                  {currentStatus === 'in_production' && 'Masakan selesai dan siap dikemas (QC packing) untuk kurir.'}
                  {currentStatus === 'ready' && 'Serahkan pesanan ke kurir/tim pengiriman untuk diberangkatkan.'}
                  {currentStatus === 'delivering' && 'Kurir telah sampai dan menyerahkan pesanan kepada penerima.'}
                  {currentStatus === 'delivered' && 'Pelunasan dan seluruh proses selesai? Tandai Selesai.'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  disabled={isUpdatingStatus}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Batalkan Order
                </Button>

                {currentStatus === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvanceStatus('confirmed')}
                    isLoading={isUpdatingStatus}
                    className="text-xs gap-1"
                  >
                    ✓ Konfirmasi Pesanan <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                {currentStatus === 'confirmed' && (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {order.payment_status === 'unpaid' && Number(order.total_amount) > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleFetchOrGenerateInvoice}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Catat Pembayaran DP Dulu
                        </Button>
                        <Button
                          size="sm"
                          disabled
                          title="Pembayaran DP belum diterima"
                          className="text-xs gap-1 bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                        >
                          <ChefHat className="w-3.5 h-3.5" /> Mulai Produksi Dapur (Terkunci)
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus('in_production')}
                        isLoading={isUpdatingStatus}
                        className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      >
                        <ChefHat className="w-3.5 h-3.5" /> Mulai Produksi Dapur
                      </Button>
                    )}
                  </div>
                )}
                {currentStatus === 'in_production' && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvanceStatus('ready')}
                    isLoading={isUpdatingStatus}
                    className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Package className="w-3.5 h-3.5" /> Masakan Siap (Ready Packing)
                  </Button>
                )}
                {currentStatus === 'ready' && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvanceStatus('delivering')}
                    isLoading={isUpdatingStatus}
                    className="text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Truck className="w-3.5 h-3.5" /> Berangkatkan Pengiriman
                  </Button>
                )}
                {currentStatus === 'delivering' && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvanceStatus('delivered')}
                    isLoading={isUpdatingStatus}
                    className="text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Pesanan Sampai di Lokasi
                  </Button>
                )}
                {currentStatus === 'delivered' && (
                  <Button
                    size="sm"
                    onClick={() => handleAdvanceStatus('completed')}
                    isLoading={isUpdatingStatus}
                    className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selesaikan Pesanan
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Details 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer & Event Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" /> Informasi Pelanggan &amp; Pengiriman
              </h4>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pelanggan:</span>
                  <span className="font-bold text-slate-800">
                    {order.customer?.name} ({order.customer?.type === 'corporate' ? 'Korporat' : 'Individu'})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Jadwal Kirim:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    {formatDateIndo(order.delivery_date)} {order.delivery_time ? `@ ${order.delivery_time}` : ''}
                  </span>
                </div>

                {order.delivery_area && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Zona Area:</span>
                    <span className="font-medium text-slate-700">
                      {order.delivery_area.name} ({formatCurrency(order.delivery_fee)})
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">Penerima Lokasi:</span>
                  <span className="font-medium text-slate-700">
                    {order.recipient_name || order.customer?.name} {order.recipient_phone ? `(${order.recipient_phone})` : ''}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block mb-0.5">Alamat Pengiriman:</span>
                  <p className="text-slate-700 font-normal">
                    {order.delivery_address || order.customer?.address || '—'}
                  </p>
                </div>

                {order.notes && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 block mb-0.5">Catatan Pesanan:</span>
                    <p className="text-slate-700 italic">"{order.notes}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Ringkasan Biaya &amp; Pembayaran
              </h4>

              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5 text-xs shadow-md">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Menu ({totalPortions} porsi)</span>
                  <span className="font-semibold text-white">{formatCurrency(order.subtotal_amount)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Estimasi Modal HPP Bahan (BOM)</span>
                  <span className="font-medium text-amber-400">{formatCurrency(order.total_hpp || 0)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Estimasi Laba Kotor (Margin)</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(grossProfit)} ({marginPct}%)
                  </span>
                </div>

                {Number(order.delivery_fee) > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Ongkos Kirim</span>
                    <span>+{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}

                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Diskon</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-300">TOTAL PESANAN</span>
                  <span className="text-base font-extrabold text-amber-400">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400 pt-1">
                  <span>Uang Muka (DP) Diterima</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(order.down_payment_amount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status Pembayaran</span>
                    <Badge
                      variant={
                        order.payment_status === 'paid'
                          ? 'success'
                          : order.payment_status === 'partially_paid'
                          ? 'default'
                          : 'outline'
                      }
                      className="text-[10px] capitalize mt-0.5 font-bold"
                    >
                      {order.payment_status === 'paid'
                        ? 'Lunas'
                        : order.payment_status === 'partially_paid'
                        ? 'DP Diterima'
                        : 'Belum Bayar'}
                    </Badge>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Sisa Tagihan</span>
                    <span className="font-bold text-sm text-white">
                      {formatCurrency(
                        Math.max(0, Number(order.total_amount) - Number(order.down_payment_amount))
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchOrGenerateInvoice}
                    isLoading={isLoadingInvoice}
                    className="w-full gap-1.5 text-xs text-slate-100 hover:text-white border-slate-700 hover:bg-slate-800"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400" /> Lihat / Terbitkan Faktur Invoice
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" /> Rincian Menu Pesanan
            </h4>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Item Menu / Paket</th>
                    <th className="px-4 py-2.5">Tipe</th>
                    <th className="px-4 py-2.5 text-center">Jumlah</th>
                    <th className="px-4 py-2.5 text-right">Harga Satuan</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{item.item_name}</p>
                        {item.notes && (
                          <span className="text-[11px] text-amber-700 italic block mt-0.5">
                            Catatan: {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {item.item_type === 'menu_package' ? 'Paket Bundling' : 'Menu Satuan'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {item.quantity} <span className="font-normal text-slate-400">{item.portion_unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(item.subtotal_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-600" /> Riwayat Perubahan Status (Audit Trail)
            </h4>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              {order.status_histories && order.status_histories.length > 0 ? (
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200">
                  {order.status_histories.map((hist) => {
                    const cfg = STATUS_CONFIG[hist.to_status as OrderStatus] || STATUS_CONFIG.draft;
                    const HistIcon = cfg.icon;

                    return (
                      <div key={hist.id} className="relative group">
                        {/* Dot icon */}
                        <div
                          className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                        >
                          <HistIcon className="w-3 h-3" />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{cfg.label}</span>
                            {hist.user && (
                              <span className="text-[10px] text-slate-400">• oleh {hist.user.name}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{formatTimeAgo(hist.created_at)}</span>
                        </div>

                        {hist.notes && (
                          <p className="text-xs text-slate-600 mt-1 bg-white p-2 rounded-lg border border-slate-200/80 italic">
                            "{hist.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Belum ada riwayat audit trail.</p>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <ModalPortal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" /> Batalkan Pesanan Ini
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin membatalkan pesanan <strong>{order.order_number}</strong>? Harap sertakan alasan pembatalan.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Tuliskan alasan pembatalan (mis: Pelanggan mengajukan reschedule / pembatalan acara)..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                disabled={isUpdatingStatus}
              >
                Kembali
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelOrder}
                isLoading={isUpdatingStatus}
              >
                Konfirmasi Pembatalan
              </Button>
            </div>
          </div>
        </ModalPortal>

        {/* Invoices Modals */}
        <InvoiceDetailModal
          isOpen={isInvoiceDetailOpen}
          onClose={() => setIsInvoiceDetailOpen(false)}
          invoice={selectedInvoice}
          onOpenRecordPayment={(inv) => {
            setIsInvoiceDetailOpen(false);
            setSelectedInvoice(inv);
            setIsPaymentModalOpen(true);
          }}
        />

        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          invoice={selectedInvoice}
          onSuccess={() => {
            onStatusUpdated();
            if (selectedInvoice) {
              apiClient.get(`/tenant/invoices/${selectedInvoice.id}`).then((res) => {
                if (res.data?.data) setSelectedInvoice(res.data.data);
              });
            }
          }}
        />

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Tutup Detail
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
};
