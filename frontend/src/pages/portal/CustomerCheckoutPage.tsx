import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { useCartStore } from '../../stores/cartStore';
import { formatCurrency, formatDateIndo } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Truck,
  User,
  Copy,
  Check,
  ShoppingBag,
} from 'lucide-react';
import type { PublicCatalogData, PublicCheckoutResponse } from '../../types/portal';
import { OnlinePaymentModal } from '../../components/payment/OnlinePaymentModal';

export const CustomerCheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const currentSlug = slug || 'berkah-catering';
  const navigate = useNavigate();

  const { items, clearCart, getTotalPortions, getSubtotal } = useCartStore();
  const [catalog, setCatalog] = useState<PublicCatalogData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType] = useState('Nasi Kotak');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('11:30');
  const [deliveryAreaId, setDeliveryAreaId] = useState<number | undefined>(undefined);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Checkout Success State
  const [successData, setSuccessData] = useState<PublicCheckoutResponse | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await apiClient.get(`/public/tenant/${currentSlug}/catalog`);
        if (res.data?.data) {
          setCatalog(res.data.data);
          if (res.data.data.delivery_areas?.length > 0) {
            setDeliveryAreaId(res.data.data.delivery_areas[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    };
    fetchCatalog();
  }, [currentSlug]);

  const selectedArea = catalog?.delivery_areas.find((a) => a.id === deliveryAreaId);
  const deliveryFee = Number(selectedArea?.delivery_fee || 0);
  const subtotal = getSubtotal();
  const totalAmount = subtotal + deliveryFee;
  const totalPortions = getTotalPortions();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Keranjang pesanan masih kosong.');
      return;
    }

    if (!customerName || !customerPhone || !deliveryDate || !deliveryAddress) {
      setErrorMsg('Mohon lengkapi seluruh data pemesanan yang bertanda bintang (*).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || undefined,
        event_name: eventName || undefined,
        event_type: eventType,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivery_area_id: deliveryAreaId,
        delivery_address: deliveryAddress,
        recipient_name: recipientName || customerName,
        recipient_phone: recipientPhone || customerPhone,
        notes: notes || undefined,
        items: items.map((it) => ({
          item_type: it.item_type,
          item_id: it.item_id,
          quantity: it.quantity,
          unit_price: it.price,
          portion_unit: it.portion_unit,
          notes: it.notes,
        })),
      };

      const res = await apiClient.post(`/public/tenant/${currentSlug}/checkout`, payload);

      if (res.data?.data) {
        setSuccessData(res.data.data);
        clearCart();
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg(
        err.response?.data?.message || 'Gagal memproses pesanan. Silakan periksa kembali data Anda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Success Screen after Checkout
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-8 text-center space-y-6 bg-white shadow-sm border border-stone-200 rounded-2xl">
          <div className="w-12 h-12 bg-stone-900 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500 block">
              Konfirmasi Pemesanan
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900">
              Pesanan Anda Telah Terjadwal
            </h1>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Terima kasih, data pemesanan telah masuk ke sistem operasional kami untuk segera dipersiapkan.
            </p>
          </div>

          {/* Tracking Code Highlight Box */}
          <div className="p-5 rounded-xl bg-stone-50 border border-stone-200 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Kode Pelacakan Pesanan (Resi):
              </span>
              <span className="font-mono text-xs text-stone-600">
                {successData.order.order_number}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
              <strong className="text-lg font-mono font-bold text-stone-900 tracking-wider">
                {successData.tracking_code}
              </strong>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyCode(successData.tracking_code)}
                className="gap-1.5 text-xs py-1 px-3 h-auto"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" /> Salin Resi
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-stone-500">
              Simpan kode pelacakan ini untuk memantau tahapan dapur dan armada pengiriman kurir.
            </p>
          </div>

          {/* Invoice & Total Summary */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center text-stone-600">
              <span>Total Tagihan:</span>
              <strong className="text-sm font-mono font-bold text-stone-900">
                {formatCurrency(Number(successData.order.total_amount))}
              </strong>
            </div>
            <div className="flex justify-between items-center text-stone-600">
              <span>Jadwal Pengantaran:</span>
              <span className="font-semibold text-stone-800">
                {formatDateIndo(successData.order.delivery_date)} pk {successData.order.delivery_time}
              </span>
            </div>
          </div>

          {/* Bank Transfer Information */}
          {successData.bank_accounts && successData.bank_accounts.length > 0 && (
            <div className="text-left space-y-2.5 pt-2">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                Rekening Pembayaran Katering:
              </span>
              <div className="space-y-2">
                {successData.bank_accounts.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="font-bold text-stone-900 block">{b.bank_name}</strong>
                      <span className="text-[11px] text-stone-500">a.n. {b.account_name}</span>
                    </div>
                    <strong className="font-mono font-bold text-stone-900 text-sm">
                      {b.account_number}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full sm:w-auto gap-2 px-6 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition"
            >
              Bayar Online (QRIS / VA)
            </Button>

            <Link
              to={`/p/${currentSlug}/track/${successData.tracking_code}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold transition"
            >
              Lacak Pesanan Saya <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Online Payment Modal */}
        <OnlinePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderNumber={successData.order.order_number}
          orderAmount={Number(successData.order.total_amount)}
          onPaymentSuccess={() => {
            navigate(`/p/${currentSlug}/track/${successData.tracking_code}`);
          }}
        />
      </div>
    );
  }

  // If Cart is Empty
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif font-bold text-stone-900">Keranjang Masih Kosong</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          Silakan pilih paket menu atau hidangan katering favorit Anda dari katalog untuk melakukan pemesanan.
        </p>
        <Link
          to={`/p/${currentSlug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-white text-xs font-bold shadow-xs hover:bg-stone-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Katalog Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <Link
          to={`/p/${currentSlug}`}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali Memilih Menu
        </Link>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          Formulir Pemesanan Katering
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Lengkapi data pengiriman dan detail acara untuk reservasi jadwal dapur katering
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Customer Info */}
          <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <User className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900 font-serif">1. Informasi Pemesan</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Nama Lengkap / Instansi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Nusantara Jaya / Ibu Siti"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-stone-700 block">Email (Opsional untuk Faktur Invoice)</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Event & Delivery Details */}
          <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Truck className="w-4 h-4 text-stone-700" />
              <h2 className="text-sm font-bold text-stone-900 font-serif">2. Jadwal &amp; Lokasi Pengiriman</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Tanggal Pengiriman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Waktu Tiba di Lokasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Nama / Jenis Acara</label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat Dewan Direksi / Syukuran"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Zona Wilayah Pengiriman</label>
                <select
                  value={deliveryAreaId}
                  onChange={(e) => setDeliveryAreaId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition bg-white"
                >
                  {catalog?.delivery_areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.city}) — Ongkir: {formatCurrency(Number(area.delivery_fee))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Alamat Lengkap Pengantaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Nama gedung, lantai/ruangan, nomor jalan, dan patokan..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Nama Penerima di Lokasi</label>
                <input
                  type="text"
                  placeholder="Sama dengan pemesan jika kosong"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">No. HP Penerima di Lokasi</label>
                <input
                  type="tel"
                  placeholder="Sama dengan pemesan jika kosong"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-stone-700 block">Catatan Khusus Operasional (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Instruksi khusus untuk dapur atau kurir..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 transition"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary & Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white border border-stone-200 rounded-xl space-y-4 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-sm font-bold text-stone-900 font-serif">Ringkasan Pesanan</h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                {totalPortions} Porsi
              </Badge>
            </div>

            {/* Itemized list */}
            <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto pr-1 text-xs">
              {items.map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <strong className="text-stone-900 block">{it.name}</strong>
                    <span className="text-[11px] text-stone-400">
                      {it.quantity} {it.portion_unit} × {formatCurrency(it.price)}
                    </span>
                    {it.notes && (
                      <span className="text-[10px] text-stone-500 italic block mt-0.5">
                        "{it.notes}"
                      </span>
                    )}
                  </div>
                  <strong className="text-stone-900 font-mono font-bold">
                    {formatCurrency(it.price * it.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Subtotals & Delivery Fee */}
            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal Menu:</span>
                <span className="font-mono font-semibold text-stone-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Ongkos Kirim ({selectedArea?.name || 'Area'}):</span>
                <span className="font-mono font-semibold text-stone-800">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-bold text-stone-900">
                <span className="font-serif">Total Pembayaran:</span>
                <strong className="font-mono text-base font-black text-stone-950">
                  {formatCurrency(totalAmount)}
                </strong>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg shadow-sm gap-2 mt-2"
            >
              {isSubmitting ? 'Memproses Pesanan...' : 'Konfirmasi & Kirim Pesanan'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
};
