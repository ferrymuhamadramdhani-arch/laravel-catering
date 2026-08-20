import React, { useState, useEffect } from 'react';
import { Outlet, Link, useParams, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { formatCurrency } from '../lib/utils';
import apiClient from '../api/axios';
import {
  ShoppingBag,
  Search,
  X,
  ArrowRight,
  Trash2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const CustomerPortalLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentSlug = slug || 'berkah-catering';

  const {
    items,
    tenantProfile,
    setTenantProfile,
    getTotalPortions,
    getSubtotal,
    removeItem,
    updateQuantity,
  } = useCartStore();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [trackCodeInput, setTrackCodeInput] = useState('');
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  useEffect(() => {
    if (!tenantProfile || tenantProfile.slug !== currentSlug) {
      apiClient
        .get(`/public/tenant/${currentSlug}/catalog`)
        .then((res) => {
          if (res.data?.data?.tenant) {
            setTenantProfile(res.data.data.tenant);
          }
        })
        .catch((err) => {
          console.error('Failed to load tenant info:', err);
        });
    }
  }, [currentSlug, tenantProfile, setTenantProfile]);

  const totalPortions = getTotalPortions();
  const subtotal = getSubtotal();

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackCodeInput.trim()) {
      setIsTrackModalOpen(false);
      navigate(`/p/${currentSlug}/track/${trackCodeInput.trim()}`);
      setTrackCodeInput('');
    }
  };

  const cleanPhone = tenantProfile?.phone?.replace(/[^0-9]/g, '') || '';
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=Halo%20${encodeURIComponent(
        tenantProfile?.name || 'Katering'
      )},%20saya%20ingin%20bertanya%20seputar%20paket%20menu%20katering.`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Portal Brand */}
          <Link to={`/p/${currentSlug}`} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
                Catering Portal
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                Pemesanan Online
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Lacak Pesanan</span>
            </button>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Konsultasi WA</span>
              </a>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Keranjang</span>
              {totalPortions > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black leading-none">
                  {totalPortions}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Keranjang Belanja</h2>
                    <span className="text-[11px] text-slate-500">{totalPortions} porsi dipilih</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {items.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 space-y-3">
                    <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">Keranjang masih kosong</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Pilih menu katering favorit Anda dari katalog untuk memulai pemesanan.
                    </p>
                  </div>
                ) : (
                  items.map((it) => (
                    <div
                      key={it.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block">{it.name}</strong>
                          <span className="text-[11px] font-mono text-slate-500">
                            {formatCurrency(it.price)} / {it.portion_unit}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(it.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {it.notes && (
                        <p className="text-[10px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{it.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(it.id, it.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 w-8 text-center">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(it.id, it.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-slate-400 ml-1">{it.portion_unit}</span>
                        </div>

                        <strong className="text-xs font-black text-slate-900 font-mono">
                          {formatCurrency(it.price * it.quantity)}
                        </strong>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              {items.length > 0 && (
                <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Subtotal ({totalPortions} porsi):</span>
                    <strong className="text-base font-black text-slate-900 font-mono">
                      {formatCurrency(subtotal)}
                    </strong>
                  </div>

                  <Button
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate(`/p/${currentSlug}/checkout`);
                    }}
                    className="w-full gap-2 text-xs py-3 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
                  >
                    Lanjut ke Formulir Checkout <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track Modal */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Lacak Status Pesanan</h3>
              </div>
              <button
                onClick={() => setIsTrackModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Masukkan nomor resi tracking (mis: <strong>TRK-202608-0001</strong>) atau nomor order Anda:
            </p>

            <form onSubmit={handleTrackSubmit} className="space-y-3">
              <input
                type="text"
                value={trackCodeInput}
                onChange={(e) => setTrackCodeInput(e.target.value)}
                placeholder="Contoh: TRK-202608-0001"
                required
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTrackModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" className="gap-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <Search className="w-3.5 h-3.5" /> Lacak Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <span className="text-base font-black text-slate-900 block">
              {tenantProfile?.name || currentSlug.replace('-', ' ')}
            </span>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              {tenantProfile?.description ||
                'Layanan katering prasmanan premium, nasi kotak rapat instansi & korporat, aqiqah, dan resepsi keluarga.'}
            </p>
            {tenantProfile?.address && (
              <p className="text-slate-500 text-xs flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{tenantProfile.address}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              Kontak Layanan
            </span>
            <ul className="space-y-1.5 text-slate-500">
              {tenantProfile?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tenantProfile.phone}</span>
                </li>
              )}
              {tenantProfile?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tenantProfile.email}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              Jaminan Pelayanan
            </span>
            <ul className="space-y-1.5 text-slate-500">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Bahan Baku Segar &amp; Halal
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Pengantaran Tepat Waktu
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 mt-8 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>&copy; {new Date().getFullYear()} {tenantProfile?.name || 'CaterOS Portal'}. Hak Cipta Dilindungi.</span>
          <span>Enterprise Catering Platform</span>
        </div>
      </footer>
    </div>
  );
};
