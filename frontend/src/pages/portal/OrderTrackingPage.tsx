import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../api/axios';
import { formatCurrency, formatDateIndo } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Search,
  Truck,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Check,
} from 'lucide-react';
import type { Order } from '../../types/order';
import { OnlinePaymentModal } from '../../components/payment/OnlinePaymentModal';

export const OrderTrackingPage: React.FC = () => {
  const { slug, trackingCode } = useParams<{ slug?: string; trackingCode?: string }>();
  const currentSlug = slug || 'berkah-catering';

  const [searchInput, setSearchInput] = useState(trackingCode || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrackingData = useCallback(async (codeToTrack: string) => {
    if (!codeToTrack.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.get(`/public/orders/track/${encodeURIComponent(codeToTrack.trim())}`);
      if (res.data?.data) {
        setOrder(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to track order:', err);
      setOrder(null);
      setErrorMsg(
        err.response?.data?.message ||
          'Nomor resi tracking atau nomor pesanan tidak ditemukan. Silakan periksa kembali.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (trackingCode) {
      setSearchInput(trackingCode);
      fetchTrackingData(trackingCode);
    }
  }, [trackingCode, fetchTrackingData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingData(searchInput);
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'draft':
        return 0;
      case 'confirmed':
        return 1;
      case 'processing':
        return 2;
      case 'ready':
      case 'delivering':
        return 3;
      case 'completed':
        return 4;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  const steps = [
    { label: 'Pesanan Diterima', desc: 'Menunggu konfirmasi dapur' },
    { label: 'Terkonfirmasi', desc: 'Jadwal bahan & slot disiapkan' },
    { label: 'Sedang Dimasak', desc: 'Proses olahan dapur & QC' },
    { label: 'Pengiriman Kurir', desc: 'Dalam perjalanan ke lokasi' },
    { label: 'Tiba & Selesai', desc: 'Pesanan telah diterima' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Search Bar */}
      <div className="space-y-4">
        <Link
          to={`/p/${currentSlug}`}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Katalog Menu
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Pelacakan Status Pesanan
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Pantau perkembangan pengerjaan dapur dan posisi pengiriman armada katering secara real-time
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Masukkan kode tracking (mis: TRK-202608-0001)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-mono uppercase rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition shadow-2xs"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg shadow-2xs"
          >
            {isLoading ? 'Melacak...' : 'Lacak'}
          </Button>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Order Status Display Card */}
      {order && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tracking Header Card */}
          <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                  Kode Resi Tracking
                </span>
                <strong className="text-xl font-mono font-bold text-stone-900">
                  {order.tracking_code || order.order_number}
                </strong>
                <span className="text-xs text-stone-500 block mt-0.5">
                  No. Pesanan: <span className="font-mono text-stone-700">{order.order_number}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs px-3 py-1 font-semibold capitalize ${
                    order.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : order.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-stone-900 text-white border-stone-900'
                  }`}
                >
                  Status: {order.status}
                </Badge>
              </div>
            </div>

            {/* Visual Stepper */}
            {order.status !== 'cancelled' ? (
              <div className="py-4">
                <div className="grid grid-cols-5 gap-2 relative">
                  {/* Step Connecting Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-stone-200 -z-0" />

                  {steps.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div key={idx} className="flex flex-col items-center text-center space-y-2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            isDone
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-white border-2 border-stone-300 text-stone-400'
                          } ${isCurrent ? 'ring-4 ring-stone-900/20' : ''}`}
                        >
                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                        </div>

                        <div>
                          <span
                            className={`text-xs font-semibold block leading-tight ${
                              isDone ? 'text-stone-900' : 'text-stone-400'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="text-[10px] text-stone-400 hidden sm:block mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                Pesanan ini telah dibatalkan. Silakan hubungi layanan katering untuk informasi lebih lanjut.
              </div>
            )}
          </Card>

          {/* Delivery & Schedule Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Calendar className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Jadwal Pengiriman
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Tanggal Acara:</span>
                  <span className="font-semibold text-stone-900 font-serif">
                    {formatDateIndo(order.delivery_date)} (pk {order.delivery_time || '11:30'})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Jenis Acara:</span>
                  <span className="font-semibold text-stone-800">{order.event_type} — {order.event_name || 'Acara'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <MapPin className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Tujuan &amp; Penerima
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Penerima di Lokasi:</span>
                  <span className="font-semibold text-stone-900">
                    {order.recipient_name || order.customer?.name} ({order.recipient_phone || order.customer?.phone})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Alamat Pengantaran:</span>
                  <span className="text-stone-700 leading-relaxed block">{order.delivery_address}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Courier Details if assigned */}
          {(order as any).delivery && (
            <Card className="p-6 bg-stone-900 text-white rounded-xl space-y-3 border border-stone-800">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                  Armada &amp; Kurir Pengantar
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Nama Kurir:</span>
                  <span className="font-bold text-white">
                    {(order as any).delivery.courier_name || 'Driver Operasional'}{' '}
                    {(order as any).delivery.vehicle_plate_number ? `(${(order as any).delivery.vehicle_plate_number})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Kontak Kurir:</span>
                  <span className="font-semibold text-white">
                    {(order as any).delivery.courier_phone || '—'}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Order Items & Tagihan Summary */}
          <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Rincian Pesanan Menu ({order.items?.length || 0} Item)
              </h3>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {order.items?.map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <strong className="text-stone-900 block">{it.item_name}</strong>
                    <span className="text-[11px] text-stone-400">
                      {it.quantity} {it.portion_unit} × {formatCurrency(Number(it.unit_price))}
                    </span>
                    {it.notes && (
                      <span className="text-[10px] text-stone-500 italic block mt-0.5">
                        Catatan: "{it.notes}"
                      </span>
                    )}
                  </div>
                  <strong className="text-stone-900 font-mono font-bold">
                    {formatCurrency(Number(it.subtotal_price))}
                  </strong>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Total Tagihan:</span>
                <strong className="text-base font-mono font-bold text-stone-950">
                  {formatCurrency(Number(order.total_amount))}
                </strong>
                <span className="text-[11px] text-stone-500 mt-0.5 block">
                  Status Pembayaran: <strong className="text-stone-800">{order.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'}</strong>
                </span>
              </div>

              {order.payment_status !== 'paid' && (
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="gap-2 text-xs font-semibold py-2.5 px-5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg shadow-2xs"
                >
                  Bayar Tagihan Online (QRIS / VA)
                </Button>
              )}
            </div>
          </Card>

          {/* Online Payment Modal */}
          <OnlinePaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            orderNumber={order.order_number}
            orderAmount={Number(order.total_amount)}
            onPaymentSuccess={() => {
              fetchTrackingData(order.tracking_code || order.order_number);
            }}
          />
        </div>
      )}
    </div>
  );
};
